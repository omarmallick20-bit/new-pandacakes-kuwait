

## Issue: Stale Cache Preventing Arabic Category Names

The code changes from the previous edit are correct — the database has Arabic names populated, and the rendering logic uses `(language === 'ar' && category.name_ar) || category.name` in all relevant places.

**Root cause**: The localStorage cache (`panda_cakes_categories_cache`) and in-memory cache in `DataContext.tsx` store category objects from before the migration. These cached objects don't have `name_ar`, so the fallback `|| category.name` always shows English. The cache has a 5-minute TTL, but if users keep refreshing within that window, they keep getting stale data.

### Fix

**Clear the stale category cache on app load** by adding a one-time cache version bump:

**File: `src/utils/categoryCache.ts`**
- Add a `CACHE_VERSION` constant (e.g., `2`)
- Store the version alongside cached data
- On read, if the stored version doesn't match, discard the cache

This is a small change (about 10 lines) that ensures all users pick up the new `name_ar` field immediately without waiting for TTL expiry.

Alternatively, a simpler approach: just bump the `CACHE_KEY` from `'panda_cakes_categories_cache'` to `'panda_cakes_categories_cache_v2'`, which instantly invalidates all existing caches.

