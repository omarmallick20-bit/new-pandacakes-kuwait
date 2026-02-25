

# Fix Qatar References Still Present in Kuwait Deployment

## Root Causes Found

There are **three distinct issues** causing Qatar content to appear in the Kuwait deployment:

### Issue 1: Qatar flag emoji hardcoded in Header (line 139)
**File:** `src/components/Header.tsx` line 139
```
{t('brand_name')} 🇶🇦
```
The Qatar flag `🇶🇦` is hardcoded next to the mobile brand name. This needs to be changed to the Kuwait flag `🇰🇼`.

### Issue 2: `currencyLabel` in `useTranslation.ts` is hardcoded to QAR
**File:** `src/hooks/useTranslation.ts` line 196
```ts
const currencyLabel = language === 'ar' ? 'ر.ق' : 'QAR';
```
This is used by `PriceDisplay`, `CategoryPage`, `CakeDetailPage`, `GlobalSearchModal`, and more. It should use the dynamic values from `src/config/country.ts` (`DEFAULT_CURRENCY` / `DEFAULT_CURRENCY_SYMBOL`).

**Fix:** Import `DEFAULT_CURRENCY, DEFAULT_CURRENCY_SYMBOL` from `@/config/country` and change to:
```ts
const currencyLabel = language === 'ar' ? DEFAULT_CURRENCY_SYMBOL : DEFAULT_CURRENCY;
```
This will output `'د.ك'` (Arabic) / `'KWD'` (English) for Kuwait.

### Issue 3: Hardcoded `QAR` / `ر.ق` strings scattered across 5 files

These files have inline currency strings instead of using `currencyLabel` or `formatCurrency`:

| File | Lines | Occurrences |
|------|-------|-------------|
| `src/pages/OrderPage.tsx` | 86, 89, 94, 284, 287, 293 | 6 hardcoded `QAR`/`ر.ق` |
| `src/pages/CheckoutPage.tsx` | 516, 526, 531, 538, 543 | 5 hardcoded `QAR` |
| `src/components/CheckoutModal.tsx` | 638, 1325 | 2 hardcoded `QAR`/`ر.ق` |
| `src/components/GlobalSearchModal.tsx` | 263, 266, 272 | 3 hardcoded `QAR`/`ر.ق` |
| `src/components/CartUpsells.tsx` | 193 | 1 hardcoded `QAR`/`ر.ق` |

All of these need to be replaced with the dynamic `currencyLabel` from `useTranslation` (which will be fixed in Issue 2).

### Issue 4: BakePoints display in ProfilePage and ProfileModal still references QA
**Files:**
- `src/pages/ProfilePage.tsx` line 530: `customerProfile?.country_id === 'qa'` — this condition means KW users never see BakePoints info
- `src/components/ProfileModal.tsx` line 563: Same `=== 'qa'` check with hardcoded `50 BakePoints = 1 QAR`

These should either check for `'kw'` or use `COUNTRY_ID` from config, and display the correct rate (500 BakePoints = 1 KWD).

---

## Implementation Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/components/Header.tsx` | `🇶🇦` → `🇰🇼` on line 139 |
| 2 | `src/hooks/useTranslation.ts` | Import country config, make `currencyLabel` dynamic |
| 3 | `src/pages/OrderPage.tsx` | Replace 6 hardcoded `QAR`/`ر.ق` with `currencyLabel` |
| 4 | `src/pages/CheckoutPage.tsx` | Replace 5 hardcoded `QAR` with `currencyLabel` |
| 5 | `src/components/CheckoutModal.tsx` | Replace 2 hardcoded `QAR`/`ر.ق` with dynamic currency |
| 6 | `src/components/GlobalSearchModal.tsx` | Replace 3 hardcoded `QAR`/`ر.ق` with `currencyLabel` |
| 7 | `src/components/CartUpsells.tsx` | Replace 1 hardcoded `QAR`/`ر.ق` with `currencyLabel` |
| 8 | `src/pages/ProfilePage.tsx` | Fix `=== 'qa'` check → use `COUNTRY_ID`, update rate text |
| 9 | `src/components/ProfileModal.tsx` | Fix `=== 'qa'` check → use `COUNTRY_ID`, update rate text |

**Total: 9 files, ~25 individual string replacements.** No database or edge function changes needed — this is purely a frontend hardcoded-currency cleanup.

