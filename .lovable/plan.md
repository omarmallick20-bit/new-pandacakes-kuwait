

## Update Review System — Kuwait Only

### Changes

#### 1. Edge Function (`supabase/functions/fetch-and-store-reviews/index.ts`)

- Change `sortBy: 'mostRelevant'` → `sortBy: 'newestFirst'` to fetch newest reviews
- Accept `mode` param: `'full'` (delete all + re-insert) or `'incremental'` (default, only add new)
- In incremental mode: query existing `author_name` values for `country_id='kw'`, skip already-stored authors, only translate and insert new ones
- New reviews get negative `sort_order` values so they appear at the top
- Add `fetched_at: new Date().toISOString()` to each inserted row

#### 2. Frontend (`src/pages/ReviewsPage.tsx`)

- Change sort order from `sort_order ascending` → `fetched_at descending, sort_order ascending` so newest reviews show first
- This is a Kuwait-only deployment (`COUNTRY_ID = 'kw'`), so no conditional logic needed

#### 3. Cron Setup (SQL migration)

Provide a `pg_cron` + `pg_net` schedule to call the edge function every 6 days for Kuwait:
```sql
SELECT cron.schedule(
  'fetch-reviews-kw',
  '0 3 */6 * *',
  $$SELECT net.http_post(
    url := 'https://qlffjhyciwabyzolzdjb.supabase.co/functions/v1/fetch-and-store-reviews',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <service_role_key>"}'::jsonb,
    body := '{"country_id":"kw","mode":"incremental"}'::jsonb
  )$$
);
```

No DB migration needed — the `fetched_at` column already exists on `qatar_reviews`.

### Files to Change
1. `supabase/functions/fetch-and-store-reviews/index.ts` — newest sort, incremental upsert, mode param
2. `src/pages/ReviewsPage.tsx` — order by `fetched_at desc`

