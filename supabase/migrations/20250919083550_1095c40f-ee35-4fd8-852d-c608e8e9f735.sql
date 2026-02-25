-- =========================================
-- COMPREHENSIVE BACKEND ENHANCEMENT PLAN
-- CRM-Ready E-commerce Database Structure
-- (FINAL CORRECTED VERSION)
-- =========================================

-- Phase 1: Core Data Integrity
-- =========================================

-- 1.1: Create Order Status Enum
CREATE TYPE order_status AS ENUM (
  'pending', 
  'confirmed', 
  'preparing', 
  'ready', 
  'out_for_delivery', 
  'completed', 
  'cancelled'
);

-- 1.2: Fix status column conversion (remove default first, then change type, then add default back)
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE orders ALTER COLUMN status TYPE order_status USING status::order_status;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending'::order_status;

-- Remove redundant phone_number column
ALTER TABLE orders DROP COLUMN IF EXISTS phone_number;

-- 1.3: Add proper foreign key constraints
ALTER TABLE orders 
  ADD CONSTRAINT fk_orders_customer_id 
  FOREIGN KEY (customer_id) REFERENCES "Customers"(id) ON DELETE CASCADE;

ALTER TABLE order_items 
  ADD CONSTRAINT fk_order_items_order_id 
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE menu_items 
  ADD CONSTRAINT fk_menu_items_category_id 
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE addresses 
  ADD CONSTRAINT fk_addresses_customer_id 
  FOREIGN KEY (customer_id) REFERENCES "Customers"(id) ON DELETE CASCADE;

-- 1.4: Add menu item enhancements
ALTER TABLE menu_items 
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nutritional_info JSONB,
  ADD COLUMN IF NOT EXISTS preparation_time INTEGER; -- in minutes

-- Phase 2: Performance Indexes
-- =========================================

-- 2.1: Time-based query indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_time ON orders(estimated_delivery_time);

-- 2.2: Menu and category indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON menu_items(category_id, sort_order);

-- 2.3: Customer analytics indexes
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_points ON "Customers"(loyalty_points DESC);
CREATE INDEX IF NOT EXISTS idx_customers_birthdate ON "Customers"(birthdate);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id, created_at DESC);

-- Phase 3: Analytics Views
-- =========================================

-- 3.1: Orders with customer details view
CREATE OR REPLACE VIEW orders_with_customer_details AS
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

-- 3.2: Recent orders view (last 3 hours priority) - Fixed enum comparison
CREATE OR REPLACE VIEW recent_orders AS
SELECT 
  o.*,
  c.first_name,
  c.last_name,
  c.whatsapp_number,
  EXTRACT(EPOCH FROM (NOW() - o.created_at))/3600 as hours_ago
FROM orders o
LEFT JOIN "Customers" c ON o.customer_id = c.id
WHERE o.created_at >= NOW() - INTERVAL '3 hours'
  AND o.status IN ('pending'::order_status, 'confirmed'::order_status, 'preparing'::order_status)
ORDER BY o.created_at DESC;

-- 3.3: Menu with category details view
CREATE OR REPLACE VIEW menu_with_categories AS
SELECT 
  m.*,
  c.name as category_name,
  c.image_url as category_image_url
FROM menu_items m
LEFT JOIN categories c ON m.category_id = c.id
WHERE m.is_active = true
ORDER BY c.name, m.sort_order, m.name;

-- Phase 4: Analytics Functions
-- =========================================

