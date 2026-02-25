-- Drop the old versions of validate_voucher and apply_voucher functions
-- that don't include country_code_param to resolve function overloading conflicts

-- Drop the old validate_voucher function (3 parameters)
DROP FUNCTION IF EXISTS public.validate_voucher(voucher_code_param text, customer_id_param uuid, order_amount numeric);

-- Drop the old apply_voucher function (3 parameters)  
DROP FUNCTION IF EXISTS public.apply_voucher(voucher_code_param text, customer_id_param uuid, order_amount numeric);