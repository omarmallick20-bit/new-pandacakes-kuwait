

## Fix Item Sorting + Add WhatsApp Floating Icon

### Issue 1: Item Sorting Not Reflecting Properly

**Root cause**: In `CategoryPage.tsx` (line 111), the query uses an `or` filter to match items by either `category_id` or `category_ids` array. Items matched via the `category_ids` array field may have `sort_order` values set for a different primary category, causing unexpected ordering. Additionally, items with `NULL` sort_order get pushed to the end unpredictably.

**Fix**: After fetching items, apply a client-side sort as a safety net (similar to how DataContext does it for categories on line 175-178). This ensures sort_order is always respected regardless of how PostgreSQL handles NULLs with the `or` filter:

```typescript
// After line 140 in CategoryPage.tsx
const sortedItems = itemsData.sort((a, b) => {
  const orderA = a.sort_order ?? 999;
  const orderB = b.sort_order ?? 999;
  return orderA - orderB;
});
setCategoryItems(sortedItems);
```

### Issue 2: Add WhatsApp Floating Icon

**What**: Add a small floating WhatsApp button (bottom-right corner) on Order, Contact, and FAQ pages using the user's custom tiffany-blue WhatsApp icon.

**Implementation**:

1. **Copy the uploaded icon** to `src/assets/whatsapp-tiffany.png`

2. **Create a reusable `WhatsAppFloat` component** (`src/components/WhatsAppFloat.tsx`):
   - Fixed position bottom-right (bottom-6 right-6)
   - Small circular button (~48px) with the custom icon
   - Links to `https://api.whatsapp.com/send/?phone=96550018008`
   - Subtle shadow and hover scale animation

3. **Add `<WhatsAppFloat />` to**:
   - `src/pages/OrderPage.tsx`
   - `src/pages/ContactPage.tsx`
   - `src/pages/FAQsPage.tsx`

### Files changed
- `src/assets/whatsapp-tiffany.png` — new (uploaded icon)
- `src/components/WhatsAppFloat.tsx` — new component
- `src/pages/CategoryPage.tsx` — add client-side sort safety net
- `src/pages/OrderPage.tsx` — add WhatsAppFloat
- `src/pages/ContactPage.tsx` — add WhatsAppFloat
- `src/pages/FAQsPage.tsx` — add WhatsAppFloat

