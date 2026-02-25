-- Create table for caching Google reviews
CREATE TABLE google_reviews_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL,
  review_data jsonb NOT NULL DEFAULT '[]',
  stats_data jsonb,
  place_info jsonb,
  page_token text DEFAULT '',
  cached_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  UNIQUE(place_id, page_token)
);

-- Index for fast lookups
CREATE INDEX idx_reviews_cache_lookup ON google_reviews_cache(place_id, expires_at);

-- RLS: Anyone can read cached reviews (public data)
ALTER TABLE google_reviews_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cached reviews" 
ON google_reviews_cache FOR SELECT USING (true);

-- Allow inserts/updates for caching
CREATE POLICY "Allow cache management" 
ON google_reviews_cache FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow cache updates" 
ON google_reviews_cache FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow cache deletion" 
ON google_reviews_cache FOR DELETE USING (true);