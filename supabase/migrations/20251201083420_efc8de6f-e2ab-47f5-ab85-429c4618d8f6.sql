-- Add VAT configuration columns to site_config table
ALTER TABLE site_config 
ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vat_percentage NUMERIC(5,2) DEFAULT 0;

-- Update existing rows to have VAT disabled by default
UPDATE site_config 
SET vat_enabled = false, vat_percentage = 0 
WHERE vat_enabled IS NULL;

-- Add VAT columns to orders table for historical records
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS vat_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN site_config.vat_enabled IS 'Controls whether VAT is applied to orders. Managed by external dashboard.';
COMMENT ON COLUMN site_config.vat_percentage IS 'VAT percentage rate (e.g., 5 for 5%). Managed by external dashboard.';
COMMENT ON COLUMN orders.vat_percentage IS 'VAT percentage applied at time of order';
COMMENT ON COLUMN orders.vat_amount IS 'VAT amount charged for this order in QAR';