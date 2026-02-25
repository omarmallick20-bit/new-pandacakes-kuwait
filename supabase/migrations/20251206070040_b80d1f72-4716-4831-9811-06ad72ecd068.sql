-- Create wishlist_items table for persistent wishlist storage
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  product_description TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  category_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate products in same user's wishlist
  UNIQUE(customer_id, product_id)
);

-- Enable RLS
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own wishlist items
CREATE POLICY "Users can view their own wishlist items" ON public.wishlist_items
  FOR SELECT USING (customer_id = auth.uid());

-- Users can insert their own wishlist items
CREATE POLICY "Users can insert their own wishlist items" ON public.wishlist_items
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Users can delete their own wishlist items
CREATE POLICY "Users can delete their own wishlist items" ON public.wishlist_items
  FOR DELETE USING (customer_id = auth.uid());

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wishlist_items_customer_id ON public.wishlist_items(customer_id);