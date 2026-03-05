

## Problem

The order history in `ProfileModal.tsx` (the dialog version the user actually sees) has two bugs:

1. **`getCurrencyForOrder()` in `src/utils/pointsDisplay.ts`** (line 55) is hardcoded to always return `'KWD'` regardless of country — so all orders show KWD.
2. **Line 709 of `ProfileModal.tsx`** uses `.toFixed(2)` hardcoded instead of using the correct decimal places per currency (KWD=3, QAR=2).

The `ProfilePage.tsx` was already fixed but the user sees `ProfileModal.tsx` — the modal version.

## Fix

### 1. `src/utils/pointsDisplay.ts` — Fix `getCurrencyForOrder`

```typescript
export const getCurrencyForOrder = (countryId?: string): string => {
  if (countryId === 'qa') return 'QAR';
  if (countryId === 'sa') return 'SAR';
  return 'KWD';
};
```

### 2. `src/components/ProfileModal.tsx` — Line 709

Replace:
```
{getCurrencyForOrder(order.country_id)} {order.total_amount?.toFixed(2)}
```
With dynamic formatting using `order.payment_currency` or `getCurrencyForOrder(order.country_id)`:
```typescript
{(() => {
  const cur = order.payment_currency || getCurrencyForOrder(order.country_id);
  const dec = cur === 'KWD' ? 3 : 2;
  return `${order.total_amount?.toFixed(dec)} ${cur}`;
})()}
```

Two files, two small changes. This fixes the currency display for all orders in the modal the user is actually viewing.

