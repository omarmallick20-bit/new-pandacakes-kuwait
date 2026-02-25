-- Remove dangerous RLS policies that allow anyone to modify menu items
DROP POLICY IF EXISTS "Anyone can create menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Anyone can delete menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Anyone can update menu items" ON public.menu_items;

-- The secure policies remain:
-- - "Staff can manage menu items" (restricts to authenticated staff only)
-- - "Anyone can view active menu items" (safe read-only access)
-- - "Anyone can view all menu items" (safe read-only access)

-- Verify that only staff can now manage menu items by checking existing secure policy
-- This policy already exists and uses is_active_staff() function for proper authorization