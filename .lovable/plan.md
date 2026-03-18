

## Updated Review System Plan

### Current State
- Edge function `fetch-and-store-reviews` fetches reviews sorted by "mostRelevant", deletes all existing reviews for the country, and replaces them entirely
- Reviews are stored in `qatar_reviews` table with `country_id` filtering
- Frontend reads from the DB (already instant loading)
- Translation uses MyMemory free API with 500ms delays between calls

### Changes Required

#### 1. Edge Function: `fetch-and-store-reviews/index.ts`

**Sort by newest instead of most relevant:**
- Change `sortBy: 'mostRelevant'` → `sortBy: 'newestFirst'` in the Serper API call
- Fetch 3 pages (60 reviews) to get 50-60 unique reviews after dedup

**Incremental upsert instead of delete-all:**
- Instead of deleting all reviews and re-inserting, check which authors already exist in the DB for that country
- Only insert genuinely new reviews (by `author_name + country_id` combo)
- New reviews get `sort_order = -1, -2, -3...` (negative = newest first) so they appear at the top
- If no new reviews found, return early with `{ new_reviews: 0 }`

**Add `fetched_at` timestamp:**
- Add a `fetched_at` column to track when each review was fetched (useful for the cron to know when last fetch happened)

**Accept `mode` parameter:**
- `mode: 'full'` — first-time setup: delete all + insert fresh 60 reviews (current behavior but sorted newest)
- `mode: 'incremental'` (default) — only add new reviews not already in DB

#### 2. Database Migration

Add `fetched_at` column to `qatar_reviews`:
```sql
ALTER TABLE qatar_reviews ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now();
```

#### 3. Cron Job (pg_cron + pg_net)

Schedule the edge function to run every 6 days for each country:
- One cron for `qa`, one for `kw`
- Calls the function with `{ "country_id": "qa", "mode": "incremental" }`
- Uses `pg_cron` + `pg_net` HTTP POST

#### 4. Frontend (`ReviewsPage.tsx`)

- Change sort order from `sort_order ascending` to `fetched_at descending, sort_order ascending` so newest reviews appear first
- No other frontend changes needed — it already reads from DB

### Flow Summary

```text
Cron (every 6 days)
  → calls fetch-and-store-reviews({ country_id, mode: "incremental" })
    → Serper API (sortBy: newestFirst, 3 pages ≈ 60 reviews)
    → Dedup against existing DB authors
    → Translate only NEW reviews to Arabic
    → Insert new reviews at top (skip if none new)
    → Return { new_reviews: N }
```

### Files to Change
1. **`supabase/functions/fetch-and-store-reviews/index.ts`** — sort by newest, incremental upsert logic
2. **DB migration** — add `fetched_at` column
3. **`src/pages/ReviewsPage.tsx`** — order by `fetched_at desc` then `sort_order asc`
4. **Cron SQL** — schedule recurring calls via `pg_cron`

