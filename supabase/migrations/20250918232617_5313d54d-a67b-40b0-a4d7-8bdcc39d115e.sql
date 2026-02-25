-- Create the missing trigger to call handle_new_user() when users sign up
-- This is critical for OAuth signups to create customer records

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create an updated trigger to handle updates to user metadata
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users who don't have customer records
INSERT INTO public."Customers" (id, first_name, last_name)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'first_name', COALESCE(au.raw_user_meta_data->>'given_name', '')),
  COALESCE(au.raw_user_meta_data->>'last_name', COALESCE(au.raw_user_meta_data->>'family_name', ''))
FROM auth.users au
LEFT JOIN public."Customers" c ON au.id = c.id
WHERE c.id IS NULL
ON CONFLICT (id) DO NOTHING;