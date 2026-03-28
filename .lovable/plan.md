

## Fix Order Confirmation Emails Not Sending

### Root Cause

The **deployed** `send-order-email` edge function is out of sync with the codebase. When I tested it against a recent order (KW-26MA-0402), it returned:

```json
{ "success": true, "skipped": true, "reason": "no_email" }
```

This `skipped`/`no_email` logic does **not exist** in the current codebase version of `send-order-email/index.ts`. The codebase version correctly falls back to sending to the business email (`kw@pandacakes.me`) when no customer email is found. But the deployed version has different code that skips sending entirely when there's no customer email.

Additionally, the customer (Reem, order KW-26MA-0402) has `email: null` in the Customers table and no auth.users record found — this is a phone-signup user with no email on file. The codebase version handles this by sending to the business email instead, but the deployed version does not.

### Fix

**Redeploy `send-order-email`** — the codebase already has the correct logic:
- Line 131-134: When no customer email exists, sets `customerEmail = null`
- Line 387-388: The Resend call uses `to: customerEmail ? [customerEmail] : [config.businessEmail]` — correctly falls back to business email

Simply redeploying the function from the current codebase will restore the correct behavior. No code changes needed.

### Action
1. Deploy edge function `send-order-email` to sync the deployed version with the codebase
2. Test against a recent order to confirm emails send successfully

