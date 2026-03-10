

## Fix: Order Confirmation Emails Not Sending

### Root Cause

The `send-order-email` edge function only looks up the customer's email from `auth.users` (line 56). But most users sign up via phone, so their auth email is a temp address like `+974xxx@temp.pandacakes.qa`. The function correctly skips temp emails but never checks the **real email** stored in the `Customers.email` column.

Result: emails are never sent, even when the customer has provided a real email.

### The Fix

**File: `supabase/functions/send-order-email/index.ts`** (lines 55-75)

Change the email lookup logic to:
1. First check `auth.users` email — use it if it's real (not temp)
2. If auth email is temp or missing, fall back to `Customers.email`
3. Only skip if neither source has a real email

Replace the current logic:
```typescript
// Get customer email - check auth.users first, then fall back to Customers table
const { data: authUser } = await supabase.auth.admin.getUserById(order.customer_id);
let customerEmail = authUser?.user?.email;

// If auth email is temp or missing, check Customers table
if (!customerEmail || customerEmail.includes('@temp.pandacakes.qa')) {
  const { data: custData } = await supabase
    .from('Customers')
    .select('email')
    .eq('id', order.customer_id)
    .single();
  customerEmail = custData?.email || null;
}

// Skip if no real email found
if (!customerEmail || customerEmail.includes('@temp.pandacakes.qa')) {
  console.log('No real email found for customer:', order.customer_id);
  return new Response(
    JSON.stringify({ success: true, skipped: true, reason: 'no_email' }),
    { status: 200, headers: { ... } }
  );
}
```

**Also apply the same fix to:**
- `supabase/functions/tap-webhook/index.ts` (line 262-265) — email lookup for card payment orders
- `supabase/functions/tap-webhook-kw/index.ts` (line 268-271) — same for Kuwait card payments

### No Other Changes Needed

- The `RESEND_API_KEY` secret is already configured
- The function is already deployed and responding
- The email template HTML is fine
- The `from` address `order-noreply@pandacakes.me` is already set up

