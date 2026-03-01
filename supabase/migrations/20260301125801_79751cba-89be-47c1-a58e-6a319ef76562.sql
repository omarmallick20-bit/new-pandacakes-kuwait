
-- Must drop first because return type is changing
DROP FUNCTION IF EXISTS public.validate_voucher(text, uuid, numeric, character varying);

CREATE OR REPLACE FUNCTION public.validate_voucher(
    voucher_code_param text,
    customer_id_param uuid,
    order_amount_param numeric,
    country_code_param character varying DEFAULT 'qa'::character varying
)
RETURNS TABLE(
    is_valid boolean,
    discount_amount numeric,
    discount_percentage numeric,
    error_message text,
    voucher_id uuid,
    applicable_products text[]
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    voucher_record RECORD;
    customer_usage_count INTEGER;
    current_time_qatar TIMESTAMPTZ;
    current_day_name TEXT;
    happy_hour_start TIME;
    happy_hour_end TIME;
    current_qatar_time TIME;
BEGIN
    is_valid := FALSE;
    discount_amount := 0;
    discount_percentage := 0;
    error_message := NULL;
    voucher_id := NULL;
    applicable_products := NULL;

    current_time_qatar := NOW() AT TIME ZONE 'Asia/Qatar';
    current_day_name := LOWER(TRIM(to_char(current_time_qatar, 'Day')));
    current_qatar_time := current_time_qatar::TIME;

    SELECT * INTO voucher_record
    FROM vouchers v
    WHERE UPPER(v.voucher_code) = UPPER(voucher_code_param)
      AND v.country_id = country_code_param;

    IF voucher_record IS NULL THEN
        error_message := 'Invalid voucher code';
        RETURN NEXT; RETURN;
    END IF;

    IF CURRENT_DATE < voucher_record.valid_from THEN
        error_message := 'Voucher is not yet active';
        RETURN NEXT; RETURN;
    END IF;

    IF CURRENT_DATE > voucher_record.valid_until THEN
        error_message := 'Voucher has expired';
        RETURN NEXT; RETURN;
    END IF;

    IF voucher_record.customer_id IS NOT NULL AND voucher_record.customer_id != customer_id_param THEN
        error_message := 'This voucher is not valid for your account';
        RETURN NEXT; RETURN;
    END IF;

    IF voucher_record.min_order_amount IS NOT NULL AND order_amount_param < voucher_record.min_order_amount THEN
        error_message := format('Minimum order amount of %s required', voucher_record.min_order_amount);
        RETURN NEXT; RETURN;
    END IF;

    IF voucher_record.max_usage IS NOT NULL AND voucher_record.usage_count >= voucher_record.max_usage THEN
        error_message := 'Voucher has reached maximum usage limit';
        RETURN NEXT; RETURN;
    END IF;

    SELECT COUNT(*) INTO customer_usage_count
    FROM voucher_usage vu
    WHERE vu.voucher_id = voucher_record.id
      AND vu.customer_id = customer_id_param;

    IF voucher_record.max_uses_per_customer IS NOT NULL THEN
        IF customer_usage_count >= voucher_record.max_uses_per_customer THEN
            error_message := 'You have already used this voucher the maximum number of times';
            RETURN NEXT; RETURN;
        END IF;
    ELSIF customer_usage_count > 0 THEN
        error_message := 'You have already used this voucher';
        RETURN NEXT; RETURN;
    END IF;

    IF voucher_record.happy_hour_enabled = TRUE THEN
        IF voucher_record.happy_hour_days IS NOT NULL AND array_length(voucher_record.happy_hour_days, 1) > 0 THEN
            IF NOT (current_day_name = ANY(voucher_record.happy_hour_days)) THEN
                error_message := format('This voucher is only valid on: %s', array_to_string(voucher_record.happy_hour_days, ', '));
                RETURN NEXT; RETURN;
            END IF;
        END IF;

        IF voucher_record.happy_hour_start_time IS NOT NULL AND voucher_record.happy_hour_end_time IS NOT NULL THEN
            happy_hour_start := voucher_record.happy_hour_start_time::TIME;
            happy_hour_end := voucher_record.happy_hour_end_time::TIME;
            IF NOT (current_qatar_time >= happy_hour_start AND current_qatar_time <= happy_hour_end) THEN
                error_message := format('This voucher is only valid between %s and %s (Qatar time)', 
                    to_char(happy_hour_start, 'HH12:MI AM'), 
                    to_char(happy_hour_end, 'HH12:MI AM'));
                RETURN NEXT; RETURN;
            END IF;
        END IF;
    END IF;

    -- Voucher is valid
    is_valid := TRUE;
    discount_amount := COALESCE(voucher_record.discount_amount, 0);
    discount_percentage := COALESCE(voucher_record.discount_percentage, 0);
    voucher_id := voucher_record.id;
    applicable_products := voucher_record.applicable_products::text[];
    
    RETURN NEXT;
    RETURN;
END;
$function$;
