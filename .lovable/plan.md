

## Update Checkout Page Address Form to Match Kuwait Format

You're correct — the address layout changes were only applied to `AddressManager.tsx` (profile) and `AddressSetupPage.tsx` (onboarding), but **not** to the checkout page's "Add New Address" dialog in `src/pages/CheckoutPage.tsx`.

The checkout form currently has:
- "Block and Building Details" (single field combining block + building)
- "Street Address" (textarea)
- "Area" + "Near Landmarks" (side-by-side)
- "Country"

### Plan

**File: `src/pages/CheckoutPage.tsx`**

1. Add `useTranslation` import and call `const { t } = useTranslation()` in the component
2. Replace the current address fields with the Kuwait format: **Area → Block → Street → House**, with Area and Block side-by-side
3. Update the `newAddress` state to use `area`, `block`, `street`, `house` fields instead of `building_flat` + `street_address`
4. Update `handleAddNewAddress` to compose `street_address` from the individual fields (e.g., `Block ${block}, ${street}, ${house}`)
5. Replace all hardcoded English strings in the dialog with `t()` calls:
   - "Add New Address" → `t('addr_add_new')`
   - "Add a new delivery address" → `t('addr_add_new_desc')`
   - Labels, placeholders, buttons (Cancel, Add Address, Adding...)
   - Map button text, error messages
6. Keep the Landmarks and Country fields as-is (just translate labels)

### Field layout (matching profile form)
```
[Area          ] [Block         ]   ← grid-cols-2
[Street                        ]   ← full width
[House                         ]   ← full width
[Landmarks (Optional)          ]   ← full width
[Country (disabled)            ]   ← full width
```

### Translation keys needed (already exist from previous work)
- `addr_area`, `addr_block`, `addr_street`, `addr_house`
- `addr_landmarks`, `addr_country`, `addr_label`, `addr_label_placeholder`
- `addr_map_label`, `addr_outside_zone`
- `addr_cancel`, `addr_add_new` (new), `addr_add_new_desc` (new), `addr_adding` (new)

Will add 3 new translation keys to `src/i18n/translations.ts`:
- `addr_add_new` → "Add New Address" / "إضافة عنوان جديد"
- `addr_add_new_desc` → "Add a new delivery address for this order" / "أضف عنوان توصيل جديد لهذا الطلب"
- `addr_adding` → "Adding..." / "جاري الإضافة..."

