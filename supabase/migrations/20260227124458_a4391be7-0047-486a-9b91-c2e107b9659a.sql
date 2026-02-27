-- DB guard trigger: enforce country_id and payment_currency on orders insert
-- This is a safety net — the app should always provide these values,
-- but if they're missing/wrong, this trigger corrects them.

CREATE OR REPLACE FUNCTION public.enforce_order_country_currency()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  country_currency TEXT;
BEGIN
  -- 1. If country_id is null or empty, try to derive from address, then customer
  IF NEW.country_id IS NULL OR NEW.country_id = '' THEN
    -- Try from delivery address
    IF NEW.delivery_address_id IS NOT NULL THEN
      SELECT a.country_id INTO NEW.country_id
      FROM addresses a WHERE a.id = NEW.delivery_address_id;
    END IF;

    -- Still null? Try from customer
    IF (NEW.country_id IS NULL OR NEW.country_id = '') AND NEW.customer_id IS NOT NULL THEN
      SELECT c.country_id INTO NEW.country_id
      FROM "Customers" c WHERE c.id = NEW.customer_id;
    END IF;

    -- Still null? Default to 'qa' (legacy fallback, should not happen)
    IF NEW.country_id IS NULL OR NEW.country_id = '' THEN
      NEW.country_id := 'qa';
    END IF;
  END IF;

  -- 2. Enforce payment_currency matches the country
  SELECT currency_code INTO country_currency
  FROM countries WHERE id = NEW.country_id;

  IF country_currency IS NOT NULL THEN
    NEW.payment_currency := country_currency;
  ELSIF NEW.payment_currency IS NULL OR NEW.payment_currency = '' THEN
    -- Fallback mapping if countries table lookup fails
    CASE NEW.country_id
      WHEN 'kw' THEN NEW.payment_currency := 'KWD';
      WHEN 'sa' THEN NEW.payment_currency := 'SAR';
      ELSE NEW.payment_currency := 'QAR';
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS enforce_order_country_currency_trigger ON orders;
CREATE TRIGGER enforce_order_country_currency_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_country_currency();