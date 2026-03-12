

## Fix: Email Currency and Contact Details Hardcoded as Qatar

### Problem
The `supabase/functions/send-order-email/index.ts` file has:
- **"QAR" hardcoded** in 7 places (item prices, subtotal, delivery fee, VAT, voucher discount, BakePoints discount, total)
- **`.toFixed(2)` hardcoded** everywhere (KWD needs 3 decimals)
- **Qatar contact details** hardcoded (phone numbers, address, Instagram handle)
- **Qatar temp email domain** check (`@temp.pandacakes.qa`) — this may need to also check `.kw`

### Fix (single file: `supabase/functions/send-order-email/index.ts`)

1. **Derive currency and decimals from the order's `country_id`** (already stored on each order):
```typescript
const countryId = order.country_id || 'kw';
const currencyMap = { qa: 'QAR', kw: 'KWD', sa: 'SAR' };
const decimalsMap = { qa: 2, kw: 3, sa: 2 };
const currency = currencyMap[countryId] || 'KWD';
const decimals = decimalsMap[countryId] || 3;
const fmt = (amount: number) => `${amount.toFixed(decimals)} ${currency}`;
```

2. **Replace all 7 hardcoded `QAR` occurrences** with `fmt(amount)` calls.

3. **Make contact details country-aware**:
   - KW: WhatsApp/phone for Kuwait branch, Kuwait address, `@pandacakes.kw` Instagram
   - QA: Keep existing Qatar details as fallback

4. **Update temp email check** to handle both `@temp.pandacakes.qa` and `@temp.pandacakes.kw`.

5. **Update pickup location** from "Barwa Village, Doha, Qatar" to the correct Kuwait location for KW orders.

6. **Deploy** the updated edge function.

