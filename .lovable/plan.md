

## Problem: Time Slot Stored Without Timezone, Causing +3 Hour Shift

### Root Cause

In `src/components/CheckoutModal.tsx` line 741, the `estimated_delivery_time` is constructed as:
```
`${format(deliveryDate, 'yyyy-MM-dd')}T${deliveryTime.split('-')[0]}:00`
```

For the 3-6 PM slot (`15:00-18:00`), this produces `2025-03-15T15:00:00` — a timestamp **without timezone offset**.

The `orders.estimated_delivery_time` column is `timestamp with time zone`. When PostgreSQL receives a timestamp without timezone info, it assumes UTC. So `15:00` (intended as Kuwait local time, UTC+3) gets stored as `15:00 UTC`, which equals `18:00 Kuwait time`.

When the dashboard, email, or customer-facing pages read this value back and display it, they see `18:00` (6 PM) instead of the intended `15:00` (3 PM) — exactly one slot ahead.

### Fix

**File: `src/components/CheckoutModal.tsx`** (line 741)

Append the Kuwait timezone offset (`+03:00`) to the stored timestamp so PostgreSQL interprets it correctly:

```typescript
// Before (no timezone — interpreted as UTC):
estimated_delivery_time: `${format(deliveryDate, 'yyyy-MM-dd')}T${deliveryTime.split('-')[0]}:00`

// After (explicit Kuwait offset):
estimated_delivery_time: `${format(deliveryDate, 'yyyy-MM-dd')}T${deliveryTime.split('-')[0]}:00+03:00`
```

This single change fixes the time for the customer-facing website, the email, and the dashboard simultaneously, since they all read from the same `estimated_delivery_time` column.

**Note:** Since Qatar is also UTC+3, this fix works for both countries. If a country with a different offset is added later, you would need to derive the offset from the country config. For now, `+03:00` is correct for both `kw` and `qa`.

### Secondary improvement (email + PaymentSuccessPage)

The email (`send-order-email/index.ts` line 178-183) and `PaymentSuccessPage.tsx` (lines 34-37, 434-436) currently show only the start time (e.g., "at 03:00 PM") or add a hardcoded +3 hours. After the timezone fix, the display will be correct, but consider also storing the **end time** or the full slot value (e.g., `15:00-18:00`) in a separate column or in the order data so that the time range can be displayed accurately (especially for the 9-11 PM slot which is only 2 hours, not 3).

