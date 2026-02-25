

# Remaining Kuwait Conversion — Country ID Fix + Reviews

## Current State Analysis

### 1. Country ID Attachment Bug (CRITICAL)
The `auth-signup` edge function has a **mismatch** between what the frontend sends and what it reads:
- **Frontend** (`AuthContext.tsx` line 411): sends `country_id: COUNTRY_ID` at the **top level** of the request body
- **Edge function** (`auth-signup/index.ts` line 28): reads `userData?.country_id` — which is **NOT set** in `userData`
- **Result**: The edge function falls back to `SERVER_COUNTRY_ID_FALLBACK` (env var or `'qa'`), meaning **every signup from this Kuwait site currently gets tagged as `qa`**

The `AuthCallback.tsx` (OAuth/Google/Apple) correctly writes `country_id: COUNTRY_ID` directly to the Customers table (line 63, 79), so OAuth signups are fine. Only the **form-based signup** path through `auth-signup` edge function is broken.

**Fix**: Update `auth-signup/index.ts` line 28 to also check the top-level `country_id` from the request body:
```
const countryId = userData?.country_id || body_country_id || SERVER_COUNTRY_ID_FALLBACK;
```
This requires destructuring `country_id` from the request body alongside `email`, `phone`, `userData`.

This is a **backward-compatible change** — Qatar frontend sends `country_id: 'qa'` at the top level too, so both will work correctly.

### 2. Kuwait Reviews (0 reviews currently)
- The `SERPER_API_KEY` secret is configured in Supabase
- The `fetch-and-store-reviews` edge function already supports Kuwait (Place ID `ChIJud10oHuQzz8RMLZClbrsXVc`)
- The `ReviewsPage.tsx` already filters by `COUNTRY_ID` and uses the correct place ID for the "Write Review" button
- Currently 60 reviews exist for `qa`, 0 for `kw`
- **Action**: Call the edge function with `{ "country_id": "kw" }` to fetch, translate, and store Kuwait reviews

### 3. No Duplicated Kuwait Tap Functions
Confirmed: there are no `tap-kw-*` or similar duplicated functions. The existing `tap-create-charge`, `tap-webhook`, `tap-retry-payment`, and `tap-check-status` already handle multi-country dynamically. No deletion or duplication needed.

---

## Implementation Plan

### File Change: `supabase/functions/auth-signup/index.ts`
- Line 23: Destructure `country_id` from request body alongside `email`, `phone`, `userData`
- Line 28: Update to `const countryId = userData?.country_id || country_id || SERVER_COUNTRY_ID_FALLBACK;`
- This ensures the frontend's top-level `country_id: 'kw'` is used, falling back to `userData.country_id`, then env var, then `'qa'`
- Fully backward-compatible: Qatar frontend sends the same structure

### Action: Fetch Kuwait Reviews
- Call `fetch-and-store-reviews` edge function with body `{ "country_id": "kw" }`
- This will pull reviews from Google Place ID `ChIJud10oHuQzz8RMLZClbrsXVc`, translate to Arabic, and store in `qatar_reviews` table with `country_id = 'kw'`

### Total changes: 1 edge function file, 1 edge function call

