-- Add missing columns for payment retry mechanism
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tap_idempotency_key TEXT;

-- Add pending_payment status for orders awaiting card payment
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'order_status' AND e.enumlabel = 'pending_payment'
  ) THEN
    ALTER TYPE order_status ADD VALUE 'pending_payment';
  END IF;
END $$;