-- Add snapshot columns to orders table to preserve customer/address data
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_snapshot jsonb NULL,
ADD COLUMN IF NOT EXISTS delivery_address_snapshot jsonb NULL;

-- Make customer_id nullable (so we can SET NULL on delete)
ALTER TABLE public.orders 
ALTER COLUMN customer_id DROP NOT NULL;

-- Drop existing foreign key constraints and recreate with ON DELETE SET NULL
-- For delivery_address_id (if FK exists)
DO $$
BEGIN
  -- Try to drop existing FK for delivery_address_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_delivery_address_id_fkey' 
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_delivery_address_id_fkey;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- For customer_id FK (check common naming patterns)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_customer_id_fkey' 
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_customer_id_fkey;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_orders_customer_id' 
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT fk_orders_customer_id;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Recreate FKs with ON DELETE SET NULL
ALTER TABLE public.orders
ADD CONSTRAINT orders_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES public."Customers"(id) ON DELETE SET NULL;

ALTER TABLE public.orders
ADD CONSTRAINT orders_delivery_address_id_fkey 
FOREIGN KEY (delivery_address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;

-- Backfill existing orders with customer snapshots
UPDATE public.orders o
SET customer_snapshot = jsonb_build_object(
  'id', c.id,
  'first_name', c.first_name,
  'last_name', c.last_name,
  'phone_country_code', c.phone_country_code,
  'whatsapp_number', c.whatsapp_number,
  'preferred_country', c.preferred_country,
  'country_id', c.country_id,
  'loyalty_code', c.loyalty_code
)
FROM public."Customers" c
WHERE o.customer_id = c.id AND o.customer_snapshot IS NULL;

-- Backfill existing orders with delivery address snapshots
UPDATE public.orders o
SET delivery_address_snapshot = jsonb_build_object(
  'id', a.id,
  'label', a.label,
  'street_address', a.street_address,
  'city', a.city,
  'country', a.country,
  'landmarks', a.landmarks,
  'latitude', a.latitude,
  'longitude', a.longitude,
  'delivery_fee', a.delivery_fee,
  'delivery_zone_id', a.delivery_zone_id,
  'is_serviceable', a.is_serviceable
)
FROM public.addresses a
WHERE o.delivery_address_id = a.id AND o.delivery_address_snapshot IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.customer_snapshot IS 'Immutable snapshot of customer details at order time';
COMMENT ON COLUMN public.orders.delivery_address_snapshot IS 'Immutable snapshot of delivery address at order time';