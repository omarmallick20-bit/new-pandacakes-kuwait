

## Fix Double-Counting of Item Price on Payment Success Page

### Problem
Line 380 in `PaymentSuccessPage.tsx` does:
```
(item.total_price || item.price) * (item.quantity || 1)
```

`total_price` from the `order_items` table already accounts for quantity (e.g., 2 candles at 0.500 each = 1.000 total). Multiplying by quantity again produces 2.000 — an inflated display.

The receipt confirms: `2×Number Candles Silver` = `1.000 KWD`, but the success page shows `2.000 KWD`.

### Fix

**File: `src/pages/PaymentSuccessPage.tsx`** (line 380)

Change the price display logic to:
- If `total_price` exists, use it directly (it already includes quantity)
- If only `price` exists (unit price from cart flow), multiply by quantity

```typescript
// Before
{formatQAR((item.total_price || item.price) * (item.quantity || 1))}

// After
{formatQAR(item.total_price != null ? item.total_price : (item.price * (item.quantity || 1)))}
```

Single line change, one file.

