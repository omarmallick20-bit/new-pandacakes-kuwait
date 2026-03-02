CREATE OR REPLACE FUNCTION award_loyalty_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  points_to_award INTEGER;
  existing_transaction_count INTEGER;
  order_country_id VARCHAR;
  earning_description TEXT;
BEGIN
  -- Only award points when status changes TO 'completed'
  IF NEW.status = 'completed'::order_status AND 
     (OLD.status IS NULL OR OLD.status != 'completed'::order_status) AND
     NEW.platform_source IN ('website', 'in-house') AND
     NEW.customer_id IS NOT NULL THEN
    
    -- Idempotency check: skip if points already awarded for this order
    SELECT COUNT(*) INTO existing_transaction_count
    FROM loyalty_transactions
    WHERE order_id = NEW.id AND transaction_type = 'earned';
    
    IF existing_transaction_count > 0 THEN
      RETURN NEW;
    END IF;
    
    order_country_id := COALESCE(NEW.country_id, 'qa');
    
    -- Country-specific earning rates:
    -- Kuwait: 1 KWD = 10 BakePoints
    -- Qatar (and others): 1 QAR = 1 BakePoint
    IF order_country_id = 'kw' THEN
      points_to_award := FLOOR((NEW.total_amount - COALESCE(NEW.delivery_fee, 0)) * 10);
      earning_description := 'Earned ' || points_to_award || ' BakePoints (10 per KWD) from order: ' || NEW.order_number;
    ELSE
      points_to_award := FLOOR(NEW.total_amount - COALESCE(NEW.delivery_fee, 0));
      earning_description := 'Points earned from order: ' || NEW.order_number;
    END IF;
    
    IF points_to_award > 0 THEN
      UPDATE "Customers"
      SET loyalty_points = loyalty_points + points_to_award
      WHERE id = NEW.customer_id;
      
      INSERT INTO loyalty_transactions (
        customer_id, order_id, points, transaction_type, 
        description, country_id, expires_at
      ) VALUES (
        NEW.customer_id, NEW.id, points_to_award, 'earned',
        earning_description,
        order_country_id,
        NOW() + INTERVAL '12 months'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;