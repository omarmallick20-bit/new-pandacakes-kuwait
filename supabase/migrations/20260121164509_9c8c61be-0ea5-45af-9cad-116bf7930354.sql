-- Add bakepoints_discount_amount column to orders table
ALTER TABLE orders 
ADD COLUMN bakepoints_discount_amount NUMERIC DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN orders.bakepoints_discount_amount IS 'Amount discounted from order total via BakePoints redemption (50 points = 1 QAR)';