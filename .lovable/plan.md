

## Currency mismatch in order invoices — Root cause and fix

### Problem identified

**Two distinct issues cause incorrect currency display in `PaymentDetailsModal`:**

1. **`formatQAR()` always uses the deployment's currency (KWD)** — It calls `formatCurrency()` which appends `CURRENCY_CODE` (statically `KWD` on this deployment). So every price line in the invoice shows "X.XXX KWD" regardless of the order's actual country/currency. For a Qatari order (QAR, 2 decimals), it wrongly shows 3 decimal places + "KWD".

2. **DB default for `payment_currency` is `'QAR'`** — The `orders` table has `DEFAULT 'QAR'`. The `CheckoutModal` correctly sets `payment_currency: DEFAULT_CURRENCY` (KWD on this deployment), so new Kuwait orders are fine. But the footer line `Currency: {order.payment_currency || DEFAULT_CURRENCY}` will show the DB-stored value correctly. The real issue is that the **price formatting** above it contradicts this label.

**Net effect**: All line-item prices always say "KWD" (from `formatQAR`), but the currency label at the bottom shows whatever `payment_currency` the order actually has. For cross-country orders visible to the same customer, this creates the inversion the user reported.

### Fix approach

**Create a per-order currency formatter inside `PaymentDetailsModal`** that derives currency code and decimal places from the order's own `payment_currency` or `country_id`, rather than using the static deployment config.

**File: `src/components/PaymentDetailsModal.tsx`**

1. Add a helper function at the top of the component:
```typescript
const orderCurrency = order.payment_currency || DEFAULT_CURRENCY;
const orderDecimals = orderCurrency === 'KWD' ? 3 : 2;
const formatOrderAmount = (amount: number) => 
  `${amount.toFixed(orderDecimals)} ${orderCurrency}`;
```

2. Replace all `formatQAR(...)` calls (lines 144, 147, 155, 161, 164, 188, 194, 201, 208, 216) with `formatOrderAmount(...)`.

3. The footer currency line (line 220) already shows `order.payment_currency || DEFAULT_CURRENCY`, which will now be consistent with the formatted prices above.

### Files to modify
- `src/components/PaymentDetailsModal.tsx` — replace `formatQAR` usage with per-order formatting

### No other files affected
- `CheckoutModal.tsx` already correctly passes `payment_currency: DEFAULT_CURRENCY` at order creation
- `useOrders.ts` already fetches `payment_currency` and `country_id` from the DB
- No database changes needed

