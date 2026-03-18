

## Restructure Kuwait Address Form Fields

### Problem
The map auto-fills `street_address` and `city` fields with reverse-geocoded data, which is often inaccurate. The user wants the map used only for GPS coordinates (delivery zone detection), with all address fields manually entered.

### Changes

#### Both `src/components/AddressManager.tsx` and `src/pages/AddressSetupPage.tsx`

**1. Stop auto-filling from map:**
- In the `onLocationSelect` callback, remove `street_address` and `city` assignment from map data. Only keep `latitude`, `longitude`, `delivery_zone_id`, `delivery_fee`, `is_serviceable`.

**2. Replace form fields with new structure:**

Old fields: `building_flat` (Block and Building Details), `street_address` (Street Address), `city` (Area)

New fields (all mandatory):
- **Area** — e.g., "Salmiya, Hawalli" (replaces `city`)
- **Block** — e.g., "Block 3" (new dedicated field)
- **Street** — e.g., "Street 5, Avenue 3" (replaces `street_address`, no auto-fill)
- **House** — e.g., "House 12, Apt 4" (replaces `building_flat`)

**3. Update `formData` state shape:**
- Rename `building_flat` → `house` and add `block` field
- Update `street_address` composition on submit: `"Block ${block}, ${street}, ${house}"`
- The DB column `street_address` stays as-is (stores the concatenated string)

**4. Remove "From Map" badge** on the street field since map no longer auto-fills it.

**5. Update edit flow** (`handleEdit` in AddressManager): parsing the stored `street_address` back into fields won't be exact for old addresses, but new addresses will follow the new format.

### Files to Change
1. **`src/components/AddressManager.tsx`** — new form fields, stop auto-fill, update submit concatenation
2. **`src/pages/AddressSetupPage.tsx`** — same field changes for the setup page

