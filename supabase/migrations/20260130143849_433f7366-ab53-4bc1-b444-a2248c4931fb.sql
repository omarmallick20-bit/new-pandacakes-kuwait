-- Add columns to order_items table to track item discounts
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS original_unit_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS item_discount_percentage INTEGER,
ADD COLUMN IF NOT EXISTS item_discount_amount NUMERIC(10,2);

-- Add comments for clarity
COMMENT ON COLUMN order_items.original_unit_price IS 'Price before item discount was applied';
COMMENT ON COLUMN order_items.item_discount_percentage IS 'Percentage discount from item_discounts campaign';
COMMENT ON COLUMN order_items.item_discount_amount IS 'Absolute discount amount applied to this item';