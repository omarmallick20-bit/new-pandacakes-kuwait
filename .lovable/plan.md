

## Plan: Fix Order Confirmation Email — Single Email, CC to kw@pandacakes.me, No Supabase/Lovable Branding

### Current Situation

1. **`send-order-email`** uses Resend API to send from `order-noreply@pandacakes.me` — this is your custom domain, no Supabase/Lovable branding involved. The email content is fully custom HTML with Panda Cakes branding. This is correct and clean.

2. **Tap Payments** (`tap-webhook` and `tap-webhook-kw`) does NOT send its own emails. It only calls your `send-order-email` function after creating an order. So there is no duplicate email from Tap itself. However, Tap's dashboard may have receipt emails enabled — that would need to be disabled in your Tap Payments merchant dashboard directly (not something controllable from code).

3. **Triggers**: The `send-order-email` function is called from 3 places:
   - `CheckoutModal.tsx` — for cash orders
   - `tap-webhook/index.ts` — for QA card payments
   - `tap-webhook-kw/index.ts` — for KW card payments
   
   Each only fires once per order, so only one email per order.

### What Needs to Change

**File: `supabase/functions/send-order-email/index.ts`** (line 159)

Change the `to` field from:
```typescript
to: [customerEmail],
```
To send to both the customer AND a copy to `kw@pandacakes.me`:
```typescript
to: [customerEmail],
cc: ['kw@pandacakes.me'],
```

This sends one email to the customer with a CC copy to `kw@pandacakes.me`. Both receive the same confirmation.

**Also**: If the customer has no email (skipped case), we should still send the order details to `kw@pandacakes.me` so the business always gets notified. Update the "skip" logic to send to `kw@pandacakes.me` even when no customer email exists.

### About Tap Payments Receipts

If you're seeing duplicate emails, Tap Payments may be sending its own payment receipts from their side. This is configured in your **Tap Payments merchant dashboard** under notification/receipt settings — you'd need to disable "customer receipt emails" there. This cannot be controlled from code.

### Summary

| Change | Detail |
|--------|--------|
| Add CC to business email | `cc: ['kw@pandacakes.me']` on every order confirmation |
| Send to business even when no customer email | Always notify `kw@pandacakes.me` |
| Redeploy `send-order-email` | Single function update + deploy |

No changes needed to `tap-webhook` or `tap-webhook-kw` — they already correctly delegate to `send-order-email`.

