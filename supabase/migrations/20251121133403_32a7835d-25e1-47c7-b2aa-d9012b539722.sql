-- Performance optimization: Add database indexes for faster queries

-- Enable pg_trgm extension first (for fuzzy text search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for orders by customer and created_at (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_orders_customer_created 
ON orders(customer_id, created_at DESC);

-- Index for order_items by order_id (for joining order items)
CREATE INDEX IF NOT EXISTS idx_order_items_order 
ON order_items(order_id);

-- Index for cart_items by customer_id (for fetching user cart)
CREATE INDEX IF NOT EXISTS idx_cart_items_customer 
ON cart_items(customer_id);

-- Index for categories by active status and name (for category listing)
CREATE INDEX IF NOT EXISTS idx_categories_active 
ON categories(is_active, name) WHERE is_active = true;

-- Index for menu_items by category, country, and active status (for product queries)
CREATE INDEX IF NOT EXISTS idx_menu_items_category_country 
ON menu_items(category_id, country_id, is_active) WHERE is_active = true;

-- Index for menu_items name search (for search functionality)
CREATE INDEX IF NOT EXISTS idx_menu_items_name 
ON menu_items USING gin(name gin_trgm_ops);