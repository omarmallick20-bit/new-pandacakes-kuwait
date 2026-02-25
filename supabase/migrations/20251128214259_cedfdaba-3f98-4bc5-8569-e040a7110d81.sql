-- Create category_layout_config table
CREATE TABLE category_layout_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id varchar DEFAULT 'qa',
  
  -- Mobile layout (screens < 768px)
  mobile_columns integer DEFAULT 2,
  mobile_gap integer DEFAULT 16,
  
  -- Desktop layout (screens >= 768px)
  desktop_columns integer DEFAULT 4,
  desktop_gap integer DEFAULT 24,
  
  -- Additional options
  show_category_names boolean DEFAULT true,
  card_aspect_ratio varchar DEFAULT '4/3',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add sort_order to categories
ALTER TABLE categories 
ADD COLUMN sort_order integer DEFAULT 0;

-- RLS policies for category_layout_config
ALTER TABLE category_layout_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view layout config" 
ON category_layout_config 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all INSERT on category_layout_config" 
ON category_layout_config 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all UPDATE on category_layout_config" 
ON category_layout_config 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all DELETE on category_layout_config" 
ON category_layout_config 
FOR DELETE 
USING (true);

-- Insert default configuration for Qatar
INSERT INTO category_layout_config (country_id, mobile_columns, desktop_columns, mobile_gap, desktop_gap)
VALUES ('qa', 2, 4, 16, 24);