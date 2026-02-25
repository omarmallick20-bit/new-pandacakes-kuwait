-- First drop the existing function, then recreate with fixed column references
DROP FUNCTION IF EXISTS public.validate_voucher(text, uuid, numeric, character varying);

-- Recreate the function with unambiguous column references
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
    voucher_id uuid
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    voucher_record RECORD;
    customer_usage_count INTEGER;
    current_time_qatar TIMESTAMPTZ;
    current_day_name TEXT;
    happy_hour_start TIME;
    happy_hour_end TIME;
    current_qatar_time TIME;
BEGIN
    -- Initialize return values
    is_valid := FALSE;
    discount_amount := 0;
    discount_percentage := 0;
    error_message := NULL;
    voucher_id := NULL;

    -- Get current Qatar time
    current_time_qatar := NOW() AT TIME ZONE 'Asia/Qatar';
    current_day_name := to_char(current_time_qatar, 'Day');
    current_day_name := TRIM(current_day_name);
    current_qatar_time := current_time_qatar::TIME;

    -- Find the voucher
    SELECT * INTO voucher_record
    FROM vouchers v
    WHERE UPPER(v.voucher_code) = UPPER(voucher_code_param)
      AND v.country_id = country_code_param;

    -- Check if voucher exists
    IF voucher_record IS NULL THEN
        error_message := 'Invalid voucher code';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check validity dates
    IF CURRENT_DATE < voucher_record.valid_from THEN
        error_message := 'Voucher is not yet active';
        RETURN NEXT;
        RETURN;
    END IF;

    IF CURRENT_DATE > voucher_record.valid_until THEN
        error_message := 'Voucher has expired';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check if voucher is for specific customer
    IF voucher_record.customer_id IS NOT NULL AND voucher_record.customer_id != customer_id_param THEN
        error_message := 'This voucher is not valid for your account';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check minimum order amount
    IF voucher_record.min_order_amount IS NOT NULL AND order_amount_param < voucher_record.min_order_amount THEN
        error_message := format('Minimum order amount of %s required', voucher_record.min_order_amount);
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check global usage limit (max_usage)
    IF voucher_record.max_usage IS NOT NULL AND voucher_record.usage_count >= voucher_record.max_usage THEN
        error_message := 'Voucher has reached maximum usage limit';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check customer-specific usage limit (FIXED: use table alias to avoid ambiguity)
    SELECT COUNT(*) INTO customer_usage_count
    FROM voucher_usage vu
    WHERE vu.voucher_id = voucher_record.id
      AND vu.customer_id = customer_id_param;

    IF voucher_record.max_uses_per_customer IS NOT NULL THEN
        IF customer_usage_count >= voucher_record.max_uses_per_customer THEN
            error_message := 'You have already used this voucher the maximum number of times';
            RETURN NEXT;
            RETURN;
        END IF;
    ELSIF customer_usage_count > 0 THEN
        -- Default: allow only 1 use per customer if max_uses_per_customer is not set
        error_message := 'You have already used this voucher';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check happy hour restrictions (based on order placement time, NOT delivery time)
    IF voucher_record.happy_hour_enabled = TRUE THEN
        -- Check day restriction
        IF voucher_record.happy_hour_days IS NOT NULL AND array_length(voucher_record.happy_hour_days, 1) > 0 THEN
            IF NOT (current_day_name = ANY(voucher_record.happy_hour_days)) THEN
                error_message := format('This voucher is only valid on: %s', array_to_string(voucher_record.happy_hour_days, ', '));
                RETURN NEXT;
                RETURN;
            END IF;
        END IF;

        -- Check time restriction
        IF voucher_record.happy_hour_start_time IS NOT NULL AND voucher_record.happy_hour_end_time IS NOT NULL THEN
            happy_hour_start := voucher_record.happy_hour_start_time::TIME;
            happy_hour_end := voucher_record.happy_hour_end_time::TIME;
            
            IF NOT (current_qatar_time >= happy_hour_start AND current_qatar_time <= happy_hour_end) THEN
                error_message := format('This voucher is only valid between %s and %s (Qatar time)', 
                    to_char(happy_hour_start, 'HH12:MI AM'), 
                    to_char(happy_hour_end, 'HH12:MI AM'));
                RETURN NEXT;
                RETURN;
            END IF;
        END IF;
    END IF;

    -- Voucher is valid, return discount info
    is_valid := TRUE;
    discount_amount := COALESCE(voucher_record.discount_amount, 0);
    discount_percentage := COALESCE(voucher_record.discount_percentage, 0);
    voucher_id := voucher_record.id;
    
    RETURN NEXT;
    RETURN;
END;
$$;