-- Update loyalty points calculation: 1 KWD = 1 point, based on subtotal (excluding delivery fee)
-- Drop the existing function first
DROP FUNCTION IF EXISTS public.award_loyalty_points() CASCADE;

-- Recreate with updated logic
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
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
    -- Delivery fee is now 0 for Kuwait, but keeping logic for future flexibility
    -- Calculate delivery fee based on delivery address (0 if null or pickup)
    IF NEW.delivery_address_id IS NOT NULL THEN
      delivery_fee_amount := 0; -- Delivery fee is now 0.00 KWD
    END IF;
    
    -- Calculate points: (Order total - Delivery fee) * 1 = loyalty points
    -- 1 KWD = 1 point
    points_to_award := FLOOR((NEW.total_amount - delivery_fee_amount) * 1);
    
    -- Ensure non-negative points
    IF points_to_award < 0 THEN
      points_to_award := 0;
    END IF;
    
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
      description,
      country_id
    ) VALUES (
      NEW.customer_id,
      NEW.id,
      points_to_award,
      'earned',
      'Points earned from order ' || NEW.order_number || ' (Subtotal: ' || (NEW.total_amount - delivery_fee_amount)::TEXT || ' KWD × 1)',
      NEW.country_id
    );
    
    -- Log WhatsApp notification for loyalty points update
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
      'Congratulations! You earned ' || points_to_award || ' loyalty points from your recent order. Total points: ' || (c.loyalty_points + points_to_award),
      'pending',
      NEW.country_id
    FROM "Customers" c 
    WHERE c.id = NEW.customer_id AND c.whatsapp_number IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS award_loyalty_points_trigger ON orders;
CREATE TRIGGER award_loyalty_points_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION award_loyalty_points();