CREATE OR REPLACE FUNCTION get_auth_user_id_by_email(email_input text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE email = email_input LIMIT 1;
$$;