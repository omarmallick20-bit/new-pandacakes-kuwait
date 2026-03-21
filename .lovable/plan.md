

## Fix Delivery Time Slot Storage

### Root Cause Analysis

Three issues found:

1. **Missing timezone offset in webhook functions**: The frontend (CheckoutModal line 747) correctly builds `estimated_delivery_time` with `+03:00` offset, but both `tap-webhook/index.ts` and `tap-webhook-kw/index.ts` construct it **without** the offset:
   ```
   // Webhook (BROKEN): interpreted as UTC → shifts +3h → midnight
   `${orderData.deliveryDate}T${orderData.deliveryTime.split('-')[0]}:00`
   
   // Frontend (CORRECT):
   `${format(deliveryDate, 'yyyy-MM-dd')}T${deliveryTime.split('-')[0]}:00+03:00`
   ```
   This is the direct cause of the 12:00 AM midnight issue for card payments (which go through webhooks).

2. **`delivery_time_slot` is never stored**: The human-readable slot string (e.g., `"09:00 AM - 12:00 PM"`) is never persisted. The dashboard/receipts must reverse-engineer it from a timestamp, which fails at midnight.

3. **`cake_details` doesn't include delivery scheduling info**: No `deliveryDate` or `deliveryTime` in `cake_details`, so there's no backup source.

### Changes

#### 1. `supabase/functions/tap-webhook/index.ts` — Fix timezone offset
- Line ~144: Append `+03:00` to `estimatedDeliveryTime`
- Add `delivery_time_slot` to `cake_details` from `orderData.deliveryTime`

#### 2. `supabase/functions/tap-webhook-kw/index.ts` — Same fix
- Line ~150: Append `+03:00` to `estimatedDeliveryTime`  
- Add `delivery_time_slot` to `cake_details` from `orderData.deliveryTime`

#### 3. `src/components/CheckoutModal.tsx` — Store slot in cake_details
- Add `delivery_time_slot` (the label, e.g. `"09:00 AM - 12:00 PM"`) and `deliveryTime` (the value, e.g. `"09:00-12:00"`) into `cake_details` JSON at line ~753
- Add `delivery_time_slot` to the `pending_checkouts` order data sent to webhooks (line ~854)

#### 4. Slot label resolution helper
- In CheckoutModal, look up the selected `deliveryTime` value against `generateTimeSlots()` to get the `.label` and store it as `delivery_time_slot`

### Technical Detail

```text
Card payment flow:
  CheckoutModal → pending_checkouts (orderData) → tap-webhook → orders table

COD flow:
  CheckoutModal → orders table directly

Both paths will now:
1. Store estimated_delivery_time WITH +03:00 offset
2. Include delivery_time_slot label in cake_details
3. Include raw deliveryTime value in cake_details as backup
```

### What this fixes
- Card payment orders no longer get midnight timestamps (webhook offset fix)
- Every order's `cake_details` includes `delivery_time_slot: "09:00 AM - 12:00 PM"` for dashboard/receipts
- No need to derive slot from timestamp — the original user selection is preserved

