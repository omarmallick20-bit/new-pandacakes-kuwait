-- Issue 1: Add 'new_visitor' to popup_signups customer_type constraint
ALTER TABLE popup_signups 
DROP CONSTRAINT IF EXISTS popup_signups_customer_type_check;

ALTER TABLE popup_signups 
ADD CONSTRAINT popup_signups_customer_type_check 
CHECK (customer_type = ANY (ARRAY['personal'::text, 'business'::text, 'new_visitor'::text]));

-- Issue 3: Drop and recreate validate_voucher with happy hour logic
DROP FUNCTION IF EXISTS public.validate_voucher(text, uuid, numeric, character varying);

CREATE OR REPLACE FUNCTION public.validate_voucher(
  voucher_code_param text, 
  customer_id_param uuid, 
  order_amount_param numeric, 
  country_code_param character varying DEFAULT 'qa'::character varying
)
RETURNS TABLE(is_valid boolean, discount_amount numeric, discount_percentage integer, error_message text, voucher_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  voucher_record record;
  customer_usage_count int;
  current_day_name text;
  current_time_val time;
BEGIN
  -- Find the voucher
  SELECT * INTO voucher_record
  FROM vouchers
  WHERE voucher_code = UPPER(voucher_code_param)
    AND country_id = country_code_param;

  -- Check if voucher exists
  IF voucher_record IS NULL THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Invalid voucher code'::text, null::uuid;
    RETURN;
  END IF;

  -- Check date validity
  IF voucher_record.valid_from > CURRENT_DATE THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'This voucher is not yet active'::text, null::uuid;
    RETURN;
  END IF;

  IF voucher_record.valid_until < CURRENT_DATE THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'This voucher has expired'::text, null::uuid;
    RETURN;
  END IF;

  -- NEW: Check happy hour restrictions (based on ORDER PLACEMENT time, not delivery)
  IF voucher_record.happy_hour_enabled = true THEN
    -- Get current day name (lowercase, trimmed) using Qatar timezone
    current_day_name := LOWER(TRIM(TO_CHAR(NOW() AT TIME ZONE 'Asia/Qatar', 'Day')));
    current_time_val := (NOW() AT TIME ZONE 'Asia/Qatar')::time;
    
    -- Check if current day is in happy_hour_days array
    IF voucher_record.happy_hour_days IS NOT NULL 
       AND array_length(voucher_record.happy_hour_days, 1) > 0
       AND NOT (current_day_name = ANY(voucher_record.happy_hour_days)) THEN
      RETURN QUERY SELECT 
        false, 
        0::numeric, 
        0, 
        format('This voucher is only valid on %s', array_to_string(voucher_record.happy_hour_days, ', '))::text,
        null::uuid;
      RETURN;
    END IF;
    
    -- Check if current time is within happy hour window
    IF voucher_record.happy_hour_start_time IS NOT NULL 
       AND voucher_record.happy_hour_end_time IS NOT NULL THEN
      IF current_time_val < voucher_record.happy_hour_start_time 
         OR current_time_val > voucher_record.happy_hour_end_time THEN
        RETURN QUERY SELECT 
          false, 
          0::numeric, 
          0, 
          format('This voucher is only valid between %s and %s', 
                 to_char(voucher_record.happy_hour_start_time, 'HH12:MI AM'), 
                 to_char(voucher_record.happy_hour_end_time, 'HH12:MI AM'))::text,
          null::uuid;
        RETURN;
      END IF;
    END IF;
  END IF;

  -- Check minimum order amount
  IF voucher_record.min_order_amount IS NOT NULL AND order_amount_param < voucher_record.min_order_amount THEN
    RETURN QUERY SELECT 
      false, 
      0::numeric, 
      0, 
      format('Minimum order amount is %s QAR', voucher_record.min_order_amount)::text, 
      null::uuid;
    RETURN;
  END IF;

  -- Check global usage limit
  IF voucher_record.max_usage IS NOT NULL AND voucher_record.usage_count >= voucher_record.max_usage THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'This voucher has reached its usage limit'::text, null::uuid;
    RETURN;
  END IF;

  -- Check per-customer usage limit
  IF customer_id_param IS NOT NULL THEN
    SELECT COUNT(*) INTO customer_usage_count
    FROM voucher_usage
    WHERE voucher_id = voucher_record.id
      AND customer_id = customer_id_param;

    IF voucher_record.max_uses_per_customer IS NOT NULL 
       AND customer_usage_count >= voucher_record.max_uses_per_customer THEN
      RETURN QUERY SELECT false, 0::numeric, 0, 'You have already used this voucher the maximum number of times'::text, null::uuid;
      RETURN;
    END IF;
  END IF;

  -- Voucher is valid - return discount info
  RETURN QUERY SELECT 
    true, 
    COALESCE(voucher_record.discount_amount, 0)::numeric, 
    COALESCE(voucher_record.discount_percentage, 0)::integer, 
    'Voucher is valid'::text,
    voucher_record.id;
END;
$function$;