

## UI change: Show "applicable items only" message when product-specific voucher has zero discount

When a product-specific voucher (like the Kuromi voucher) is applied but no eligible items are in the cart, the discount calculates to 0. Currently it shows `-QAR 0.00` which is confusing. Instead, show an informative message.

### Changes in `src/components/CheckoutModal.tsx`

**3 locations to update:**

1. **Voucher applied badge (line 1380-1382):** When `appliedVoucher.applicable_products` exists and `discount_amount === 0`, show "This voucher applies to certain items only" (Arabic: "هذه القسيمة تنطبق على منتجات معينة فقط") instead of `-QAR 0.00`.

2. **Order summary discount line (line 1522-1525):** Hide the discount row entirely when `discount_amount === 0` — no point showing a zero-value line.

3. **Toast message (line 608):** When `discountAmt === 0` and `applicableProducts` is set, show "Voucher applied — valid for certain items only" instead of "Voucher applied! Discount: 0.00".

