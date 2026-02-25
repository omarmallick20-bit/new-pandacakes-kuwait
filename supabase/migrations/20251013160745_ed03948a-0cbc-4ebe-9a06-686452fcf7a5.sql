-- Fix find_customer_by_email_or_phone function to properly look up users
CREATE OR REPLACE FUNCTION public.find_customer_by_email_or_phone(input_text text)
RETURNS TABLE(customer_id uuid, email text, whatsapp_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_input text;
BEGIN
  -- Normalize phone: remove spaces, keep + and digits
  normalized_input := regexp_replace(input_text, '[^\d+]', '', 'g');
  
  -- First try exact email match
  IF position('@' in input_text) > 0 THEN
    RETURN QUERY
    SELECT c.id, au.email, c.whatsapp_number
    FROM "Customers" c
    JOIN auth.users au ON c.id = au.id
    WHERE au.email = input_text;
    
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- Then try phone number match (with normalization)
  RETURN QUERY
  SELECT c.id, au.email, c.whatsapp_number
  FROM "Customers" c
  JOIN auth.users au ON c.id = au.id
  WHERE regexp_replace(c.whatsapp_number, '[^\d+]', '', 'g') = normalized_input
     OR c.whatsapp_number = input_text
     OR au.raw_user_meta_data->>'phone_number' = input_text
     OR regexp_replace(COALESCE(au.raw_user_meta_data->>'phone_number', ''), '[^\d+]', '', 'g') = normalized_input;
END;
$$;