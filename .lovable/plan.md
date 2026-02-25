

# Kuwait Deployment Conversion Plan

This plan converts the Panda Cakes project from a Qatar (qa) to Kuwait (kw) deployment. All changes are code-level only — no database schema, RLS, or function changes that would break Qatar. No changes to Terms, Privacy, Refund, Contact, or BakePoints/loyalty logic.

---

## Technical Details

### Group 1: Environment & Country Config (2 files)

**`.env`** — Change `VITE_COUNTRY_ID=qa` to `VITE_COUNTRY_ID=kw`

**`src/config/country.ts`** — Change both fallbacks from `'qa'` to `'kw'` (line 10 and line 18)

---

### Group 2: Currency Helpers — KWD with 3 Decimals (1 file + 5 consumer files)

**`src/utils/currencyHelpers.ts`** — Full rewrite:
- Import `DEFAULT_CURRENCY, DEFAULT_CURRENCY_SYMBOL` from `@/config/country`
- `CURRENCY_CODE = DEFAULT_CURRENCY` (resolves to `'KWD'`)
- `CURRENCY_SYMBOL = DEFAULT_CURRENCY_SYMBOL` (resolves to `'د.ك'`)
- KWD uses 3 decimal places (1 KWD = 1000 fils):
  - `formatCurrency`: `.toFixed(3)`
  - `roundToCurrency`: `Math.round(amount * 1000) / 1000`
  - `convertToFils`: `Math.round(amount * 1000)`
  - `convertFromFils`: `fils / 1000`
  - `validateAmount`: allow up to 3 decimal places
  - `formatCurrencyInput`: `.toFixed(3)`
  - `parseCurrencyAmount`: uses new rounding
- All old names exported as aliases for backward compatibility, OR rename all imports

**Consumer files to update imports** (`formatQAR` → `formatCurrency`):
- `src/components/PaymentModal.tsx`
- `src/components/PaymentDetailsModal.tsx`
- `src/components/RetryPaymentModal.tsx`
- `src/components/CheckoutModal.tsx` (also has `formatQAR` usage)
- `src/pages/CheckoutPage.tsx` (if applicable — need to verify)

---

### Group 3: Timezone — Asia/Kuwait (2 files + 1 consumer)

**`src/utils/timeSlots.ts`**:
- `DOHA_TIMEZONE = 'Asia/Qatar'` → `KUWAIT_TIMEZONE = 'Asia/Kuwait'`
- `getCurrentDohaTime` → `getCurrentLocalTime`
- All internal `dohaTime` → `localTime`, `blockStartDoha` → `blockStartLocal`, etc.
- All references to `DOHA_TIMEZONE` → `KUWAIT_TIMEZONE`

**`src/components/DateSelector.tsx`**:
- `DOHA_TIMEZONE = 'Asia/Qatar'` → `KUWAIT_TIMEZONE = 'Asia/Kuwait'`
- `dohaToday` → `localToday`

**`src/components/CheckoutModal.tsx`**:
- Import `getCurrentLocalTime` instead of `getCurrentDohaTime`

Note: Asia/Kuwait and Asia/Qatar are actually the same timezone (UTC+3), so functionally identical, but naming should reflect Kuwait.

---

### Group 4: Translations (1 file)

**`src/i18n/translations.ts`** — Multiple string changes:

English:
- `contact_address`: `'Barwa Village, Doha, Qatar'` → `'Kuwait'` (placeholder)
- `checkout_current_doha_time`: `'Current time in Doha:'` → `'Current time in Kuwait:'`
- `pay_amounts_qar`: `'All amounts in QAR (Qatari Riyal)'` → `'All amounts in KWD (Kuwaiti Dinar)'`
- `checkout_voucher_applied`: `'QAR {amount}'` → `'KWD {amount}'`
- `faq_delivery_a`: Replace "Qatar" references with "Kuwait", remove Qatar-specific area names (Al Khor, Al Dhahira)
- `faq_section_delivery_a`: Same — "Qatar" → "Kuwait"

Arabic:
- `contact_address`: `'قرية بروة، الدوحة، قطر'` → `'الكويت'` (placeholder)
- `checkout_current_doha_time`: `'الوقت الحالي في الدوحة:'` → `'الوقت الحالي في الكويت:'`
- `pay_amounts_qar`: `'جميع المبالغ بالريال القطري (ر.ق)'` → `'جميع المبالغ بالدينار الكويتي (د.ك)'`
- `checkout_voucher_applied`: `'ر.ق'` → `'د.ك'`
- `faq_delivery_a`: Replace "قطر" with "الكويت", remove Qatar-specific area names
- `faq_section_delivery_a`: Same

---

### Group 5: Map & Address Components (5 files)

**`src/components/AddressMapPicker.tsx`**:
- Default center: `[51.5310, 25.2854]` → `[47.9783, 29.3759]` (Kuwait City)
- Comment: "Doha, Qatar" → "Kuwait City, Kuwait"
- City fallback: `'Doha'` → `'Kuwait City'`
- Search placeholder: "Qatar" → "Kuwait"

