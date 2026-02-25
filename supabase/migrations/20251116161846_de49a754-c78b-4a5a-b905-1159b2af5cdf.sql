-- Add image_migrated column to track migration status
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS image_migrated boolean DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_categories_image_migrated 
ON categories(image_migrated) 
WHERE image_migrated = false;