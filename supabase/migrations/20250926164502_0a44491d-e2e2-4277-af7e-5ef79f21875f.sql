-- Update the auth signup edge function to handle phone numbers properly
-- This will ensure phone numbers are stored correctly in the whatsapp_number field

-- First, let's update the handle_new_user trigger to also extract phone number from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  first_name_val text;
  last_name_val text;
  profile_pic_url text;
  full_name_val text;
  phone_number_val text;
BEGIN
  -- Extract profile picture URL from various OAuth providers
  profile_pic_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'profile_picture'
  );
  
  -- Extract phone number
  phone_number_val := NEW.raw_user_meta_data->>'phone_number';
  
  -- Extract first and last names with better OAuth support
  -- Try direct first_name/last_name fields first (form signup)
  first_name_val := NEW.raw_user_meta_data->>'first_name';
  last_name_val := NEW.raw_user_meta_data->>'last_name';
  
  -- If no direct fields, try given_name/family_name (some OAuth providers)
  IF first_name_val IS NULL THEN
    first_name_val := NEW.raw_user_meta_data->>'given_name';
  END IF;
  
  IF last_name_val IS NULL THEN
    last_name_val := NEW.raw_user_meta_data->>'family_name';
  END IF;
  
  -- If still no names, try to parse full_name or name field (Google OAuth)
  IF first_name_val IS NULL OR last_name_val IS NULL THEN
    full_name_val := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    );
    
    IF full_name_val IS NOT NULL THEN
      -- Split full name into first and last name
      -- Take everything before first space as first name
      -- Take everything after first space as last name
      first_name_val := COALESCE(first_name_val, TRIM(split_part(full_name_val, ' ', 1)));
      
      -- If there are multiple words, combine remaining as last name
      IF position(' ' in full_name_val) > 0 THEN
        last_name_val := COALESCE(last_name_val, TRIM(substring(full_name_val from position(' ' in full_name_val) + 1)));
      END IF;
    END IF;
  END IF;
  
  -- Set defaults for empty values
  first_name_val := COALESCE(first_name_val, '');
  last_name_val := COALESCE(last_name_val, '');

  INSERT INTO "Customers" (
    id, 
    first_name, 
    last_name,
    whatsapp_number,
    profile_picture_url,
    preferred_country
  )
  VALUES (
    NEW.id,
    first_name_val,
    last_name_val,
    phone_number_val,
    profile_pic_url,
    'qa' -- Default to Qatar
  )
  ON CONFLICT (id) DO UPDATE
  SET
    first_name = CASE 
      WHEN EXCLUDED.first_name != '' THEN EXCLUDED.first_name 
      ELSE "Customers".first_name 
    END,
    last_name = CASE 
      WHEN EXCLUDED.last_name != '' THEN EXCLUDED.last_name 
      ELSE "Customers".last_name 
    END,
    whatsapp_number = CASE 
      WHEN EXCLUDED.whatsapp_number IS NOT NULL THEN EXCLUDED.whatsapp_number 
      ELSE "Customers".whatsapp_number 
    END,
    profile_picture_url = CASE 
      WHEN EXCLUDED.profile_picture_url IS NOT NULL THEN EXCLUDED.profile_picture_url 
      ELSE "Customers".profile_picture_url 
    END;

  RETURN NEW;
END;
$$;