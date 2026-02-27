

# Delivery Zone & Country Validation Fixes

## Issues Found

1. **CheckoutModal `fetchUserAddresses`** (line 428-466): Fetches ALL user addresses without filtering by `country_id`. A QA user logging into KW sees their QA addresses and can select them for delivery.

2. **CompactMap pickup map** (line 27): Uses Qatar Google Maps embed URL (`pb=...25.209984...51.574197...PANDA CAKES`). The ContactPage correctly uses the Kuwait embed (`pb=...29.293500...47.906448...PANDA CAKES`).

3. **Min order value from wrong zone**: When a QA address is selected, its `delivery_zone_id` joins to a QA zone, loading QA min_order_value (e.g., 100 QAR shown as 100 KWD).

4. **No checkout validation gate**: Even if an address is non-serviceable, the UI allows proceeding if `is_serviceable` is not explicitly `false` on the stored address record.

## Implementation Plan

### 1. Filter addresses by country_id in CheckoutModal
**File:** `src/components/CheckoutModal.tsx` line 437-441

Add `.eq('country_id', COUNTRY_ID)` to the address query so only KW addresses load:
```ts
.eq('customer_id', user.id)
.eq('country_id', COUNTRY_ID)  // Only show addresses for current country
.order('is_primary', { ascending: false });
```

### 2. Filter addresses by country_id in AddressManager
**File:** `src/components/AddressManager.tsx` line 107-111

Add `.eq('country_id', COUNTRY_ID)` so profile page only shows KW addresses:
```ts
.eq('customer_id', user.id)
.eq('country_id', COUNTRY_ID)
.order('created_at', { ascending: false });
```

### 3. Fix CompactMap to use Kuwait Google Maps embed
**File:** `src/components/CompactMap.tsx` line 27

Replace the Qatar embed URL with the Kuwait one from ContactPage:
```
src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3479.6194374260135!2d47.90644827552532!3d29.293500275310365!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3fcf907ba074ddb9%3A0x575decba9542b630!2sPANDA%20CAKES!5e0!3m2!1sen!2sqa!4v1771672383039!5m2!1sen!2sqa"
```

### 4. Add checkout delivery validation gate
**File:** `src/components/CheckoutModal.tsx` in `canProceedToNext()` (line 654-677)

In the `'address'` case for delivery, validate the selected address is serviceable and belongs to a KW zone:
```ts
case 'address':
  if (isGift && (!giftRecipientName.trim() || !giftRecipientPhone.trim())) return false;
  if (fulfillmentType === 'pickup') return deliveryDate && deliveryTime;
  // For delivery: validate address is serviceable
  if (selectedAddress) {
    const addr = savedAddresses.find(a => a.id === selectedAddress);
    if (addr && addr.is_serviceable === false) return false;
    if (addr && addr.country_id && addr.country_id !== COUNTRY_ID) return false;
  }
  return (selectedAddress || (showNewAddressForm && newAddress.street_address && newAddress.city)) && deliveryDate && deliveryTime;
```

### 5. Add visual warning for non-serviceable saved addresses
**File:** `src/components/CheckoutModal.tsx` around line 1070-1090

After the address `<Select>`, show a warning if selected address is non-serviceable:
```tsx
{selectedAddressData && selectedAddressData.is_serviceable === false && (
  <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
    <p className="text-sm text-destructive font-semibold">This address is outside our delivery area</p>
    <p className="text-xs text-muted-foreground">Please select a different address or add a new one within Kuwait</p>
  </div>
)}
```

### 6. Fix BakePoints calculation ratio in CheckoutModal
**File:** `src/components/CheckoutModal.tsx` line 626

Currently hardcoded `* 50` (QA ratio). Should use `getPointsRedemptionInfo().rate`:
```ts
import { calculateDiscount, getPointsRedemptionInfo } from '@/utils/pointsDisplay';
// ...
const pointsRate = getPointsRedemptionInfo().rate; // 500 for KW
const maxRedeemablePoints = Math.floor(Math.min(availablePoints, (subtotal + deliveryFee - discount) * pointsRate) / pointsRate) * pointsRate;
```

And line 631 minimum check should use `pointsRate` instead of `50`:
```ts
if (!user || !customerProfile || maxRedeemablePoints < pointsRate) return;
```

### Summary

| # | File | Change |
|---|------|--------|
| 1 | CheckoutModal.tsx | Filter addresses by `country_id = COUNTRY_ID` |
| 2 | AddressManager.tsx | Filter addresses by `country_id = COUNTRY_ID` |
| 3 | CompactMap.tsx | Replace Qatar map embed with Kuwait embed |
| 4 | CheckoutModal.tsx | Block checkout if address not serviceable or wrong country |
| 5 | CheckoutModal.tsx | Show warning for non-serviceable selected address |
| 6 | CheckoutModal.tsx | Fix BakePoints rate from 50 (QA) to 500 (KW) |

No edge function changes needed. No database changes. Qatar functions untouched.

