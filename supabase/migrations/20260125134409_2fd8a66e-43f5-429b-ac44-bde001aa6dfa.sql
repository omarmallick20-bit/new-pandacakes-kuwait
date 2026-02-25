-- Fix validate_voucher to respect max_uses_per_customer
CREATE OR REPLACE FUNCTION public.validate_voucher(
  voucher_code_param text, 
  customer_id_param uuid, 
  order_amount numeric, 
  country_code_param character varying DEFAULT 'qa'
)
RETURNS TABLE(is_valid boolean, discount_amount numeric, discount_percentage integer, error_message text, voucher_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  voucher_record record;
  customer_usage_count int;
BEGIN
  SELECT * INTO voucher_record
  FROM vouchers 
  WHERE voucher_code = voucher_code_param
    AND country_id = country_code_param;
  
  IF voucher_record IS NULL THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher code not found or not valid for this country', null::uuid;
    RETURN;
  END IF;
  
  IF voucher_record.valid_until < CURRENT_DATE THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher has expired', null::uuid;
    RETURN;
  END IF;
  
  IF voucher_record.valid_from > CURRENT_DATE THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher is not yet valid', null::uuid;
    RETURN;
  END IF;
  
  IF voucher_record.usage_count >= voucher_record.max_usage THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher usage limit exceeded', null::uuid;
    RETURN;
  END IF;
  
  -- Count customer's usage of this voucher
  SELECT COUNT(*) INTO customer_usage_count
  FROM voucher_usage 
  WHERE voucher_usage.voucher_id = voucher_record.id 
  AND voucher_usage.customer_id = customer_id_param;
  
  -- Check against per-customer limit (default to 1 if NULL for backwards compatibility)
  IF customer_usage_count >= COALESCE(voucher_record.max_uses_per_customer, 1) THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'You have reached the maximum uses for this voucher', null::uuid;
    RETURN;
  END IF;
  
  IF voucher_record.customer_id IS NOT NULL AND voucher_record.customer_id != customer_id_param THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher not valid for this customer', null::uuid;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    true, 
    voucher_record.discount_amount, 
    voucher_record.discount_percentage,
    'Voucher is valid'::text,
    voucher_record.id;
END;
$function$;