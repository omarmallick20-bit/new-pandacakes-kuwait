

## Fix Voucher Usage Not Being Tracked

### Root Cause

When a customer applies a voucher **inside the checkout modal** (not from the cart page), the voucher ID is never passed to the webhook. Here's why:

1. The `validate_voucher` RPC returns `voucher_id` in its response — but the code on line 629 doesn't store it
2. The local `appliedVoucher` state (line 93-98) has no `voucher_id` field
3. Both order data builders (line 881 for card, line 1757 for PaymentModal) use `cartAppliedVoucher?.voucher_id || null` — which is `null` when the voucher was applied in checkout
4. The webhook sees `voucherId: null`, skips usage recording entirely

The webhook code itself is correct — it calls `record_voucher_usage` when `voucherId` is present. The problem is purely that the voucher ID never reaches it.

### Fix — One file: `src/components/CheckoutModal.tsx`

**Change 1**: Add `voucher_id` to the local `appliedVoucher` state type (line 93-98)

```typescript
const [appliedVoucher, setAppliedVoucher] = useState<{
  code: string;
  discount_amount: number;
  final_amount: number;
  voucher_id?: string;           // ADD THIS
  applicable_products?: string[];
} | null>(null);
```

**Change 2**: Store voucher_id from validation response (line 629-634)

```typescript
setAppliedVoucher({
  code: voucherCode.trim().toUpperCase(),
  discount_amount: discountAmt,
  final_amount: subtotal - discountAmt,
  voucher_id: data.voucher_id,   // ADD THIS
  applicable_products: applicableProducts || undefined
});
```

**Change 3**: Use local voucher_id with fallback (lines 881 and 1757)

```typescript
// Before (both locations):
voucherId: cartAppliedVoucher?.voucher_id || null,

// After:
voucherId: cartAppliedVoucher?.voucher_id || appliedVoucher?.voucher_id || null,
```

### Result

- Voucher ID flows from validation response → local state → order data → webhook → `record_voucher_usage` RPC
- Both card and cash payment paths are fixed
- Cart-applied vouchers continue to work as before (first fallback)
- Dashboard will show correct usage counts going forward

