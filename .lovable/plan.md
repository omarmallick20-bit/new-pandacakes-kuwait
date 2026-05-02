## Make the Homepage Render Rapidly

### Root cause (confirmed via DB query)

The categories query is downloading **~2.15 MB of inlined base64 image data on every page load**. 8 categories store the entire image as a `data:image/jpeg;base64,...` string inside `categories.image_url`:

| Category | image_url size |
|---|---|
| Small Cakes | 877 KB |
| Graduation Corner | 761 KB |
| Photo Cakes | 131 KB |
| Islamic Cakes | 87 KB |
| Movies & TV Cakes | 86 KB |
| Retro Cakes | 78 KB |
| Zodiac Sign Cakes | 69 KB |
| Uniform Cakes | 67 KB |

The other 17 categories use proper hosted URLs (133 chars). On a mobile/slow connection, fetching 2 MB of JSON before the grid can render is exactly why the "Loading is taking longer than usual" banner keeps appearing at the 3 s mark.

Secondary contributors:
- `AppReadyGuard` blocks every route until **both** auth and data are ready, even though the homepage already has cached categories logic.
- `loadingTooLong` flips to true at 3 s even when partial cached data is already on screen.
- The 2 MB payload also bloats `localStorage` — `setCachedCategories` may silently fail on iOS due to quota.

### Fix

#### 1. Migrate the 8 base64 category images to Supabase Storage (biggest win)

For each of the 8 offending rows: decode the base64, upload the JPEG to the existing `category-images` storage bucket, then update `categories.image_url` to the public URL. This shrinks the categories payload from ~2.15 MB to ~5 KB (~400× smaller) and the homepage will load almost instantly.

A small one-shot script (run via `code--exec`) will:
- `select id, name, image_url from categories where image_url like 'data:%'`
- decode each base64 string, upload to `category-images/<id>.jpg`
- `update categories set image_url = '<public_url>' where id = ...`

Existing browser caches are invalidated by bumping the localStorage cache key (`panda_cakes_categories_cache_v2` → `_v3`).

#### 2. Tighten the slow-loading UX in `DataContext`

- Bump `localStorage` cache key from `_v2` to `_v3` so users immediately pick up the new lightweight URLs.
- Raise `SLOW_LOADING_THRESHOLD_MS` from 3000 ms → 6000 ms (the warning was firing prematurely on perfectly normal 3G connections).
- Don't show `loadingTooLong` when we already have stale cached categories on screen — only when the grid is actually empty.
- Reduce `FETCH_TIMEOUT_MS` for the secondary `layout_config` / `site_config` from 6 s → 4 s (they have safe defaults and shouldn't gate UI).

#### 3. Loosen `AppReadyGuard` on the public storefront

Currently every route waits for `isAuthReady && isDataReady`. Change the guard so that **as long as we have cached categories or auth is ready**, the route renders. The homepage's own skeleton handles the "still fetching" state more gracefully than a full-screen spinner.

#### 4. Add `fetchpriority="high"` and async decoding to category images

In `OrderPage`'s category grid, mark the first 4 above-the-fold category images with `fetchpriority="high"` and `decoding="async"` so the browser prioritizes them. Lazy-load the rest (already using `loading="lazy"`).

### Files changed
- `src/contexts/DataContext.tsx` — bump cache key to v3, raise slow threshold to 6 s, suppress `loadingTooLong` when cached data is visible.
- `src/utils/categoryCache.ts` — bump `CACHE_KEY` to `panda_cakes_categories_cache_v3`.
- `src/components/AppReadyGuard.tsx` — render children once auth is ready OR cached categories exist, so homepage doesn't block on cold data fetch.
- `src/pages/OrderPage.tsx` — `fetchpriority="high"` + `decoding="async"` on the first row of category cards.
- One-shot migration script (run via exec, not committed) — converts the 8 base64 `categories.image_url` rows to hosted Supabase Storage URLs.

### Expected result
Categories payload drops from ~2.15 MB to ~5 KB. Homepage first paint with images becomes near-instant on repeat visits and well under 1 s on cold loads even on 3G. The "Loading is taking longer than usual" banner will no longer appear under normal conditions.
