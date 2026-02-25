-- Update validate_voucher function to enforce country validation
CREATE OR REPLACE FUNCTION public.validate_voucher(voucher_code_param text, customer_id_param uuid, order_amount numeric, country_code_param character varying DEFAULT 'qa')
 RETURNS TABLE(is_valid boolean, discount_amount numeric, discount_percentage integer, error_message text, voucher_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  voucher_record record;
BEGIN
  SELECT * INTO voucher_record
  FROM vouchers 
  WHERE voucher_code = voucher_code_param
    AND country_id = country_code_param; -- Enforce country validation
  
  -- Check if voucher exists
  IF voucher_record IS NULL THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher code not found or not valid for this country', null::uuid;
    RETURN;
  END IF;
  
  -- Check if voucher is expired
  IF voucher_record.valid_until < CURRENT_DATE THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher has expired', null::uuid;
    RETURN;
  END IF;
  
  -- Check if voucher is not yet valid
  IF voucher_record.valid_from > CURRENT_DATE THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher is not yet valid', null::uuid;
    RETURN;
  END IF;
  
  -- Check usage limits
  IF voucher_record.usage_count >= voucher_record.max_usage THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher usage limit exceeded', null::uuid;
    RETURN;
  END IF;
  
  -- Check if customer has already used this voucher
  IF EXISTS (
    SELECT 1 FROM voucher_usage 
    WHERE voucher_id = voucher_record.id 
    AND customer_id = customer_id_param
  ) THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'You have already used this voucher', null::uuid;
    RETURN;
  END IF;
  
  -- Check customer eligibility (allow NULL customer_id for public vouchers)
  IF voucher_record.customer_id IS NOT NULL AND voucher_record.customer_id != customer_id_param THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher not valid for this customer', null::uuid;
    RETURN;
  END IF;
  
  -- Voucher is valid, return discount info
  RETURN QUERY SELECT 
    true, 
    voucher_record.discount_amount, 
    voucher_record.discount_percentage,
    'Voucher is valid'::text,
    voucher_record.id;
END;
$function$;

-- Update apply_voucher function to enforce country validation
CREATE OR REPLACE FUNCTION public.apply_voucher(voucher_code_param text, customer_id_param uuid, order_amount numeric, country_code_param character varying DEFAULT 'qa')
 RETURNS TABLE(success boolean, discount_amount numeric, final_amount numeric, message text, voucher_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  voucher_validation record;
  calculated_discount numeric := 0;
  voucher_rec record;
BEGIN
  -- Validate the voucher first with country check
  SELECT * INTO voucher_validation
  FROM validate_voucher(voucher_code_param, customer_id_param, order_amount, country_code_param);
  
  IF NOT voucher_validation.is_valid THEN
    RETURN QUERY SELECT false, 0::numeric, order_amount, voucher_validation.error_message, null::uuid;
    RETURN;
  END IF;
  
  -- Get voucher record with country validation
  SELECT * INTO voucher_rec 
  FROM vouchers 
  WHERE voucher_code = voucher_code_param 
    AND country_id = country_code_param;
  
  -- Calculate discount
  IF voucher_validation.discount_percentage > 0 THEN
    calculated_discount := ROUND((order_amount * voucher_validation.discount_percentage / 100), 2);
  ELSE
    calculated_discount := voucher_validation.discount_amount;
  END IF;
  
  -- Ensure discount doesn't exceed order amount
  calculated_discount := LEAST(calculated_discount, order_amount);
  
  -- Update voucher usage count
  UPDATE vouchers 
  SET usage_count = usage_count + 1,
      used_at = NOW()
  WHERE voucher_code = voucher_code_param
    AND country_id = country_code_param;
  
  -- Record voucher usage
  INSERT INTO voucher_usage (voucher_id, customer_id, discount_applied)
  VALUES (voucher_rec.id, customer_id_param, calculated_discount);
  
  RETURN QUERY SELECT 
    true, 
    calculated_discount, 
    (order_amount - calculated_discount), 
    'Voucher applied successfully'::text,
    voucher_rec.id;
END;
$function$;