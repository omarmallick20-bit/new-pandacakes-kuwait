

## Changes

### 1. Label renames (all address forms)

| Current | New |
|---------|-----|
| Building No. & Flat Number * | Block and Building Details * |
| City | Area |

**Files:** `src/pages/AddressSetupPage.tsx`, `src/pages/CheckoutPage.tsx`, `src/components/AddressManager.tsx`, `src/components/CheckoutModal.tsx`

Update placeholder text accordingly (e.g., "e.g., Block 3, Building 45" instead of "e.g., Building 123, Flat 4A"; "e.g., Salmiya, Hawalli" instead of "e.g., Kuwait City, Hawalli").

### 2. Hide zone name from customer view

**File:** `src/components/DeliveryZoneMap.tsx` (line 616-618)

Remove the `Zone: {deliveryZone.zone_name}` paragraph from the delivery info shown to the customer. The zone data remains stored in state and passed to the database — only the UI display line is removed.

