

## Add "Use Current Location" Prompt Before Address Form

### What Changes

When the "Add New Address" dialog opens (in both `AddressManager.tsx` and `AddressSetupPage.tsx`), show a **two-step flow**:

1. **Step 1 — Location prompt**: A clean screen asking the user to share their current location, with a prominent "Use My Current Location" button and a smaller "Enter Address Manually" link below.
2. **Step 2 — Full form**: The existing address form (map, search, fields) — shown after either the location is detected or the user chooses manual entry.

### Technical Approach

**File: `src/components/AddressManager.tsx`**
- Add a `locationStep` state (`'prompt' | 'form'`), defaulting to `'prompt'` when adding a new address (skip for editing).
- In the dialog content, conditionally render:
  - **Step 1**: A centered card with a location icon, "Use My Current Location" button (triggers geolocation, then auto-advances to step 2 with coordinates pre-filled), and a "Enter Manually" text button that advances to step 2 without coordinates.
- When geolocation succeeds, set `formData.latitude/longitude` and pass `initialPosition` to `DeliveryZoneMap`, then switch to step 2.
- Reset `locationStep` to `'prompt'` in `resetForm()`.

**File: `src/pages/AddressSetupPage.tsx`**
- Same two-step pattern: show the location prompt first, then the full form.
- Add a `locationStep` state. The geolocation logic can reuse the same `navigator.geolocation.getCurrentPosition` pattern already in `DeliveryZoneMap`.
- When location is obtained, pre-fill `formData` coordinates and trigger reverse geocoding via the `DeliveryZoneMap`'s `initialPosition` prop.

### UX Details
- Step 1 shows: MapPin icon, heading "Share Your Location", description "For accurate delivery, please share your current location", a primary "Use My Current Location" button, and a muted "Enter address manually instead" link.
- If geolocation fails (denied/unavailable), show a toast and auto-advance to step 2 (manual entry).
- If geolocation succeeds, the map in step 2 will already be centered on the user's location with the pin placed and zone detected.

