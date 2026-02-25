-- Add expiration tracking to loyalty_transactions
ALTER TABLE loyalty_transactions 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_expired boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_redeemed boolean DEFAULT false;

-- Update existing transactions to have expiration dates (12 months from creation)
UPDATE loyalty_transactions 
SET expires_at = created_at + INTERVAL '12 months'
WHERE expires_at IS NULL AND transaction_type = 'earned';

-- Function to get available BakePoints for a customer (non-expired, non-redeemed)
CREATE OR REPLACE FUNCTION get_available_bakepoints(
  p_customer_id UUID,
  p_country_id VARCHAR DEFAULT 'qa'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_points INTEGER;
BEGIN
  -- Only calculate for QA customers
  IF p_country_id != 'qa' THEN
    RETURN 0;
  END IF;
  
  -- Sum up all non-expired, non-redeemed points
  SELECT COALESCE(SUM(points), 0)::INTEGER
  INTO available_points
  FROM loyalty_transactions
  WHERE customer_id = p_customer_id
    AND country_id = p_country_id
    AND (is_expired = false OR is_expired IS NULL)
    AND (is_redeemed = false OR is_redeemed IS NULL)
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN available_points;
END;
$$;

-- Function to redeem BakePoints (50 points = 1 QAR)
CREATE OR REPLACE FUNCTION redeem_bakepoints(
  p_customer_id UUID,
  p_points_to_redeem INTEGER,
  p_order_id UUID DEFAULT NULL,
  p_country_id VARCHAR DEFAULT 'qa'
)
RETURNS TABLE(
  success BOOLEAN,
  discount_amount NUMERIC,
  new_balance INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  calculated_discount NUMERIC;
BEGIN
  -- Only allow redemption for QA customers
  IF p_country_id != 'qa' THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 0, 'BakePoints redemption only available for Qatar customers'::TEXT;
    RETURN;
  END IF;
  
  -- Check minimum redemption (50 points)
  IF p_points_to_redeem < 50 THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 0, 'Minimum redemption is 50 BakePoints'::TEXT;
    RETURN;
  END IF;
  
  -- Check if points are in multiples of 50
  IF p_points_to_redeem % 50 != 0 THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 0, 'BakePoints must be redeemed in multiples of 50'::TEXT;
    RETURN;
  END IF;
  
  -- Get current available balance
  current_balance := get_available_bakepoints(p_customer_id, p_country_id);
  
  -- Check sufficient balance
  IF current_balance < p_points_to_redeem THEN
    RETURN QUERY SELECT 
      false, 
      0::NUMERIC, 
      current_balance, 
      'Insufficient BakePoints balance'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate discount (50 points = 1 QAR)
  calculated_discount := (p_points_to_redeem::NUMERIC / 50);
  
  -- Create redemption transaction (negative points)
  INSERT INTO loyalty_transactions (
    customer_id,
    order_id,
    points,
    transaction_type,
    description,
    country_id,
    is_redeemed
  ) VALUES (
    p_customer_id,
    p_order_id,
    -p_points_to_redeem,
    'redeem',
    'Redeemed ' || p_points_to_redeem || ' BakePoints for ' || calculated_discount || ' QAR discount',
    p_country_id,
    true
  );
  
  -- Update customer loyalty points
  UPDATE "Customers"
  SET loyalty_points = loyalty_points - p_points_to_redeem
  WHERE id = p_customer_id;
  
  -- Return success
  RETURN QUERY SELECT 
    true,
    calculated_discount,
    (current_balance - p_points_to_redeem),
    'BakePoints redeemed successfully'::TEXT;
END;
$$;

-- Update award_loyalty_points trigger to set expiration dates
CREATE OR REPLACE FUNCTION award_loyalty_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  points_to_award INTEGER;
  delivery_fee_amount NUMERIC := 0;
BEGIN
  -- Only award points when order status changes to 'completed'
  IF NEW.status = 'completed'::order_status AND (OLD.status IS NULL OR OLD.status != 'completed'::order_status) THEN
    -- Delivery fee is 0 for Kuwait
    IF NEW.delivery_address_id IS NOT NULL THEN
      delivery_fee_amount := 0;
    END IF;
    
    -- Calculate points: (Order total - Delivery fee) * 1 = loyalty points
    -- 1 KWD/QAR = 1 point
    points_to_award := FLOOR((NEW.total_amount - delivery_fee_amount) * 1);
    
    -- Ensure non-negative points
    IF points_to_award < 0 THEN
      points_to_award := 0;
    END IF;
    
    -- Update customer loyalty points
    UPDATE "Customers" 
    SET loyalty_points = loyalty_points + points_to_award
    WHERE id = NEW.customer_id;
    
    -- Record the transaction with expiration date (12 months)
    INSERT INTO loyalty_transactions (
      customer_id,
      order_id,
      points,
      transaction_type,
      description,
      country_id,
      expires_at
    ) VALUES (
      NEW.customer_id,
      NEW.id,
      points_to_award,
      'earned',
      'Points earned from order ' || NEW.order_number || ' (Subtotal: ' || (NEW.total_amount - delivery_fee_amount)::TEXT || ' ' || 
      CASE WHEN NEW.country_id = 'qa' THEN 'QAR' ELSE 'KWD' END || ' × 1)',
      NEW.country_id,
      NOW() + INTERVAL '12 months'
    );
    
    -- Log WhatsApp notification
    INSERT INTO whatsapp_logs (
      customer_id,
      phone_number,
      message_type,
      message_content,
      status,
      country_id
    ) SELECT 
      NEW.customer_id,
      c.whatsapp_number,
      'loyalty_update',
      'Congratulations! You earned ' || points_to_award || 
      CASE WHEN NEW.country_id = 'qa' THEN ' BakePoints' ELSE ' loyalty points' END ||
      ' from your recent order. Valid for 12 months. Total points: ' || (c.loyalty_points + points_to_award),
      'pending',
      NEW.country_id
    FROM "Customers" c 
    WHERE c.id = NEW.customer_id AND c.whatsapp_number IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;