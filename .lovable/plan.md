## Switch category visibility to `is_active_kw` (Kuwait site)

The shared DB now has per-country flags (`is_active_kw`, `is_active_qa`, `is_active_sa`). This Kuwait deployment must filter categories by `is_active_kw = true` instead of the legacy `is_active`. `menu_items` queries stay untouched.

### Files to change (categories queries only)

1. **`src/contexts/DataContext.tsx`** (line 146–148) — main category grid loader for the home page.
   - `.select('id, name, name_ar, image_url, is_active, sort_order')` → `.select('id, name, name_ar, image_url, is_active_kw, sort_order')`
   - `.eq('is_active', true)` → `.eq('is_active_kw', true)`

2. **`src/pages/CategoryPage.tsx`** (line 102–106) — single category fetch.
   - `.select('id, name, name_ar, image_url, is_active')` → `.select('id, name, name_ar, image_url, is_active_kw')`
   - `.eq('is_active', true)` (the one on the categories query, line 105) → `.eq('is_active_kw', true)`
   - Leave the `menu_items` `.eq('is_active', true)` (line 113) untouched.
   - Update local `Category` interface field `is_active: boolean` → `is_active_kw: boolean`.

3. **`src/components/GlobalSearchModal.tsx`** (line 82–87) — category search.
   - `.eq('is_active', true)` on the categories query → `.eq('is_active_kw', true)`.
   - Leave the `menu_items` `is_active` filter (line 71) untouched.
   - Update local `Category` interface field accordingly.

4. **`src/pages/OrderPage.tsx`** (line 164) — search-mode categories query inside the `Promise.all`.
   - On `supabase.from('categories').select('*').eq('is_active', true)...` → `.eq('is_active_kw', true)`.
   - Leave the adjacent `menu_items` `is_active` filter alone.
   - Update local `Category` interface field accordingly.

### Files intentionally NOT changed

- **`src/pages/CakeDetailPage.tsx`** — fetches a single category by `id` with no `is_active` filter. No change needed.
- **`src/components/UpsellModal.tsx`** — categories query has no `is_active` filter; the `is_active` on line 76 is on `menu_items`.
- **`src/components/CartUpsells.tsx`** — categories query has no `is_active` filter.
- **`supabase/functions/migrate-category-images/`** — already deleted/temporary migration function; no runtime impact.
- All `menu_items` queries — untouched per spec.

### Notes

- `COUNTRY_ID` resolves to `'kw'` via `src/config/country.ts` (default), so hardcoding `is_active_kw` matches this deployment. Other country deployments would need their own column.
- Cache key `panda_cakes_categories_cache_v3` will be bumped to `v4` in `src/utils/categoryCache.ts` so existing browsers don't render categories the column now hides.
- The `Category` TypeScript interfaces in the four files above will be updated to expose `is_active_kw` instead of `is_active` (only used internally; not consumed anywhere meaningful besides the select list).

### Verification after deploy

- Home grid, category page, global search, and OrderPage search now only return categories where `is_active_kw = true`.
- Toggling `is_active_kw=false` on a category in the DB hides it from navigation in the KW site within the cache TTL (5 min) or after a hard refresh.
- Menu items still load by `category_id` regardless of category visibility — confirms no cascade breakage on direct cake URLs.
