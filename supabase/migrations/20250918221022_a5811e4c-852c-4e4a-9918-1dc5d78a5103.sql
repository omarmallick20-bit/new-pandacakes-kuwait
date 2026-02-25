-- Add INSERT policy for order_items table to allow customers to create order items for their own orders
CREATE POLICY "Customers can insert items for their own orders" ON "public"."order_items"
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.customer_id = auth.uid()
    )
  );