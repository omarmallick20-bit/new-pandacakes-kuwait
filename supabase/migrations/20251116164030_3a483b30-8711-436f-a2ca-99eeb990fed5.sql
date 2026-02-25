-- Add Tap Payments fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tap_charge_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tap_payment_reference TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'QAR';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2);

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_orders_tap_charge_id ON orders(tap_charge_id);

-- Comment for clarity
COMMENT ON COLUMN orders.tap_charge_id IS 'Tap Payments charge ID for tracking';
COMMENT ON COLUMN orders.payment_status IS 'Payment status: pending, authorized, captured, failed';
COMMENT ON COLUMN orders.payment_currency IS 'Payment currency code (should always be QAR)';
COMMENT ON COLUMN orders.payment_amount IS 'Actual payment amount in the payment currency';