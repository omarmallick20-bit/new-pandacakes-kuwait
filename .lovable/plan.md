

## Bug Fix: customer_id NULL and Missing BakePoints Loyalty Transactions

### Root Cause Analysis

**Bug 1 — customer_id NULL:**
- **Cash orders** (`CheckoutModal.tsx` line 727): `customer_id: user?.id` — if `user` is somehow undefined at this point, it becomes `undefined` which Supabase stores as NULL.
- **Card orders** (`CheckoutModal.tsx` line 813): `customerId: user?.id || ''` — passes empty string `''` to the edge function. The webhook (`tap-webhook-kw` line 150) then sets `customer_id: orderData.customerId` which is `''`. An empty string is not a valid UUID, which may cause Postgres to store NULL or the insert to behave unexpectedly.
- Neither flow validates that a user ID exists before proceeding.

**Bug 2 — No loyalty_transactions for BakePoints:**
- The `redeem_bakepoints` RPC function exists and works correctly (inserts into `loyalty_transactions` with negative points).
- **Cash flow** (line 963-976): Calls `redeem_bakepoints` with `p_customer_id: user?.id` — if `user?.id` is undefined, the RPC likely fails silently or with an error that's caught and swallowed.
- **Card flow** (webhook line 207-220): Calls `redeem_bakepoints` with `p_customer_id: orderData.customerId` — if customerId is empty string, the RPC fails (not a valid UUID). The error is logged but not surfaced.
- Both bugs are connected: NULL customer_id → failed BakePoints redemption.

### Fix Plan

#### 1. `src/components/CheckoutModal.tsx` — Add user validation guard

Before both cash and card payment flows, validate that `user?.id` is present. Refuse to proceed without it.

**In `handleNext()`** (around line 916): Add a guard at the top of the payment step that checks `user?.id` exists and shows an error toast if not.

**In `handleDirectCardPayment()`** (line 794): Add early return if `!user?.id`.

**In `createPendingOrder()`** (line 725): Add early throw if `!user?.id`.

#### 2. `src/components/CheckoutModal.tsx` — Fix empty string fallback

Line 813: Change `customerId: user?.id || ''` to `customerId: user!.id` (safe after guard validation above).

#### 3. `supabase/functions/tap-webhook-kw/index.ts` — Add server-side validation

After retrieving `orderData` from `pending_checkouts` (line 79), validate that `orderData.customerId` is a non-empty string before proceeding with order creation. Return an error if missing.

### Files to Change

| File | Change |
|------|--------|
| `src/components/CheckoutModal.tsx` | Add `user?.id` validation in `handleNext`, `handleDirectCardPayment`, and `createPendingOrder`. Remove `\|\| ''` fallback. |
| `supabase/functions/tap-webhook-kw/index.ts` | Add customerId validation after retrieving pending checkout data. |

No database changes needed — the `redeem_bakepoints` RPC and `loyalty_transactions` table are already correct. The bugs are purely about passing valid customer IDs through the flow.

