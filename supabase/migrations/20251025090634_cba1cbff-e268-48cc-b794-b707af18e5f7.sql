-- Delete the broken temp user that has no customer profile
DELETE FROM auth.users 
WHERE id = '09e0b68a-2e5c-455c-8d48-d1a9b1d78ebc';

-- Create function to auto-create customer profile when new auth users are created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."Customers" (
    id,
    first_name,
    last_name,
    whatsapp_number,
    country_id,
    preferred_country,
    phone_country_code,
    has_completed_initial_setup
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.phone,
    'kw',
    'kw',
    '+965',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create customer profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();