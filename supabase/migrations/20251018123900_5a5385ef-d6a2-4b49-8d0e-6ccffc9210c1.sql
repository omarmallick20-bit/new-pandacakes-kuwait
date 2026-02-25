-- Step 1: Add new 'landmarks' column for additional details
ALTER TABLE addresses 
ADD COLUMN IF NOT EXISTS landmarks text;

-- Step 2: Drop the state and postal_code columns with CASCADE to handle dependent views
ALTER TABLE addresses 
DROP COLUMN IF EXISTS state CASCADE,
DROP COLUMN IF EXISTS postal_code CASCADE;

-- Step 3: Recreate the orders_with_customer_details view without state and postal_code
CREATE OR REPLACE VIEW orders_with_customer_details AS
SELECT 
  o.id,
  o.order_number,
  o.customer_id,
  o.delivery_address_id,
  o.total_amount,
  o.created_at,
  o.updated_at,
  o.order_placed_at,
  o.estimated_delivery_time,
  o.cake_details,
  o.status,
  o.assigned_driver_id,
  o.platform_source,
  o.platform_order_id,
  o.customer_notes,
  o.staff_notes,
  o.payment_method,
  o.country_id,
  o.assigned_driver_name,
  o.driver_notes,
  c.first_name,
  c.last_name,
  c.whatsapp_number,
  c.birthdate,
  c.loyalty_points,
  a.street_address,
  a.city,
  a.country,
  a.latitude,
  a.longitude
FROM orders o
LEFT JOIN "Customers" c ON o.customer_id = c.id
LEFT JOIN addresses a ON o.delivery_address_id = a.id;

-- Step 4: Update country_id default to ensure it's always 'qa' (Qatar)
ALTER TABLE addresses 
ALTER COLUMN country_id SET DEFAULT 'qa'::character varying;

-- Step 5: Update country default to ensure it's always 'Qatar'
ALTER TABLE addresses 
ALTER COLUMN country SET DEFAULT 'Qatar'::text;

-- Step 6: Make sure existing records have correct country values
UPDATE addresses 
SET country_id = 'qa', country = 'Qatar' 
WHERE country_id != 'qa' OR country != 'Qatar';