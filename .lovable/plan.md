

## Problem

The order history list in `ProfilePage.tsx` hardcodes `DEFAULT_CURRENCY` (KWD on this deployment) for all orders. Qatar orders (QA-prefixed) incorrectly show "KWD 962.00" instead of "QAR 962.00". The invoice modal was already fixed — this is the remaining bug in the list view.

## Fix

**File: `src/pages/ProfilePage.tsx`** — 6 lines need the same pattern used in the invoice modal fix.

Replace every `{formatAmount(...)} {DEFAULT_CURRENCY}` inside the orders list with per-order currency formatting using `order.payment_currency || DEFAULT_CURRENCY` and the correct decimal places.

Add a helper at the top of the orders rendering block (or inline) that derives currency and decimals from each order:

```typescript
// Inside the orders.map callback:
const orderCurrency = order.payment_currency || DEFAULT_CURRENCY;
const orderDecimals = orderCurrency === 'KWD' ? 3 : 2;
const fmt = (amount: number) => `${amount.toFixed(orderDecimals)} ${orderCurrency}`;
```

Then replace these 6 occurrences:
- **Line 617**: Order total → `fmt(order.total_amount)`
- **Line 660**: Item price → `fmt((item.total_price || item.unit_price) ?? 0)`
- **Line 674**: Subtotal → `fmt(order.original_amount)`
- **Line 681**: Delivery fee → `fmt(order.delivery_fee)`
- **Line 688**: Voucher discount → `fmt(order.voucher_discount_amount)`
- **Line 695**: BakePoints discount → `fmt(order.bakepoints_discount_amount)`

No other files affected. The `useOrders` hook already fetches `payment_currency`.

