

## Move "X% off" badge from category page header to category cards on menu page

### Current behavior
- `CategoryPage.tsx` computes `maxDiscountPercentage` from enriched items and shows a banner at the top
- `OrderPage.tsx` shows category cards with no discount info

### Approach

**1. Remove discount banner from CategoryPage** (lines 290-306 in `CategoryPage.tsx`)
Delete the entire IIFE block that computes `maxDiscountPercentage` and renders the badge.

**2. Add category-level discount data to OrderPage**

The `item_discounts` table stores `applicable_products` (product IDs) but not category IDs. To determine which categories have discounts, we need to resolve product → category mapping.

**New hook: `useCategoryDiscounts`** (or extend existing logic in OrderPage)
- Fetch active `item_discounts` for current country (reuse same query pattern as `useItemDiscounts`)
- Collect all discounted product IDs
- Query `menu_items` for just `id, category_id` where `id` is in that product set
- Build a `Map<categoryId, maxDiscountPercentage>`

This is lightweight — only fetches two small result sets, no full menu item data.

**3. Render badge on category cards in OrderPage**

On each category card (line ~369-382), overlay a `DiscountBadge` component (already exists) on the category image when the category has active discounts.

### Files to modify
- `src/pages/CategoryPage.tsx` — remove discount banner block
- `src/pages/OrderPage.tsx` — add category discount lookup + render badge on cards
- Optionally extract the lookup into a small hook for cleanliness

### No backend changes needed
All data is already available via existing tables (`item_discounts` + `menu_items`).

