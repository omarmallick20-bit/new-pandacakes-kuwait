

## Fix: Order Date in Email Shows Wrong Day

### Problem

The email shows "Sunday, March 15, 2026" but the order was placed on March 16 (Kuwait time). The order was created at ~1:25 AM Kuwait time (UTC+3), which is ~10:25 PM UTC on March 15. Since the Edge Function formats the date using `new Date().toLocaleDateString()` without specifying a timezone, it defaults to UTC -- showing the previous day.

### Root Cause

In `supabase/functions/send-order-email/index.ts`, two date formatting calls lack a timezone:

```typescript
// Line ~170 — order date
const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

// Lines ~175-181 — scheduled time
const dt = new Date(order.estimated_delivery_time);
dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
```

### Fix

Add `timeZone: 'Asia/Qatar'` to all date/time formatting options in `send-order-email/index.ts`. Both Kuwait and Qatar are UTC+3, so `Asia/Qatar` works for both:

```typescript
const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  timeZone: 'Asia/Qatar'
});

// And for scheduled time:
dt.toLocaleDateString('en-US', {
  weekday: 'short', month: 'short', day: 'numeric',
  timeZone: 'Asia/Qatar'
})
dt.toLocaleTimeString('en-US', {
  hour: '2-digit', minute: '2-digit',
  timeZone: 'Asia/Qatar'
})
```

After editing, redeploy the Edge Function so the fix takes effect.

