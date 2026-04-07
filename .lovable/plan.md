

## Fix Kuwait Order Emails Not Reaching kw@pandacakes.me

### Root Cause

The **deployed** `send-order-email` edge function is out of sync with the codebase. The deployed version returns `{ skipped: true, reason: "no_email" }` instead of falling back to the business email. This was identified previously but the function was never redeployed.

The codebase version is correct — it sends to `kw@pandacakes.me` either as CC (when customer has email) or as the primary recipient (when no customer email exists). No code changes needed.

### Fix

**Redeploy the `send-order-email` edge function** to sync the deployed version with the current codebase. This single action will restore all order confirmation emails to `kw@pandacakes.me`.

### What changes
- No code changes — the codebase is already correct
- One deployment action: deploy `send-order-email` edge function

