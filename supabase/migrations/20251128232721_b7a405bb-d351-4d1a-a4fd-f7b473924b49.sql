-- Add GIN index on menu_items.category_ids for faster JSONB queries
-- This significantly improves performance when filtering menu items by category
CREATE INDEX IF NOT EXISTS idx_menu_items_category_ids 
ON menu_items USING GIN (category_ids);

-- Add comment explaining the index purpose
COMMENT ON INDEX idx_menu_items_category_ids IS 'GIN index for fast category filtering on JSONB array';
