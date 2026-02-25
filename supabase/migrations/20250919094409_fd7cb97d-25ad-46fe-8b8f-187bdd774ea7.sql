-- Add automatic loyalty points trigger for completed orders
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award INTEGER;
BEGIN
  -- Only award points when order status changes to 'completed'
  IF NEW.status = 'completed'::order_status AND (OLD.status IS NULL OR OLD.status != 'completed'::order_status) THEN
    -- Calculate points: 1 QAR = 1 point
    points_to_award := FLOOR(NEW.total_amount);
    
    -- Update customer loyalty points
    UPDATE "Customers" 
    SET loyalty_points = loyalty_points + points_to_award
    WHERE id = NEW.customer_id;
    
    -- Record the transaction
    INSERT INTO loyalty_transactions (
      customer_id,
      order_id,
      points,
      transaction_type,
      description
    ) VALUES (
      NEW.customer_id,
      NEW.id,
      points_to_award,
      'earned',
      'Points earned from order ' || NEW.order_number
    );
    
    -- Log WhatsApp notification for loyalty points update
    INSERT INTO whatsapp_logs (
      customer_id,
      phone_number,
      message_type,
      message_content,
      status
    ) SELECT 
      NEW.customer_id,
      c.whatsapp_number,
      'loyalty_update',
      'Congratulations! You earned ' || points_to_award || ' loyalty points from your recent order. Total points: ' || (c.loyalty_points + points_to_award),
      'pending'
    FROM "Customers" c 
    WHERE c.id = NEW.customer_id AND c.whatsapp_number IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic loyalty points
DROP TRIGGER IF EXISTS award_loyalty_points_trigger ON orders;
CREATE TRIGGER award_loyalty_points_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION award_loyalty_points();

-- Function to apply voucher to order
CREATE OR REPLACE FUNCTION public.apply_voucher(
  voucher_code_param text,
  customer_id_param uuid,
  order_amount numeric
) RETURNS TABLE(
  success boolean,
  discount_amount numeric,
  final_amount numeric,
  message text
) AS $$
DECLARE
  voucher_validation record;
  calculated_discount numeric := 0;
BEGIN
  -- Validate the voucher first
  SELECT * INTO voucher_validation
  FROM validate_voucher(voucher_code_param, customer_id_param, order_amount);
  
  IF NOT voucher_validation.is_valid THEN
    RETURN QUERY SELECT false, 0::numeric, order_amount, voucher_validation.error_message;
    RETURN;
  END IF;
  
  -- Calculate discount
  IF voucher_validation.discount_percentage > 0 THEN
    calculated_discount := ROUND((order_amount * voucher_validation.discount_percentage / 100), 2);
  ELSE
    calculated_discount := voucher_validation.discount_amount;
  END IF;
  
  -- Ensure discount doesn't exceed order amount
  calculated_discount := LEAST(calculated_discount, order_amount);
  
  -- Update voucher usage
  UPDATE vouchers 
  SET usage_count = usage_count + 1,
      used_at = NOW()
  WHERE voucher_code = voucher_code_param;
  
  RETURN QUERY SELECT 
    true, 
    calculated_discount, 
    (order_amount - calculated_discount), 
    'Voucher applied successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create birthday vouchers automatically
CREATE OR REPLACE FUNCTION public.create_birthday_vouchers()
RETURNS integer AS $$
DECLARE
  birthday_customer record;
  voucher_count integer := 0;
  new_voucher_code text;
BEGIN
  -- Loop through customers with birthdays this month who don't already have a birthday voucher this year
  FOR birthday_customer IN 
    SELECT c.id, c.first_name, c.whatsapp_number
    FROM "Customers" c
    WHERE EXTRACT(MONTH FROM c.birthdate) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND c.birthdate IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM vouchers v 
        WHERE v.customer_id = c.id 
          AND v.voucher_type = 'birthday' 
          AND EXTRACT(YEAR FROM v.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      )
  LOOP
    -- Generate unique voucher code
    new_voucher_code := generate_voucher_code();
    
    -- Create birthday voucher (15% discount)
    INSERT INTO vouchers (
      voucher_code,
      customer_id,
      voucher_type,
      discount_percentage,
      valid_from,
      valid_until,
      max_usage
    ) VALUES (
      new_voucher_code,
      birthday_customer.id,
      'birthday',
      15,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      1
    );
    
    -- Log WhatsApp notification for birthday voucher
    IF birthday_customer.whatsapp_number IS NOT NULL THEN
      INSERT INTO whatsapp_logs (
        customer_id,
        phone_number,
        message_type,
        message_content,
        status
      ) VALUES (
        birthday_customer.id,
        birthday_customer.whatsapp_number,
        'birthday_voucher',
        'Happy Birthday ' || COALESCE(birthday_customer.first_name, 'Dear Customer') || '! 🎉 Enjoy 15% off your next order with code: ' || new_voucher_code || '. Valid for 30 days.',
        'pending'
      );
    END IF;
    
    voucher_count := voucher_count + 1;
  END LOOP;
  
  RETURN voucher_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;