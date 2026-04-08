

## Fix Voucher Usage Tracking for All Order Types

### Root Cause

Two gaps in `createPendingOrder()` inside `CheckoutModal.tsx`:

1. **`voucher_id` is never set on the order record** — line 737-769 builds the order insert with `voucher_discount_amount` but omits `voucher_id`. This is why 9 out of 10 orders with discounts have `voucher_id = NULL`.

2. **`record_voucher_usage` is never called for cash/COD orders** — For card payments, the `tap-webhook-kw` function calls `record_voucher_usage` after payment completes. But for cash orders, `handlePaymentSuccess()` creates the order via `createPendingOrder()` and never records voucher usage. The voucher_usage table never gets a row, so the dashboard shows 0 usage.

### Fix — Single file: `src/components/CheckoutModal.tsx`

**Change 1: Add `voucher_id` to `createPendingOrder()`** (line 745, inside the orderData object)

Add after the `voucher_discount_amount` line:
```typescript
voucher_id: cartAppliedVoucher?.voucher_id || appliedVoucher?.voucher_id || null,
```

**Change 2: Record voucher usage for cash orders** (after line 998, inside the cash order branch of `handlePaymentSuccess`)

After BakePoints redemption, add voucher usage recording:
```typescript
// Record voucher usage for cash orders (card orders handle this in webhook)
const effectiveVoucherId = cartAppliedVoucher?.voucher_id || appliedVoucher?.voucher_id;
if (effectiveVoucherId && discount > 0) {
  try {
    const { error: voucherUsageError } = await supabase.rpc('record_voucher_usage', {
      p_voucher_id: effectiveVoucherId,
      p_customer_id: user.id,
      p_order_id: order.id,
      p_discount_applied: discount
    });
    if (voucherUsageError) {
      console.error('Error recording voucher usage:', voucherUsageError);
    }
  } catch (vuError) {
    console.error('Failed to record voucher usage:', vuError);
  }
}
```

### What this fixes

- All orders (card and cash) will have `voucher_id` set on the order record
- Cash/COD orders will now record usage in `voucher_usage` table
- Card orders already work (webhook handles it) but will also benefit from `voucher_id` being on the order from creation
- Dashboard usage counts will be accurate going forward
- No changes needed to edge functions or database schema

