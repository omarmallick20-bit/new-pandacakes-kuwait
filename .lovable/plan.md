

# Kuwait Tap Payment Functions + Menu Filtering

## Problem Summary
1. The existing Tap payment edge functions (`tap-create-charge`, `tap-webhook`, `tap-retry-payment`, `tap-check-status`) use `TAP_SECRET_KEY` — which is the **Qatar** key. Kuwait has its own Tap account with secrets `TAP_SECRET_KUWAIT_KEY` and `TAP_PUBLIC_KUWAIT_KEY` (visible in the screenshot). These secrets need to be added to Supabase first.
2. The Kuwait merchant ID is `2096036` (Qatar is `27353015`).
3. Menu items are already filtered by `country_id = COUNTRY_ID` in CategoryPage, CakeDetailPage, and GlobalSearchModal — this is working correctly.
4. Categories table has no `country_id` column, so categories themselves cannot be filtered. Only the cakes within them are filtered.
5. The frontend calls to Tap functions need to be switched to the `-kw` variants for this Kuwait deployment.

## Implementation Plan

### Step 1: Add Kuwait Tap Secrets to Supabase
Two secrets need to be added:
- `TAP_SECRET_KUWAIT_KEY` — the Kuwait Tap secret key
- `TAP_PUBLIC_KUWAIT_KEY` — the Kuwait Tap publishable key

The user's screenshot confirms these exist. I will use the secrets tool to request them.

### Step 2: Create 4 Duplicated Edge Functions (Kuwait-only)

Each is a copy of the Qatar original, with two changes:
- Uses `Deno.env.get('TAP_SECRET_KUWAIT_KEY')` instead of `TAP_SECRET_KEY`
- Uses merchant ID `2096036` instead of `27353015`

**`supabase/functions/tap-create-charge-kw/index.ts`**
- Exact copy of `tap-create-charge/index.ts`
- Line 65: `TAP_SECRET_KEY` → `TAP_SECRET_KUWAIT_KEY`
- Line 138: merchant id `27353015` → `2096036`
- Line 115: webhook URL points to `tap-webhook-kw`

**`supabase/functions/tap-webhook-kw/index.ts`**
- Exact copy of `tap-webhook/index.ts`
- Line 41: `TAP_SECRET_KEY` → `TAP_SECRET_KUWAIT_KEY`
- No merchant ID in webhook (it verifies charges, doesn't create them)

**`supabase/functions/tap-retry-payment-kw/index.ts`**
- Exact copy of `tap-retry-payment/index.ts`
- Line 33: `TAP_SECRET_KEY` → `TAP_SECRET_KUWAIT_KEY`
- Line 99: merchant id `27353015` → `2096036`
- Line 83: webhook URL points to `tap-webhook-kw`

**`supabase/functions/tap-check-status-kw/index.ts`**
- Exact copy of `tap-check-status/index.ts`
- Line 33: `TAP_SECRET_KEY` → `TAP_SECRET_KUWAIT_KEY`

### Step 3: Add Config.toml Entries
Add `verify_jwt = false` for all 4 new functions:
```toml
[functions.tap-create-charge-kw]
verify_jwt = false

[functions.tap-webhook-kw]
verify_jwt = false

[functions.tap-check-status-kw]
verify_jwt = false

[functions.tap-retry-payment-kw]
verify_jwt = false
```

### Step 4: Update Frontend to Call `-kw` Functions
4 files reference Tap function names:

**`src/components/CheckoutModal.tsx`** (line 821):
- `'tap-create-charge'` → `'tap-create-charge-kw'`

**`src/components/PaymentModal.tsx`** (line 165):
- `'tap-create-charge'` → `'tap-create-charge-kw'`

**`src/components/RetryPaymentModal.tsx`** (line 59):
- `'tap-retry-payment'` → `'tap-retry-payment-kw'`

**`src/pages/PaymentSuccessPage.tsx`** (line 125):
- `'tap-check-status'` → `'tap-check-status-kw'`

### Step 5: Menu Item Filtering (Already Done)
Verified that all menu item queries already filter by `country_id = COUNTRY_ID`:
- `src/pages/CategoryPage.tsx` line 111: `.eq('country_id', COUNTRY_ID)` ✅
- `src/pages/CakeDetailPage.tsx` line 113: `.eq('country_id', COUNTRY_ID)` ✅
- `src/pages/CakeDetailPage.tsx` line 197: `.eq('country_id', COUNTRY_ID)` ✅
- `src/components/GlobalSearchModal.tsx` line 69: `.eq('country_id', COUNTRY_ID)` ✅

Categories don't have a `country_id` column — they are shared across countries. Only the menu items within them are filtered. If a category has zero `kw` items, the user will see an empty "Coming Soon" state, which is the correct behavior.

### Summary

| Change | Files |
|--------|-------|
| Add 2 secrets | `TAP_SECRET_KUWAIT_KEY`, `TAP_PUBLIC_KUWAIT_KEY` |
| 4 new edge functions | `tap-create-charge-kw`, `tap-webhook-kw`, `tap-retry-payment-kw`, `tap-check-status-kw` |
| Config entries | `supabase/config.toml` (4 new entries) |
| Frontend function calls | `CheckoutModal.tsx`, `PaymentModal.tsx`, `RetryPaymentModal.tsx`, `PaymentSuccessPage.tsx` |
| Menu filtering | Already correct — no changes needed |

**Qatar functions are completely untouched.** The `-kw` functions are independent copies with their own API keys and merchant ID.