-- 4.1: Get orders by period function
CREATE OR REPLACE FUNCTION get_orders_by_period(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS TABLE(
  order_count bigint,
  total_revenue numeric,
  avg_order_value numeric,
  top_customer_id uuid,
  top_customer_name text,
  top_customer_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH order_stats AS (
    SELECT 
      COUNT(*) as order_count,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as avg_order_value
    FROM orders 
    WHERE created_at BETWEEN start_date AND end_date
  ),
  top_customer AS (
    SELECT 
      o.customer_id,
      c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
      COUNT(*) as customer_orders
    FROM orders o
    LEFT JOIN "Customers" c ON o.customer_id = c.id
    WHERE o.created_at BETWEEN start_date AND end_date
    GROUP BY o.customer_id, c.first_name, c.last_name
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT 
    os.order_count,
    os.total_revenue,
    os.avg_order_value,
    tc.customer_id,
    tc.customer_name,
    tc.customer_orders
  FROM order_stats os
  CROSS JOIN top_customer tc;
END;
$$;

-- 4.2: Get recent urgent orders function - Fixed enum comparison
CREATE OR REPLACE FUNCTION get_recent_urgent_orders()
RETURNS TABLE(
  id uuid,
  order_number text,
  customer_name text,
  whatsapp_number text,
  status order_status,
  total_amount numeric,
  created_at timestamp with time zone,
  hours_ago numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.order_number,
    c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
    c.whatsapp_number,
    o.status,
    o.total_amount,
    o.created_at,
    EXTRACT(EPOCH FROM (NOW() - o.created_at))/3600 as hours_ago
  FROM orders o
  LEFT JOIN "Customers" c ON o.customer_id = c.id
  WHERE o.created_at >= NOW() - INTERVAL '3 hours'
    AND o.status IN ('pending'::order_status, 'confirmed'::order_status, 'preparing'::order_status)
  ORDER BY o.created_at DESC;
END;
$$;

-- 4.3: Customer segmentation function
CREATE OR REPLACE FUNCTION get_customer_segments_by_loyalty(min_points integer DEFAULT 0)
RETURNS TABLE(
  customer_id uuid,
  full_name text,
  whatsapp_number text,
  loyalty_points smallint,
  total_orders bigint,
  total_spent numeric,
  last_order_date timestamp with time zone,
  days_since_last_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as customer_id,
    c.first_name || ' ' || COALESCE(c.last_name, '') as full_name,
    c.whatsapp_number,
    c.loyalty_points,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    MAX(o.created_at) as last_order_date,
    COALESCE(EXTRACT(DAY FROM (NOW() - MAX(o.created_at)))::integer, 999) as days_since_last_order
  FROM "Customers" c
  LEFT JOIN orders o ON c.id = o.customer_id
  WHERE c.loyalty_points >= min_points
    AND c.whatsapp_number IS NOT NULL
  GROUP BY c.id, c.first_name, c.last_name, c.whatsapp_number, c.loyalty_points
  ORDER BY c.loyalty_points DESC, total_spent DESC;
END;
$$;

-- 4.4: Birthday customers function
CREATE OR REPLACE FUNCTION get_birthday_customers(days_ahead integer DEFAULT 7)
RETURNS TABLE(
  customer_id uuid,
  full_name text,
  whatsapp_number text,
  birthdate date,
  days_until_birthday integer,
  loyalty_points smallint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as customer_id,
    c.first_name || ' ' || COALESCE(c.last_name, '') as full_name,
    c.whatsapp_number,
    c.birthdate,
    EXTRACT(DAY FROM (
      DATE(EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
           EXTRACT(MONTH FROM c.birthdate) || '-' || 
           EXTRACT(DAY FROM c.birthdate)) - CURRENT_DATE
    ))::integer as days_until_birthday,
    c.loyalty_points
  FROM "Customers" c
  WHERE c.birthdate IS NOT NULL
    AND c.whatsapp_number IS NOT NULL
    AND EXTRACT(DAY FROM (
      DATE(EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
           EXTRACT(MONTH FROM c.birthdate) || '-' || 
           EXTRACT(DAY FROM c.birthdate)) - CURRENT_DATE
    )) BETWEEN 0 AND days_ahead
  ORDER BY days_until_birthday ASC;
END;
$$;

-- Phase 5: Order Status Management
-- =========================================

-- 5.1: Order status transition function - Fixed enum comparisons
CREATE OR REPLACE FUNCTION update_order_status(
  order_id_param uuid,
  new_status order_status,
  staff_notes_param text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status order_status;
  valid_transition boolean := false;
BEGIN
  -- Get current status
  SELECT status INTO current_status 
  FROM orders 
  WHERE id = order_id_param;
  
  IF current_status IS NULL THEN
    RETURN false;
  END IF;
  
  -- Define valid status transitions
  valid_transition := CASE 
    WHEN current_status = 'pending'::order_status AND new_status IN ('confirmed'::order_status, 'cancelled'::order_status) THEN true
    WHEN current_status = 'confirmed'::order_status AND new_status IN ('preparing'::order_status, 'cancelled'::order_status) THEN true
    WHEN current_status = 'preparing'::order_status AND new_status IN ('ready'::order_status, 'cancelled'::order_status) THEN true
    WHEN current_status = 'ready'::order_status AND new_status IN ('out_for_delivery'::order_status, 'completed'::order_status, 'cancelled'::order_status) THEN true
    WHEN current_status = 'out_for_delivery'::order_status AND new_status IN ('completed'::order_status, 'cancelled'::order_status) THEN true
    ELSE false
  END;
  
  IF NOT valid_transition THEN
    RETURN false;
  END IF;
  
  -- Update the order
  UPDATE orders 
  SET 
    status = new_status,
    staff_notes = COALESCE(staff_notes_param, staff_notes),
    updated_at = NOW()
  WHERE id = order_id_param;
  
  RETURN true;
END;
$$;

-- Phase 6: Enhanced RLS Policies
-- =========================================

-- 6.1: Staff can manage orders policy
CREATE POLICY "Staff can manage all orders" ON orders
FOR ALL TO authenticated
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- 6.2: Staff can view all customer data for CRM
CREATE POLICY "Staff can view all customer data" ON "Customers"
FOR SELECT TO authenticated
USING (is_active_staff());

-- 6.3: Staff can manage menu items
CREATE POLICY "Staff can manage menu items" ON menu_items
FOR ALL TO authenticated
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- 6.4: Staff can manage categories
CREATE POLICY "Staff can manage categories" ON categories
FOR ALL TO authenticated
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- Phase 7: Voucher System Enhancement
-- =========================================

-- 7.1: Add voucher usage tracking
ALTER TABLE vouchers 
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_usage INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS used_by_customer_id uuid REFERENCES "Customers"(id);

-- 7.2: Voucher validation function
CREATE OR REPLACE FUNCTION validate_voucher(
  voucher_code_param text,
  customer_id_param uuid,
  order_amount numeric
)
RETURNS TABLE(
  is_valid boolean,
  discount_amount numeric,
  discount_percentage integer,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  voucher_record record;
BEGIN
  SELECT * INTO voucher_record
  FROM vouchers 
  WHERE voucher_code = voucher_code_param;
  
  -- Check if voucher exists
  IF voucher_record IS NULL THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher code not found';
    RETURN;
  END IF;
  
  -- Check if voucher is expired
  IF voucher_record.valid_until < CURRENT_DATE THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher has expired';
    RETURN;
  END IF;
  
  -- Check if voucher is not yet valid
  IF voucher_record.valid_from > CURRENT_DATE THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher is not yet valid';
    RETURN;
  END IF;
  
  -- Check usage limits
  IF voucher_record.usage_count >= voucher_record.max_usage THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher usage limit exceeded';
    RETURN;
  END IF;
  
  -- Check customer eligibility
  IF voucher_record.customer_id != customer_id_param THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher not valid for this customer';
    RETURN;
  END IF;
  
  -- Voucher is valid, return discount info
  RETURN QUERY SELECT 
    true, 
    voucher_record.discount_amount, 
    voucher_record.discount_percentage,
    'Voucher is valid'::text;
END;
$$;

-- Phase 8: Real-time Support
-- =========================================

-- 8.1: Enable realtime for orders table
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE "Customers" REPLICA IDENTITY FULL;

-- 8.2: Add tables to realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE "Customers";
  EXCEPTION 
    WHEN duplicate_object THEN 
      NULL; -- Ignore if already added
  END;
END $$;

-- Phase 9: Update Triggers
-- =========================================

-- 9.1: Ensure order number trigger works with new enum
DROP TRIGGER IF EXISTS set_order_number_trigger ON orders;
CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- 9.2: Update updated_at triggers
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();