

## Fix "You Might Also Like" Not Showing Arabic Names

### Problem
The Supabase query on line 196 of `CakeDetailPage.tsx` does not include `name_ar` in the `.select()` clause. The display logic on line 667 already checks for `name_ar`, but the field is never fetched, so it always falls back to the English `name`.

### Fix

**File: `src/pages/CakeDetailPage.tsx`** — Line 196

Add `name_ar` to the select query:

```typescript
// Before
.select('id, name, price, image_url, category_id, description, flavors, sizes, custom_sections, additional_images, preparation_time')

// After
.select('id, name, name_ar, price, image_url, category_id, description, flavors, sizes, custom_sections, additional_images, preparation_time')
```

Single field addition, one line, one file. The display logic already handles it correctly.

