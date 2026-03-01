

## Fix cross-country BakePoints and address isolation

### Problem Summary

Two issues when the same user logs into both Kuwait and Qatar deployments:

1. **Addresses not filtered by country** in `CheckoutPage.tsx` (line 91-95 and line 108-116) and `AddressSetupPage.tsx` (line 85-89) — user sees Qatar addresses in Kuwait and vice versa.

2. **BakePoints are a single global pool** — `Customers.loyalty_points` is one number. The DB functions `get_available_bakepoints` and `redeem_bakepoints` already filter `loyalty_transactions` by `country_id` and correctly track per-country earned/redeemed points. But the frontend reads `customerProfile.loyalty_points` (the global column) instead of querying the country-filtered balance.

### Plan

#### 1. Address filtering (frontend-only, 3 locations)

Add `.eq('country_id', COUNTRY_ID)` to:

- **`src/pages/CheckoutPage.tsx` ~line 94**: `checkUserAddress` query — so a Qatar address doesn't skip the user past address setup when on the KW site.
- **`src/pages/CheckoutPage.tsx` ~line 114**: `fetchUserAddresses` query — so only KW addresses appear in the checkout address picker.
- **`src/pages/AddressSetupPage.tsx` ~line 88**: `checkExistingAddress` query — so having a Qatar address doesn't redirect the user away from KW address setup.

#### 2. Per-country BakePoints balance (frontend + DB function)

**DB migration** — create a new RPC `get_country_bakepoints(p_customer_id, p_country_id)` that returns the country-specific available points by summing `loyalty_transactions` filtered by `country_id` and non-expired/non-redeemed status. This is essentially the existing `get_available_bakepoints` function but without the `qa`-only guard (since KW also needs it).

Actually, `get_available_bakepoints` already does the right thing — it sums `loyalty_transactions` by `country_id`. The problem is:
- It hard-codes `IF p_country_id != 'qa' THEN RETURN 0` — blocking KW.
- The frontend never calls it; it reads the global `loyalty_points` column instead.

**DB migration**: Update `get_available_bakepoints` to remove the `qa`-only guard so it works for any country_id. Also update `redeem_bakepoints` to remove the `qa`-only guard and use the correct redemption rate per country (500 points = 1 KWD for KW, 50 points = 1 QAR for QA).

**Frontend change in `src/components/CheckoutModal.tsx`**: After fetching `customerProfile`, call the `get_available_bakepoints` RPC with `COUNTRY_ID` to get the country-specific balance, and use that instead of `customerProfile.loyalty_points` for displaying available points and calculating max redeemable.

**Frontend change in `src/components/ProfileModal.tsx`**: Same — call `get_available_bakepoints` RPC to show country-specific balance instead of global `loyalty_points`.

### Technical details

**Migration SQL:**
```sql
-- Remove qa-only guard from get_available_bakepoints
CREATE OR REPLACE FUNCTION get_available_bakepoints(
  p_customer_id UUID,
  p_country_id VARCHAR DEFAULT 'qa'
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE available_points INTEGER;
BEGIN
  SELECT COALESCE(SUM(points), 0)::INTEGER INTO available_points
  FROM loyalty_transactions
  WHERE customer_id = p_customer_id
    AND country_id = p_country_id
    AND (is_expired = false OR is_expired IS NULL)
    AND (is_redeemed = false OR is_redeemed IS NULL)
    AND (expires_at IS NULL OR expires_at > NOW());
  RETURN available_points;
END; $$;

-- Remove qa-only guard from redeem_bakepoints, use dynamic rate
CREATE OR REPLACE FUNCTION redeem_bakepoints(
  p_customer_id UUID, p_points_to_redeem INTEGER,
  p_order_id UUID DEFAULT NULL, p_country_id VARCHAR DEFAULT 'qa'
) RETURNS TABLE(success BOOLEAN, discount_amount NUMERIC, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_balance INTEGER;
  calculated_discount NUMERIC;
  redemption_rate INTEGER;
  currency_label TEXT;
BEGIN
  -- Set rate per country
  IF p_country_id = 'kw' THEN
    redemption_rate := 500; currency_label := 'KWD';
  ELSE
    redemption_rate := 50; currency_label := 'QAR';
  END IF;

  IF p_points_to_redeem < redemption_rate THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 0, ('Minimum redemption is ' || redemption_rate || ' BakePoints')::TEXT;
    RETURN;
  END IF;

  IF p_points_to_redeem % redemption_rate != 0 THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 0, ('BakePoints must be redeemed in multiples of ' || redemption_rate)::TEXT;
    RETURN;
  END IF;

  current_balance := get_available_bakepoints(p_customer_id, p_country_id);

  IF current_balance < p_points_to_redeem THEN
    RETURN QUERY SELECT false, 0::NUMERIC, current_balance, 'Insufficient BakePoints balance'::TEXT;
    RETURN;
  END IF;

  calculated_discount := (p_points_to_redeem::NUMERIC / redemption_rate);

  INSERT INTO loyalty_transactions (customer_id, order_id, points, transaction_type, description, country_id, is_redeemed)
  VALUES (p_customer_id, p_order_id, -p_points_to_redeem, 'redeem',
    'Redeemed ' || p_points_to_redeem || ' BakePoints for ' || calculated_discount || ' ' || currency_label || ' discount',
    p_country_id, true);

  UPDATE "Customers" SET loyalty_points = loyalty_points - p_points_to_redeem WHERE id = p_customer_id;

  RETURN QUERY SELECT true, calculated_discount, (current_balance - p_points_to_redeem), 'BakePoints redeemed successfully'::TEXT;
END; $$;
```

**Frontend files to modify:**
- `src/pages/CheckoutPage.tsx` — add `.eq('country_id', COUNTRY_ID)` to 2 address queries
- `src/pages/AddressSetupPage.tsx` — add `.eq('country_id', COUNTRY_ID)` to address check query
- `src/components/CheckoutModal.tsx` — fetch country-specific BakePoints via RPC instead of using `customerProfile.loyalty_points`
- `src/components/ProfileModal.tsx` — fetch country-specific BakePoints via RPC for display

