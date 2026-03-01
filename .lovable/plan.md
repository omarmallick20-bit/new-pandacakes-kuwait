

## Problem: Two bugs preventing KW voucher validation

### Bug 1: `COUNTRY_CODE` scope error in edge function
`COUNTRY_CODE` is declared as a `const` inside the `serve()` handler (line 22), but the helper functions `validateVoucher`, `applyVoucher`, `createVoucher`, `createBirthdayVouchers`, and `getCustomerVouchers` reference it as if it were a global. This causes a `ReferenceError` at runtime — voucher validation silently fails.

### Bug 2: Frontend doesn't send `country_id`
`CheckoutModal.tsx` line 572-578 calls the `voucher-manager` function without passing `country_id`. Even if Bug 1 were fixed, the edge function would default to `'qa'`, so a KW voucher like `PCQQARSH` would never match.

---

## Fix

### 1. Edge function: Pass `country_code` as parameter to all helper functions

**`supabase/functions/voucher-manager/index.ts`**

- Add `country_code: string` parameter to all 5 helper functions
- Pass `COUNTRY_CODE` from the handler into each function call
- Replace all references to the out-of-scope `COUNTRY_CODE` with the function parameter

### 2. Frontend: Send `country_id` in voucher validation call

**`src/components/CheckoutModal.tsx`**

- Import `COUNTRY_ID` from `@/config/country`
- Add `country_id: COUNTRY_ID` to the request body at line 572-578

### Files to modify
- `supabase/functions/voucher-manager/index.ts` — fix scoping bug
- `src/components/CheckoutModal.tsx` — pass `country_id`

