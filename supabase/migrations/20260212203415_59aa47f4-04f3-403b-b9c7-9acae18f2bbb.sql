
-- Create qatar_reviews table for permanently storing Google reviews
CREATE TABLE public.qatar_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name text NOT NULL,
  author_image text,
  rating integer NOT NULL DEFAULT 5,
  review_text_en text,
  review_text_ar text,
  review_date text,
  review_date_ar text,
  review_images jsonb DEFAULT '[]'::jsonb,
  helpful_votes integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qatar_reviews ENABLE ROW LEVEL SECURITY;

-- Public SELECT only
CREATE POLICY "Anyone can view active reviews"
  ON public.qatar_reviews
  FOR SELECT
  USING (is_active = true);
