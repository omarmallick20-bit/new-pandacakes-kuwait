-- Fix award_loyalty_points function to use 1 QAR = 1 BakePoint
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  points_to_award INTEGER;
BEGIN
  -- Only award points when order status changes to 'completed'
  IF NEW.status = 'completed'::order_status AND (OLD.status IS NULL OR OLD.status != 'completed'::order_status) THEN
    
    -- Calculate points: 1 QAR = 1 BakePoint (on final paid amount after all discounts)
    -- total_amount already has voucher and BakePoints discounts applied
    points_to_award := FLOOR(NEW.total_amount);
    
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
      'BakePoints earned from order ' || NEW.order_number || ' (' || NEW.total_amount::TEXT || ' QAR = ' || points_to_award || ' points)',
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
      'Congratulations! You earned ' || points_to_award || ' BakePoints from your recent order. Valid for 12 months. Total points: ' || (c.loyalty_points + points_to_award),
      'pending',
      NEW.country_id
    FROM "Customers" c 
    WHERE c.id = NEW.customer_id AND c.whatsapp_number IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;