-- Create a debug function to help troubleshoot RLS policy issues
CREATE OR REPLACE FUNCTION public.debug_user_orders_access()
RETURNS TABLE (
  user_id_from_auth uuid,
  session_user_id uuid,
  orders_visible_count bigint,
  sample_order_ids uuid[],
  rls_context text
) 
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.debug_user_orders_access() TO authenticated;