

## Order Email Not Sending — Root Cause Analysis

### What I found

**The `send-order-email` function works perfectly** — I tested it live just now against order KW-26MA-0164 and it returned success with a Resend email ID. The function itself is not broken.

**The problem is that it's not being called in most order flows:**

1. **Cash orders (COD)** — Email IS sent from `CheckoutModal.tsx` line 987 via `supabase.functions.invoke('send-order-email', ...)`. This path works.

2. **Card orders** — Email is supposed to be sent from `tap-webhook-kw/index.ts` line 269 via `fetch()`. However, the webhook logs are completely empty — meaning the webhook is either:
   - Not being called by Tap at all (misconfigured webhook URL)
   - Failing silently before reaching the email send line
   - The webhook is creating the order but the email call is failing silently

3. **Card orders from frontend** — When `handlePaymentSuccess` runs for card payments (line 952-960), it does NOT send any email. It only fetches the order number. The email sending (line 986-989) is inside the `else` block, which only runs for cash/free orders.

### The gap

For card payments, the **only** place the email is triggered is inside `tap-webhook-kw`. If the webhook doesn't run or fails, no email is sent. The frontend `handlePaymentSuccess` for card orders does not have a fallback email send.

### Fix

Add a fallback email send for card orders in the frontend `handlePaymentSuccess`, after the card payment branch (around line 960). This ensures that even if the webhook's email call fails, the customer still gets a confirmation.

### Files to change

1. **`src/components/CheckoutModal.tsx`** — Add `send-order-email` invocation for card orders in `handlePaymentSuccess`, after line 960 (outside the else block, so it fires for ALL order types).

### What this looks like

Move the `send-order-email` call outside the cash-only `else` block so it fires for every successful order (cash, card, and free). This is safe because the email is idempotent — sending a duplicate confirmation is better than sending none.

