-- =========================================
-- BACKEND ENHANCEMENT - SAFE ENUM CONVERSION
-- =========================================

-- Step 1: Create Order Status Enum
CREATE TYPE order_status AS ENUM (
  'pending', 
  'confirmed', 
  'preparing', 
  'ready', 
  'out_for_delivery', 
  'completed', 
  'cancelled'
);

-- Step 2: Add new status column with enum type
ALTER TABLE orders ADD COLUMN status_new order_status DEFAULT 'pending'::order_status;

-- Step 3: Populate the new column based on old status
UPDATE orders SET status_new = 
  CASE 
    WHEN status::text = 'pending' THEN 'pending'::order_status
    WHEN status::text = 'confirmed' THEN 'confirmed'::order_status  
    WHEN status::text = 'preparing' THEN 'preparing'::order_status
    WHEN status::text = 'ready' THEN 'ready'::order_status
    WHEN status::text = 'completed' THEN 'completed'::order_status
    WHEN status::text = 'cancelled' THEN 'cancelled'::order_status
    ELSE 'pending'::order_status
  END;

-- Step 4: Drop old column and rename new one
ALTER TABLE orders DROP COLUMN status;
ALTER TABLE orders RENAME COLUMN status_new TO status;

-- Step 5: Remove redundant phone_number column
ALTER TABLE orders DROP COLUMN IF EXISTS phone_number;

-- Step 6: Add proper foreign key constraints
DO $$
BEGIN
  -- Add customer constraint if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_orders_customer_id') THEN
    ALTER TABLE orders 
      ADD CONSTRAINT fk_orders_customer_id 
      FOREIGN KEY (customer_id) REFERENCES "Customers"(id) ON DELETE CASCADE;
  END IF;

  -- Add order items constraint if not exists  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_order_items_order_id') THEN
    ALTER TABLE order_items 
      ADD CONSTRAINT fk_order_items_order_id 
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
  END IF;

  -- Add menu items constraint if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_menu_items_category_id') THEN
    ALTER TABLE menu_items 
      ADD CONSTRAINT fk_menu_items_category_id 
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;

  -- Add addresses constraint if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_addresses_customer_id') THEN
    ALTER TABLE addresses 
      ADD CONSTRAINT fk_addresses_customer_id 
      FOREIGN KEY (customer_id) REFERENCES "Customers"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 7: Add menu item enhancements
ALTER TABLE menu_items 
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nutritional_info JSONB,
  ADD COLUMN IF NOT EXISTS preparation_time INTEGER;

-- Step 8: Add voucher enhancements  
ALTER TABLE vouchers 
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_usage INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS used_by_customer_id uuid;

-- Add foreign key for used_by_customer_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_vouchers_used_by_customer') THEN
    ALTER TABLE vouchers
      ADD CONSTRAINT fk_vouchers_used_by_customer
      FOREIGN KEY (used_by_customer_id) REFERENCES "Customers"(id);
  END IF;
END $$;

-- Step 9: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_time ON orders(estimated_delivery_time);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON menu_items(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_points ON "Customers"(loyalty_points DESC);
CREATE INDEX IF NOT EXISTS idx_customers_birthdate ON "Customers"(birthdate);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id, created_at DESC);

-- Step 10: Enhanced RLS Policies
CREATE POLICY "Staff can manage all orders" ON orders
FOR ALL TO authenticated
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can view all customer data" ON "Customers"
FOR SELECT TO authenticated
USING (is_active_staff());

CREATE POLICY "Staff can manage menu items" ON menu_items
FOR ALL TO authenticated
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can manage categories" ON categories
FOR ALL TO authenticated
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- Step 11: Ensure triggers work properly
DROP TRIGGER IF EXISTS set_order_number_trigger ON orders;
CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Create updated_at triggers
DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
  DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
  DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;

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
END $$;

-- Step 12: Enable realtime
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE "Customers" REPLICA IDENTITY FULL;

-- Add tables to realtime publication safely
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Customers";
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
END $$;