-- ===========================================
-- PART 1: Add columns to website_popups for signup voucher
-- ===========================================
ALTER TABLE website_popups 
ADD COLUMN IF NOT EXISTS signup_voucher_code TEXT,
ADD COLUMN IF NOT EXISTS signup_voucher_description TEXT DEFAULT 'One-time use welcome discount for new accounts';

-- ===========================================
-- PART 2: Create function to record voucher usage ONLY when order is placed
-- ===========================================
CREATE OR REPLACE FUNCTION public.record_voucher_usage(
  p_voucher_id UUID,
  p_customer_id UUID,
  p_order_id UUID,
  p_discount_applied NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Increment voucher global usage count
  UPDATE vouchers 
  SET usage_count = COALESCE(usage_count, 0) + 1,
      used_at = NOW()
  WHERE id = p_voucher_id;
  
  -- Record customer usage WITH order_id link
  INSERT INTO voucher_usage (voucher_id, customer_id, order_id, discount_applied, used_at)
  VALUES (p_voucher_id, p_customer_id, p_order_id, p_discount_applied, NOW());
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error recording voucher usage: %', SQLERRM;
  RETURN FALSE;
END;
$function$;

-- ===========================================
-- PART 3: Create trigger to reverse voucher usage on order cancellation
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_order_cancellation_voucher()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only act when status changes TO cancelled/rejected FROM another status
  IF NEW.status IN ('cancelled', 'rejected') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'rejected'))
     AND NEW.voucher_id IS NOT NULL THEN
    
    -- Decrement voucher usage count (don't go below 0)
    UPDATE vouchers 
    SET usage_count = GREATEST(COALESCE(usage_count, 1) - 1, 0)
    WHERE id = NEW.voucher_id;
    
    -- Delete the usage record for this specific order
    DELETE FROM voucher_usage 
    WHERE order_id = NEW.id;
    
    RAISE NOTICE 'Voucher usage reversed for cancelled order %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trg_order_cancellation_voucher ON orders;
CREATE TRIGGER trg_order_cancellation_voucher
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION handle_order_cancellation_voucher();

-- ===========================================
-- PART 4: Update apply_voucher to NOT record usage (validate only)
-- ===========================================
CREATE OR REPLACE FUNCTION public.apply_voucher(
  voucher_code_param text, 
  customer_id_param uuid, 
  order_amount numeric, 
  country_code_param character varying DEFAULT 'qa'
)
RETURNS TABLE(success boolean, discount_amount numeric, final_amount numeric, message text, voucher_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  validation_result record;
  calculated_discount numeric := 0;
  v_voucher_id uuid;
BEGIN
  -- Validate first
  SELECT * INTO validation_result
  FROM validate_voucher(voucher_code_param, customer_id_param, order_amount, country_code_param);
  
  IF NOT validation_result.is_valid THEN
    RETURN QUERY SELECT 
      false, 
      0::numeric, 
      order_amount, 
      validation_result.error_message, 
      null::uuid;
    RETURN;
  END IF;
  
  -- Get voucher ID
  SELECT v.id INTO v_voucher_id 
  FROM vouchers v
  WHERE v.voucher_code = UPPER(voucher_code_param) 
    AND v.country_id = country_code_param;
  
  -- Calculate discount
  IF validation_result.discount_percentage > 0 THEN
    calculated_discount := ROUND((order_amount * validation_result.discount_percentage / 100), 2);
  ELSE
    calculated_discount := COALESCE(validation_result.discount_amount, 0);
  END IF;
  
  calculated_discount := LEAST(calculated_discount, order_amount);
  
  -- ⚠️ REMOVED: No longer inserting into voucher_usage here!
  -- Usage is recorded ONLY when order is placed via record_voucher_usage()
  
  RETURN QUERY SELECT 
    true, 
    calculated_discount, 
    (order_amount - calculated_discount), 
    'Voucher validated successfully'::text,
    v_voucher_id;
END;
$function$;