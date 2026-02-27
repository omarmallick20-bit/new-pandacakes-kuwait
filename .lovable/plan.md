

## Problem
KWD requires 3 decimal places (e.g., `20.000`) but prices throughout the app use hardcoded `.toFixed(2)`, `.toFixed(0)`, or `.toFixed(1)`. The config already has `CURRENCY_DECIMALS = 3` for KWD — it's just not being used.

## Solution
Create a single `formatPrice` helper that respects `CURRENCY_DECIMALS` and replace all hardcoded `toFixed` calls for prices across the app.

## Implementation

### 1. Add `formatAmount` to `currencyHelpers.ts`
Add a display-focused helper: `formatAmount(amount: number): string` that returns `amount.toFixed(CURRENCY_DECIMALS)` — a simple replacement for all the scattered `.toFixed(2)` calls.

### 2. Update `PriceDisplay.tsx`
Replace `.toFixed(0)` and `.toFixed(1)` with `formatAmount()`.

### 3. Update `discountHelpers.ts`
- Fix `discountedPrice` rounding from `Math.round(x * 10) / 10` to use `CURRENCY_DECIMALS`-aware rounding.
- Fix `formatPrice()` from `.toFixed(0 or 1)` to use `CURRENCY_DECIMALS`.

### 4. Update `CakeDetailPage.tsx`
Replace all `.toFixed(0)`, `.toFixed(1)`, `.toFixed(2)` price formatting with `formatAmount()`.

### 5. Update `CheckoutModal.tsx`
Replace ~15 instances of `.toFixed(2)` with `formatAmount()`.

### 6. Update `CartPage.tsx`
Replace ~7 instances of `.toFixed(2)` with `formatAmount()`.

### 7. Update `OrderPage.tsx`
Replace `.toFixed(0)`, `.toFixed(1)`, `.toFixed(2)` with `formatAmount()`.

### 8. Update `ProfilePage.tsx`
Replace `.toFixed(2) QAR` with `formatAmount()` and `DEFAULT_CURRENCY` — also fixes remaining hardcoded "QAR" strings.

### 9. Update `PaymentDetailsModal.tsx`
Already uses `formatQAR` which calls `formatCurrency` — this already respects `CURRENCY_DECIMALS`. No change needed.

### 10. Update `CheckoutPage.tsx`
Replace `.toFixed(2)` with `formatAmount()`.

## Files to modify
- `src/utils/currencyHelpers.ts` — add `formatAmount` 
- `src/components/PriceDisplay.tsx`
- `src/utils/discountHelpers.ts`
- `src/pages/CakeDetailPage.tsx`
- `src/components/CheckoutModal.tsx`
- `src/pages/CartPage.tsx`
- `src/pages/OrderPage.tsx`
- `src/pages/ProfilePage.tsx`
- `src/pages/CheckoutPage.tsx`

