-- Remove duplicate foreign key constraint
-- This prevents the PostgreSQL embedding error with multiple relationships
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fk_order_items_order_id;

-- Update the handle_new_user trigger to properly populate customer names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO "Customers" (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', COALESCE(NEW.raw_user_meta_data->>'given_name', '')),
    COALESCE(NEW.raw_user_meta_data->>'last_name', COALESCE(NEW.raw_user_meta_data->>'family_name', ''))
  )
  ON CONFLICT (id) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

  RETURN NEW;
END;
$$;