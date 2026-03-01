

## Problem: Product-specific vouchers apply discount to entire cart

The voucher `PCWAX73D` has `applicable_products` set to two Kuromi cake IDs, but the discount is applied to the **entire cart subtotal** instead of only those specific items. Two layers are broken:

1. **Database function `validate_voucher`**: Completely ignores the `applicable_products` column. It validates the voucher and returns `discount_percentage`/`discount_amount` without any product filtering.

2. **Frontend `CheckoutModal.tsx` (line 586-588)**: Calculates discount as `subtotal * percentage / 100` — applying it to the full cart regardless.

Neither layer knows which cart items match the voucher's product list.

## Fix

### 1. Database: Return `applicable_products` from `validate_voucher`

Add `applicable_products` as a new OUT parameter to `validate_voucher` so the frontend knows which products the discount applies to.

**Migration**: `ALTER` the function to add `applicable_products uuid[]` as an output, populated from `voucher_record.applicable_products`.

### 2. Frontend: Calculate discount only on matching items

**`src/components/CheckoutModal.tsx`** — After validation succeeds (line 584-594):

- If `data.applicable_products` is non-null and non-empty, sum only the cart items whose `item.cake.id` is in the list
- Apply the discount percentage/amount to that subset total, not the full `subtotal`
- Store the `applicable_products` array in the `appliedVoucher` state so the order summary can show which items are discounted

### 3. Store applicable_products in appliedVoucher state

Update the `appliedVoucher` state type to include `applicable_products?: string[]`, and pass it through to the order data so the webhook/backend can also apply the discount correctly per-item.

### Files to modify
- New SQL migration: add `applicable_products` OUT parameter to `validate_voucher`
- `src/components/CheckoutModal.tsx`: product-filtered discount calculation

