-- Add discount fields to menu_items table for product-specific discounts
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT NULL;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS discount_valid_from TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS discount_valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS show_discount_badge BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN menu_items.discount_percentage IS 'Percentage discount (e.g., 25 for 25% off)';
COMMENT ON COLUMN menu_items.discount_amount IS 'Fixed amount discount (alternative to percentage)';
COMMENT ON COLUMN menu_items.discount_valid_from IS 'Start date for discount validity';
COMMENT ON COLUMN menu_items.discount_valid_until IS 'End date for discount validity';
COMMENT ON COLUMN menu_items.show_discount_badge IS 'Whether to show the discount badge on product image';