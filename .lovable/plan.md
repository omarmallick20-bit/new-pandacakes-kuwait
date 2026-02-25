

# Kuwait Conversion — Remaining Items

After reviewing the entire codebase, here is what has already been done and what still needs to be implemented.

## Already Done (No Changes Needed)
- `.env` → `VITE_COUNTRY_ID=kw`
- `src/config/country.ts` → fallback to `'kw'`, KWD config with 3 decimals
- `src/utils/currencyHelpers.ts` → dynamic currency, KWD 3-decimal support, backward aliases
- `src/utils/timeSlots.ts` → `Asia/Kuwait` timezone, `getCurrentLocalTime` with alias
- `src/utils/discountHelpers.ts` → dynamic `DEFAULT_CURRENCY`
- `src/i18n/translations.ts` → Kuwait strings
- `src/components/AddressMapPicker.tsx` → Kuwait City center
- `src/components/DeliveryZoneMap.tsx` → Kuwait City center, passes `country_id`
- `src/components/CompactMap.tsx` → "Panda Cakes - Kuwait"
- `src/pages/AddressSetupPage.tsx` → `value="Kuwait"`
- `src/components/PaymentDetailsModal.tsx` → dynamic currency
- `index.html` → Kuwait title, OG tags, GTM removed
- `src/components/DateSelector.tsx` → Kuwait timezone
- `src/components/AuthCallback.tsx` → uses `COUNTRY_ID` for country_id
- `src/contexts/AuthContext.tsx` → sends `COUNTRY_ID` in signup
- All edge functions → multi-country support (auth-signup, detect-delivery-zone, tap-create-charge, tap-webhook, tap-retry-payment, birthday-voucher-automation, voucher-manager, customer-segmentation)
- `supabase/config.toml` → `verify_jwt = false` restored
- Reviews page → already filters by `COUNTRY_ID` and uses correct place ID for "Write Review" button
- No Kuwait-specific duplicated tap functions exist (they were already cleaned up or never created)

## Still Needs Implementation

### 1. Phone Number Default: `+974` → `+965` (2 files)
**`src/components/PhoneNumberInput.tsx` (line 50)**
- `useState<string>('+974')` → `useState<string>(PHONE_COUNTRY_CODE)`
- Import `PHONE_COUNTRY_CODE` from `@/config/country`

**`src/components/PopupPhoneInput.tsx` (line 50)**
- `useState('+974')` → `useState(PHONE_COUNTRY_CODE)`
- Import `PHONE_COUNTRY_CODE` from `@/config/country`

### 2. Hardcoded `"Qatar"` in address forms (2 files, 5 locations)
**`src/pages/CheckoutPage.tsx`**
- Line 60: `country: 'Qatar'` → `country: COUNTRY_NAME`
- Line 148: `country: 'Qatar'` → `country: COUNTRY_NAME`
- Line 167: `country: 'Qatar'` → `country: COUNTRY_NAME`
- Line 658: `value="Qatar"` → `value={COUNTRY_NAME}`
- Import `COUNTRY_NAME` from `@/config/country`

**`src/components/CheckoutModal.tsx` (line 1171)**
- `value="Qatar"` → `value={COUNTRY_NAME}` (already imports `COUNTRY_NAME`)

**`src/components/AddressManager.tsx` (line 559)**
- `value="Qatar"` → `value={COUNTRY_NAME}` (already imports `COUNTRY_NAME` or add import)

### 3. DataContext: site_config query not filtered by country (1 file)
**`src/contexts/DataContext.tsx`**
- Line 81-82: Default `currency_code: 'QAR'` → `currency_code: DEFAULT_CURRENCY` and `currency_symbol: DEFAULT_CURRENCY_SYMBOL`
- Line 265: Add `.eq('country_code', COUNTRY_ID)` to the `site_config` query so it fetches the Kuwait row
- Import `COUNTRY_ID, DEFAULT_CURRENCY, DEFAULT_CURRENCY_SYMBOL` from `@/config/country`

### 4. Fetch Kuwait Reviews (one-time action)
Call the `fetch-and-store-reviews` edge function with `{ "country_id": "kw" }` to pull Google reviews for the Kuwait store (Place ID: `ChIJud10oHuQzz8RMLZClbrsXVc`), translate them to Arabic, and store them permanently. Currently the `qatar_reviews` table has 0 rows with `country_id = 'kw'`.

### Summary
- **5 files** need code changes (PhoneNumberInput, PopupPhoneInput, CheckoutPage, CheckoutModal, AddressManager, DataContext)
- **1 edge function call** needed to fetch Kuwait reviews
- No edge function code changes needed
- No database changes needed
- No duplicated Kuwait tap functions to delete (none exist)

