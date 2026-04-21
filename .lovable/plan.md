

## Fix: CC to kw@pandacakes.me Stopped Working

### Diagnosis

The code is correct. The `send-order-email` function (line 216) explicitly adds `cc: [config.businessEmail]` whenever the customer has a real email address, and `kw@pandacakes.me` is hardcoded as `businessEmail` for both KW and QA configs. Triggers (`CheckoutModal.tsx` line 1023 and `tap-webhook-kw/index.ts` line 287) are firing — KW orders are being created normally (KW-26AP-0648 just placed today).

So the email IS being sent to the customer, but the CC to `kw@pandacakes.me` is being dropped. There are only 3 plausible causes:

1. **Deployed function is stale** — same root cause as the previous issue (memory note: "the deployed `send-order-email` edge function is out of sync with the codebase"). The code change adding the CC fallback may have never reached production.
2. **`kw@pandacakes.me` is on Resend's suppression list** — Resend automatically suppresses recipients (including CC addresses) after a hard bounce or spam complaint. When a CC address is suppressed, Resend silently drops it from the CC list and still delivers to the primary `to` address, so the customer keeps getting their email but the business never sees the CC. This matches the observed behaviour exactly.
3. **Resend domain/account changed** — if `RESEND_API_KEY` was rotated or the sending domain config changed, suppression state on the new account would mirror this behaviour.

### Fix Plan

**Step 1 — Force redeploy `send-order-email`** to guarantee the deployed version matches the codebase (cheap, eliminates cause #1).

**Step 2 — Check Resend suppression list for `kw@pandacakes.me`** (the most likely cause). The user must:
- Log in to Resend dashboard → Suppressions
- Search for `kw@pandacakes.me`
- If present, remove it (this restores CC delivery immediately)

I cannot do this from the sandbox — Resend suppression management is dashboard-only. I'll instruct the user clearly.

**Step 3 — Add diagnostic logging** to `send-order-email` so future drops are visible. Specifically log:
- Which `to` and `cc` addresses were sent to Resend
- The full Resend response (Resend returns the email ID even when CC is suppressed, but the dashboard will show the suppression)

**Step 4 — Add a fallback safety net**: if both `to` (customer) and `cc` (business) are set, also BCC `kw@pandacakes.me` to a backup address pattern, OR send a separate copy to the business email when the customer email is present. The cleanest approach: send TWO emails — one to the customer, one to the business — instead of using CC. This way, if Resend suppresses one address, the other still goes through and we get a separate Resend log entry per send.

### Files Changed

- `supabase/functions/send-order-email/index.ts` — split into two `resend.emails.send()` calls (one for customer, one for business), add detailed logging of each send result. Both calls run in parallel via `Promise.allSettled` so one failure doesn't block the other.

### After Deploying

I'll ask the user to:
1. Place a test KW order and check whether `kw@pandacakes.me` receives a copy
2. If still missing, check Resend dashboard → Logs for the order's email IDs and Suppressions for `kw@pandacakes.me`

