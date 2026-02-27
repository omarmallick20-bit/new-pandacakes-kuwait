

## Problem Analysis

**Root cause chain:**
1. `createPendingOrder()` in `CheckoutModal.tsx` (line 686) does NOT include `country_id` or `payment_currency` in the order insert
2. The DB column `orders.country_id` defaults to `'qa'`
3. The `auto_correct_order_country` trigger tries to fix it by reading from the customer's or address's `country_id`
4. But many Kuwait customers have `country_id: 'qa'` (the DB column default) — confirmed: customers with `phone_country_code: +965` still have `country_id: qa`
5. Result: Kuwait orders get `QA-` prefix order numbers and `QAR` payment currency

**Secondary issues:**
- `CustomCakeForm.tsx` has hardcoded "QAR" price ranges
- Translation key `pay_amounts_qar` text is already correct for KW ("All amounts in KWD") but the key name is misleading (cosmetic, not a bug)

## Implementation Plan

### 1. Fix `createPendingOrder` in CheckoutModal.tsx (critical)
Add `country_id: COUNTRY_ID` and `payment_currency: DEFAULT_CURRENCY` to the order insert object at line 686-713.

### 2. Fix customer profile country_id on signup/login
In `AuthContext.tsx`, ensure `country_id: COUNTRY_ID` is set when creating or updating customer profiles (the fallback path). This prevents the auto-correct trigger from pulling wrong data.

### 3. Add DB guard trigger
Create a migration with a `BEFORE INSERT` trigger on orders that enforces: if `country_id` is null or empty, derive it from the address first, then customer, then reject. Additionally, ensure `payment_currency` matches the country's currency. This acts as a safety net.

### 4. Fix hardcoded QAR in CustomCakeForm.tsx
Replace hardcoded "QAR" price estimates with `DEFAULT_CURRENCY` from config.

### 5. Fix existing KW customers with wrong country_id
Update customers who have `phone_country_code = '+965'` but `country_id = 'qa'` to `country_id = 'kw'` via data update (not migration).

## Files to modify
- `src/components/CheckoutModal.tsx` — add `country_id` and `payment_currency` to `createPendingOrder`
- `src/contexts/AuthContext.tsx` — ensure `country_id: COUNTRY_ID` in profile create/update
- `src/components/CustomCakeForm.tsx` — replace hardcoded QAR with dynamic currency
- New DB migration — add enforcement trigger for `country_id`/`payment_currency` consistency on orders