**`src/components/DeliveryZoneMap.tsx`**:
- Default position: `[51.531, 25.2854]` → `[47.9783, 29.3759]`
- Comment: "Doha, Qatar" → "Kuwait City, Kuwait"
- Hardcoded `country: 'Qatar'` → `country: 'Kuwait'`
- City fallback: `'Doha'` → `'Kuwait City'`
- Search placeholder: "Qatar" → "Kuwait"
- Pass `country_id` to `detect-delivery-zone` edge function call

**`src/components/CompactMap.tsx`**:
- Label: `'Panda Cakes - Qatar'` → `'Panda Cakes - Kuwait'`

**`src/components/CheckoutModal.tsx`**:
- City placeholder: `'e.g., Doha, Al Rayyan'` → `'e.g., Kuwait City, Hawalli'`
- Country input value: `"Qatar"` → `"Kuwait"`

**`src/components/AddressManager.tsx`**:
- All hardcoded `country: 'Qatar'` → `country: 'Kuwait'` (lines 63, 135, 253+)

---

### Group 6: Discount Helpers (1 file)

**`src/utils/discountHelpers.ts`**:
- Import `DEFAULT_CURRENCY` from `@/config/country`
- `formatPrice` default parameter: `'QAR'` → `DEFAULT_CURRENCY`

---

### Group 7: PaymentDetailsModal currency label (1 file)

**`src/components/PaymentDetailsModal.tsx`**:
- Hardcoded `'QAR'` fallback and `'(Qatari Riyal)'` → use dynamic currency from config or from order data

---

### Group 8: index.html (1 file)

- Title: "Qatar" → "Kuwait"
- `og:title`, `twitter:title`: same
- `og:description`: "PANDA CAKES Qatar" → "PANDA CAKES Kuwait", "Doha" → "Kuwait"
- `og:site_name`: "PANDA CAKES Qatar" → "PANDA CAKES Kuwait"
- `twitter:description`: same
- Remove GTM script (GTM-MHPMX7FX is Qatar-specific). Remove both the `<script>` in `<head>` and the `<noscript>` in `<body>`.

---

### Group 9: Edge Functions — Backward-Compatible Multi-Country Support (7 functions)

All changes must keep Qatar (`'qa'`) working. The frontend already sends `country_id`/`countryId` in most request bodies.

**`supabase/functions/auth-signup/index.ts`**:
- Instead of using `SERVER_COUNTRY_ID` env var exclusively, read `country_id` from `userData` in the request body, falling back to env var, falling back to `'qa'`
- Use this dynamic country_id for `preferred_country` and `country_id` fields

**`supabase/functions/detect-delivery-zone/index.ts`**:
- Accept `country_id` from request body (alongside `latitude`/`longitude`)
- Use it in `.eq('country_id', country_id)` instead of hardcoded `'qa'`
- Default to `'qa'` if not provided
- Update Qatar bounds check to also handle Kuwait bounds (`lat 28.5-30.1`, `lng 46.5-48.5`)

**`supabase/functions/tap-create-charge/index.ts`**:
- Read `countryId` from `orderData` (already present in the interface)
- Map to currency: `{ qa: 'QAR', kw: 'KWD' }`
- Map to phone country_code: `{ qa: '974', kw: '965' }`
- Map to decimal places for rounding: `{ qa: 2, kw: 3 }`
- Update fallback URL from `pandacakes.qa` to use `req.headers.get('origin')`

**`supabase/functions/tap-webhook/index.ts`**:
- Instead of hardcoding `currency !== 'QAR'`, look up expected currency from `orderData.countryId` in pending_checkouts
- Map `{ qa: 'QAR', kw: 'KWD' }`
- Adjust amount rounding based on currency (3 decimals for KWD)

**`supabase/functions/tap-retry-payment/index.ts`**:
- Look up `country_id` from the order record
- Map to currency and phone country_code dynamically
- Adjust rounding for KWD (3 decimals)

**`supabase/functions/birthday-voucher-automation/index.ts`**:
- Remove hardcoded `COUNTRY_CODE = 'qa'`
- Process all active countries by iterating over `['qa', 'kw']` or querying the `countries` table

**`supabase/functions/voucher-manager/index.ts`**:
- Accept `country_id` from request body instead of hardcoded `'qa'`
- Default to `'qa'` if not provided

**`supabase/functions/customer-segmentation/index.ts`**:
- Accept `country_id` from request body instead of hardcoded `'qa'`
- Default to `'qa'` if not provided

Also restore `supabase/config.toml` with `verify_jwt = false` for edge functions that need it (lost in the last diff).

---

### Group 10: supabase/config.toml

Restore the function-level `verify_jwt = false` settings that were removed in the last edit, for all functions that previously had them.

---

### Summary of file count: ~20 files changed

**No changes to**: Database schema, RLS policies, database functions, Terms/Privacy/Refund pages, Contact page, BakePoints/loyalty logic, PhoneNumberInput/PopupPhoneInput (they dynamically fetch countries from DB).

