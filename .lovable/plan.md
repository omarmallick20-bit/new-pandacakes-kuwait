

## Update CheckoutModal Address Form to Kuwait Format

Yes — the previous plan explicitly included `CheckoutModal.tsx` but the implementation was only applied to `AddressManager.tsx` (profile) and `AddressSetupPage.tsx` (onboarding). The checkout modal still uses the old `building_flat` + `street_address` + `city` layout.

### What needs to change

**File: `src/components/CheckoutModal.tsx`**

1. **State**: Replace `building_flat` and `street_address` fields in `newAddress` state with `area`, `block`, `street`, `house` (lines 69-77)

2. **Validation** (line ~500): Check `area`, `block`, `street`, `house` instead of `building_flat` and `street_address`

3. **Compose address for DB** (line ~531): Build `street_address` from individual fields: `"Area ${area}, Block ${block}, Street ${street}, House ${house}"`; set `city` from `area`

4. **Reset state** (line ~565): Reset the new field names

5. **Step validation** (line ~715): Update the check from `newAddress.street_address && newAddress.city` to `newAddress.area && newAddress.block`

6. **Form fields** (lines 1207-1243): Replace with Kuwait layout:
   - Area + Block side-by-side (`grid grid-cols-2 gap-2`)
   - Street (full width)
   - House (full width)
   - Landmarks (keep as-is, just translate label)
   - Country (keep as-is)

7. **Submit button disabled check** (line ~1246): Update from `!newAddress.street_address || !newAddress.city` to `!newAddress.area || !newAddress.block || !newAddress.street || !newAddress.house`

8. **Reverse geocode handler** (line ~1186): Remove the auto-fill of `street_address` and `city` from map data (per Kuwait policy — fields are always manual)

9. **Labels**: Use existing `t()` keys: `addr_area`, `addr_block`, `addr_street`, `addr_house`, `addr_landmarks`, `addr_country`

**File: `src/i18n/translations.ts`**

Add 3 keys (if not already present):
- `addr_add_new` → "Add New Address" / "إضافة عنوان جديد"
- `addr_add_new_desc` → "Add a new delivery address" / "أضف عنوان توصيل جديد"
- `addr_adding` → "Adding..." / "جاري الإضافة..."

### No other files need changes

`AddressManager.tsx`, `AddressSetupPage.tsx`, and `LocationPrompt.tsx` were already updated in the previous round.

