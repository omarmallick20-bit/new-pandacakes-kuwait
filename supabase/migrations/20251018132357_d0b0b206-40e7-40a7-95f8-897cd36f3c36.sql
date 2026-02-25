-- Create cart_items table for persistent cart storage
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity >= 1 AND quantity <= 5),
  unit_price numeric(10,2) NOT NULL,
  customizations jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, product_id, customizations)
);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own cart items"
  ON public.cart_items
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Users can insert their own cart items"
  ON public.cart_items
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can update their own cart items"
  ON public.cart_items
  FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can delete their own cart items"
  ON public.cart_items
  FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_cart_items_customer_id ON public.cart_items(customer_id);

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_items_updated_at();