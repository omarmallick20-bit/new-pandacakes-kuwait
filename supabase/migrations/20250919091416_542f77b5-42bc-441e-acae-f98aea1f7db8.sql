-- =========================================
-- STEP 3: FIX SECURITY ISSUES
-- =========================================

-- Fix Security Definer View issues by explicitly setting SECURITY INVOKER
-- =========================================

-- Recreate views with explicit SECURITY INVOKER to fix security warnings
DROP VIEW IF EXISTS orders_with_customer_details;
CREATE VIEW orders_with_customer_details 
WITH (security_invoker = true)
AS
SELECT 
  o.*,
  c.first_name,
  c.last_name,
  c.whatsapp_number,
  c.loyalty_points,
  c.birthdate,
  a.street_address,
  a.city,
  a.state,
  a.country,
  a.latitude,
  a.longitude
FROM orders o
LEFT JOIN "Customers" c ON o.customer_id = c.id
LEFT JOIN addresses a ON o.delivery_address_id = a.id;

DROP VIEW IF EXISTS recent_orders;
CREATE VIEW recent_orders 
WITH (security_invoker = true)
AS
SELECT 
  o.*,
  c.first_name,
  c.last_name,
  c.whatsapp_number,
  EXTRACT(EPOCH FROM (NOW() - o.created_at))/3600 as hours_ago
FROM orders o
LEFT JOIN "Customers" c ON o.customer_id = c.id
WHERE o.created_at >= NOW() - INTERVAL '3 hours'
  AND o.status = ANY(ARRAY['pending'::order_status, 'confirmed'::order_status, 'preparing'::order_status])
ORDER BY o.created_at DESC;

DROP VIEW IF EXISTS menu_with_categories;
CREATE VIEW menu_with_categories 
WITH (security_invoker = true)
AS
SELECT 
  m.*,
  c.name as category_name,
  c.image_url as category_image_url
FROM menu_items m
LEFT JOIN categories c ON m.category_id = c.id
WHERE m.is_active = true
ORDER BY c.name, m.sort_order, m.name;

-- Fix remaining functions with missing search_path
-- =========================================

-- Update remaining functions to include proper search_path
CREATE OR REPLACE FUNCTION public.generate_pbkdf2_hash(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  salt_bytes BYTEA;
  password_bytes BYTEA;
  hash_bytes BYTEA;
  salt_hex TEXT;
  hash_hex TEXT;
BEGIN
  -- Generate a random 32-byte salt
  salt_bytes := gen_random_bytes(32);
  
  -- Convert password to bytes
  password_bytes := convert_to(password, 'UTF8');
  
  -- Generate PBKDF2 hash (this is a simplified version - in practice you'd use a proper PBKDF2 implementation)
  -- For now, we'll use a combination of salt and password with SHA256
  hash_bytes := digest(salt_bytes || password_bytes || salt_bytes, 'sha256');
  
  -- Convert to hex
  salt_hex := encode(salt_bytes, 'hex');
  hash_hex := encode(hash_bytes, 'hex');
  
  -- Return in the format expected by our edge function: salt:hash
  RETURN salt_hex || ':' || hash_hex;
END;
$$;

CREATE OR REPLACE FUNCTION public.debug_user_orders_access()
RETURNS TABLE(user_id_from_auth uuid, session_user_id uuid, orders_visible_count bigint, sample_order_ids uuid[], rls_context text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user_id uuid;
  session_user_id uuid;
  visible_orders_count bigint;
  sample_orders uuid[];
  context_info text;
BEGIN
  -- Get the current authenticated user ID
  auth_user_id := auth.uid();
  
  -- Get session user ID (should be the same as auth.uid())
  SELECT auth.uid() INTO session_user_id;
  
  -- Count orders visible to current user (respects RLS)
  SELECT COUNT(*) INTO visible_orders_count
  FROM orders 
  WHERE customer_id = auth_user_id;
  
  -- Get a sample of visible order IDs
  SELECT ARRAY_AGG(id) INTO sample_orders
  FROM (
    SELECT id 
    FROM orders 
    WHERE customer_id = auth_user_id 
    ORDER BY created_at DESC 
    LIMIT 5
  ) sample;
  
  -- Build context information
  context_info := FORMAT(
    'Auth UID: %s, Session consistent: %s, Current time: %s',
    auth_user_id,
    (auth_user_id = session_user_id),
    NOW()
  );
  
  -- Return the debug information
  RETURN QUERY SELECT 
    auth_user_id,
    session_user_id,
    visible_orders_count,
    COALESCE(sample_orders, ARRAY[]::uuid[]),
    context_info;
END;
$$;