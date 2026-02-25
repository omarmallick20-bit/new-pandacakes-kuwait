-- Create delivery_zones table with GeoJSON geometry support
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name TEXT NOT NULL UNIQUE,
  delivery_fee NUMERIC NOT NULL DEFAULT 10,
  delivery_time_minutes INTEGER NOT NULL DEFAULT 120,
  is_active BOOLEAN NOT NULL DEFAULT true,
  geometry JSONB NOT NULL,
  country_id VARCHAR DEFAULT 'qa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_country ON delivery_zones(country_id);

-- Add delivery zone columns to addresses table
ALTER TABLE addresses 
ADD COLUMN IF NOT EXISTS delivery_zone_id UUID REFERENCES delivery_zones(id),
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC,
ADD COLUMN IF NOT EXISTS is_serviceable BOOLEAN DEFAULT true;

-- Add delivery zone columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_zone_id UUID REFERENCES delivery_zones(id),
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;

-- Enable RLS on delivery_zones
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Anyone can view active delivery zones
CREATE POLICY "Anyone can view active delivery zones" 
ON delivery_zones 
FOR SELECT 
USING (is_active = true);

-- Staff can manage delivery zones
CREATE POLICY "Staff can manage delivery zones" 
ON delivery_zones 
FOR ALL 
USING (is_authenticated_staff())
WITH CHECK (is_authenticated_staff());

-- Insert seed data for Qatar delivery zones (simplified polygons for major areas)
-- Serviceable zones (10 QAR, 120 minutes)
INSERT INTO delivery_zones (zone_name, delivery_fee, delivery_time_minutes, is_active, geometry, country_id) VALUES
  ('Abu Hamour', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5200,25.2600],[51.5400,25.2600],[51.5400,25.2800],[51.5200,25.2800],[51.5200,25.2600]]]}', 'qa'),
  ('Abu Nakhla', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4800,25.2400],[51.5000,25.2400],[51.5000,25.2600],[51.4800,25.2600],[51.4800,25.2400]]]}', 'qa'),
  ('Al Aziziya', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5000,25.2800],[51.5200,25.2800],[51.5200,25.3000],[51.5000,25.3000],[51.5000,25.2800]]]}', 'qa'),
  ('Al Bidda', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5200,25.2900],[51.5400,25.2900],[51.5400,25.3100],[51.5200,25.3100],[51.5200,25.2900]]]}', 'qa'),
  ('Al Dafna', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5100,25.3100],[51.5300,25.3100],[51.5300,25.3300],[51.5100,25.3300],[51.5100,25.3100]]]}', 'qa'),
  ('Al Doha Al Jadeeda', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5300,25.2700],[51.5500,25.2700],[51.5500,25.2900],[51.5300,25.2900],[51.5300,25.2700]]]}', 'qa'),
  ('Al Ghanim', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4900,25.2600],[51.5100,25.2600],[51.5100,25.2800],[51.4900,25.2800],[51.4900,25.2600]]]}', 'qa'),
  ('Al Gharrafa', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4400,25.3200],[51.4600,25.3200],[51.4600,25.3400],[51.4400,25.3400],[51.4400,25.3200]]]}', 'qa'),
  ('Al Hilal', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5000,25.2500],[51.5200,25.2500],[51.5200,25.2700],[51.5000,25.2700],[51.5000,25.2500]]]}', 'qa'),
  ('Al Hitmi', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5400,25.2600],[51.5600,25.2600],[51.5600,25.2800],[51.5400,25.2800],[51.5400,25.2600]]]}', 'qa'),
  ('Al Jasra', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4700,25.2900],[51.4900,25.2900],[51.4900,25.3100],[51.4700,25.3100],[51.4700,25.2900]]]}', 'qa'),
  ('Al Kharaitiyat', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.3800,25.6700],[51.4000,25.6700],[51.4000,25.6900],[51.3800,25.6900],[51.3800,25.6700]]]}', 'qa'),
  ('Al Khessa', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4500,25.3500],[51.4700,25.3500],[51.4700,25.3700],[51.4500,25.3700],[51.4500,25.3500]]]}', 'qa'),
  ('Al Khulaifat', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5100,25.2400],[51.5300,25.2400],[51.5300,25.2600],[51.5100,25.2600],[51.5100,25.2400]]]}', 'qa'),
  ('Al Luqta', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5200,25.2500],[51.5400,25.2500],[51.5400,25.2700],[51.5200,25.2700],[51.5200,25.2500]]]}', 'qa'),
  ('Al Mansoura', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5000,25.3000],[51.5200,25.3000],[51.5200,25.3200],[51.5000,25.3200],[51.5000,25.3000]]]}', 'qa'),
  ('Al Markhiya', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4600,25.3000],[51.4800,25.3000],[51.4800,25.3200],[51.4600,25.3200],[51.4600,25.3000]]]}', 'qa'),
  ('Al Messila', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5100,25.2600],[51.5300,25.2600],[51.5300,25.2800],[51.5100,25.2800],[51.5100,25.2600]]]}', 'qa'),
  ('Al Mirqab', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5300,25.2800],[51.5500,25.2800],[51.5500,25.3000],[51.5300,25.3000],[51.5300,25.2800]]]}', 'qa'),
  ('Al Muntazah', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5200,25.2700],[51.5400,25.2700],[51.5400,25.2900],[51.5200,25.2900],[51.5200,25.2700]]]}', 'qa'),
  ('Al Nasr', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5100,25.2700],[51.5300,25.2700],[51.5300,25.2900],[51.5100,25.2900],[51.5100,25.2700]]]}', 'qa'),
  ('Al Qassar', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4800,25.2700],[51.5000,25.2700],[51.5000,25.2900],[51.4800,25.2900],[51.4800,25.2700]]]}', 'qa'),
  ('Al Rayyan', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4200,25.2800],[51.4600,25.2800],[51.4600,25.3200],[51.4200,25.3200],[51.4200,25.2800]]]}', 'qa'),
  ('Al Rufaa', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5000,25.2900],[51.5200,25.2900],[51.5200,25.3100],[51.5000,25.3100],[51.5000,25.2900]]]}', 'qa'),
  ('Al Sadd', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5000,25.2700],[51.5300,25.2700],[51.5300,25.3000],[51.5000,25.3000],[51.5000,25.2700]]]}', 'qa'),
  ('Al Sailiya', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.3500,25.2800],[51.3700,25.2800],[51.3700,25.3000],[51.3500,25.3000],[51.3500,25.2800]]]}', 'qa'),
  ('Al Sakhama', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4300,25.3400],[51.4500,25.3400],[51.4500,25.3600],[51.4300,25.3600],[51.4300,25.3400]]]}', 'qa'),
  ('Al Seej', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4900,25.3300],[51.5100,25.3300],[51.5100,25.3500],[51.4900,25.3500],[51.4900,25.3300]]]}', 'qa'),
  ('Al Thumama', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4400,25.2500],[51.4600,25.2500],[51.4600,25.2700],[51.4400,25.2700],[51.4400,25.2500]]]}', 'qa'),
  ('Al Waab', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4700,25.3100],[51.4900,25.3100],[51.4900,25.3300],[51.4700,25.3300],[51.4700,25.3100]]]}', 'qa'),
  ('Baaya', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4500,25.3300],[51.4700,25.3300],[51.4700,25.3500],[51.4500,25.3500],[51.4500,25.3300]]]}', 'qa'),
  ('Bin Mahmoud', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5300,25.2700],[51.5500,25.2700],[51.5500,25.2900],[51.5300,25.2900],[51.5300,25.2700]]]}', 'qa'),
  ('Doha Port', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5400,25.2900],[51.5600,25.2900],[51.5600,25.3100],[51.5400,25.3100],[51.5400,25.2900]]]}', 'qa'),
  ('Duhail', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4800,25.3500],[51.5200,25.3500],[51.5200,25.3900],[51.4800,25.3900],[51.4800,25.3500]]]}', 'qa'),
  ('Education City', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4200,25.3100],[51.4500,25.3100],[51.4500,25.3400],[51.4200,25.3400],[51.4200,25.3100]]]}', 'qa'),
  ('Fereej Abdul Aziz', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5100,25.2800],[51.5300,25.2800],[51.5300,25.3000],[51.5100,25.3000],[51.5100,25.2800]]]}', 'qa'),
  ('Fereej Al Ali', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5000,25.2600],[51.5200,25.2600],[51.5200,25.2800],[51.5000,25.2800],[51.5000,25.2600]]]}', 'qa'),
  ('Fereej Al Asmakh', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5100,25.2700],[51.5300,25.2700],[51.5300,25.2900],[51.5100,25.2900],[51.5100,25.2700]]]}', 'qa'),
  ('Fereej Al Manaseer', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5200,25.2800],[51.5400,25.2800],[51.5400,25.3000],[51.5200,25.3000],[51.5200,25.2800]]]}', 'qa'),
  ('Fereej Al Murra', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5000,25.2700],[51.5200,25.2700],[51.5200,25.2900],[51.5000,25.2900],[51.5000,25.2700]]]}', 'qa'),
  ('Fereej Al Nasr', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5100,25.2600],[51.5300,25.2600],[51.5300,25.2800],[51.5100,25.2800],[51.5100,25.2600]]]}', 'qa'),
  ('Fereej Al Soudan', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5200,25.2700],[51.5400,25.2700],[51.5400,25.2900],[51.5200,25.2900],[51.5200,25.2700]]]}', 'qa'),
  ('Fereej Bin Dirham', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5100,25.2800],[51.5300,25.2800],[51.5300,25.3000],[51.5100,25.3000],[51.5100,25.2800]]]}', 'qa'),
  ('Fereej Bin Mahmoud', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5300,25.2800],[51.5500,25.2800],[51.5500,25.3000],[51.5300,25.3000],[51.5300,25.2800]]]}', 'qa'),
  ('Fereej Bin Omran', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5200,25.2600],[51.5400,25.2600],[51.5400,25.2800],[51.5200,25.2800],[51.5200,25.2600]]]}', 'qa'),
  ('Fereej Kulaib', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5100,25.2500],[51.5300,25.2500],[51.5300,25.2700],[51.5100,25.2700],[51.5100,25.2500]]]}', 'qa'),
  ('Izghawa', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4800,25.3300],[51.5000,25.3300],[51.5000,25.3500],[51.4800,25.3500],[51.4800,25.3300]]]}', 'qa'),
  ('Leabaib', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.3700,25.2600],[51.3900,25.2600],[51.3900,25.2800],[51.3700,25.2800],[51.3700,25.2600]]]}', 'qa'),
  ('Legtaifiya', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4600,25.2800],[51.4800,25.2800],[51.4800,25.3000],[51.4600,25.3000],[51.4600,25.2800]]]}', 'qa'),
  ('Lusail', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5000,25.4000],[51.5400,25.4000],[51.5400,25.4400],[51.5000,25.4400],[51.5000,25.4000]]]}', 'qa'),
  ('Madinat Khalifa', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4400,25.3400],[51.4800,25.3400],[51.4800,25.3800],[51.4400,25.3800],[51.4400,25.3400]]]}', 'qa'),
  ('Msheireb', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5300,25.2850],[51.5500,25.2850],[51.5500,25.2950],[51.5300,25.2950],[51.5300,25.2850]]]}', 'qa'),
  ('Najma', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5400,25.2700],[51.5600,25.2700],[51.5600,25.2900],[51.5400,25.2900],[51.5400,25.2700]]]}', 'qa'),
  ('New Al Mirqab', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5300,25.2900],[51.5500,25.2900],[51.5500,25.3100],[51.5300,25.3100],[51.5300,25.2900]]]}', 'qa'),
  ('New Al Rayyan', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4300,25.3000],[51.4700,25.3000],[51.4700,25.3400],[51.4300,25.3400],[51.4300,25.3000]]]}', 'qa'),
  ('New Salata', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5200,25.2600],[51.5400,25.2600],[51.5400,25.2800],[51.5200,25.2800],[51.5200,25.2600]]]}', 'qa'),
  ('Nuaija', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4500,25.2700],[51.4700,25.2700],[51.4700,25.2900],[51.4500,25.2900],[51.4500,25.2700]]]}', 'qa'),
  ('Old Al Ghanim', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4900,25.2700],[51.5100,25.2700],[51.5100,25.2900],[51.4900,25.2900],[51.4900,25.2700]]]}', 'qa'),
  ('Old Al Hitmi', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5300,25.2600],[51.5500,25.2600],[51.5500,25.2800],[51.5300,25.2800],[51.5300,25.2600]]]}', 'qa'),
  ('Old Al Rayyan', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4100,25.2700],[51.4400,25.2700],[51.4400,25.3000],[51.4100,25.3000],[51.4100,25.2700]]]}', 'qa'),
  ('Old Salata', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5100,25.2500],[51.5300,25.2500],[51.5300,25.2700],[51.5100,25.2700],[51.5100,25.2500]]]}', 'qa'),
  ('Qatar University', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4800,25.3700],[51.5000,25.3700],[51.5000,25.3900],[51.4800,25.3900],[51.4800,25.3700]]]}', 'qa'),
  ('Rawdat Al Khail', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4000,25.2500],[51.4200,25.2500],[51.4200,25.2700],[51.4000,25.2700],[51.4000,25.2500]]]}', 'qa'),
  ('Rumailah', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5300,25.2750],[51.5500,25.2750],[51.5500,25.2950],[51.5300,25.2950],[51.5300,25.2750]]]}', 'qa'),
  ('The Pearl', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5300,25.3600],[51.5700,25.3600],[51.5700,25.4000],[51.5300,25.4000],[51.5300,25.3600]]]}', 'qa'),
  ('Umm Ghuwailina', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5000,25.2800],[51.5200,25.2800],[51.5200,25.3000],[51.5000,25.3000],[51.5000,25.2800]]]}', 'qa'),
  ('Umm Salal Ali', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.3900,25.4500],[51.4300,25.4500],[51.4300,25.4900],[51.3900,25.4900],[51.3900,25.4500]]]}', 'qa'),
  ('Umm Salal Mohammed', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.3700,25.4100],[51.4100,25.4100],[51.4100,25.4500],[51.3700,25.4500],[51.3700,25.4100]]]}', 'qa'),
  ('West Bay', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5200,25.3100],[51.5400,25.3100],[51.5400,25.3300],[51.5200,25.3300],[51.5200,25.3100]]]}', 'qa'),
  ('West Bay Lagoon', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.5100,25.3200],[51.5300,25.3200],[51.5300,25.3400],[51.5100,25.3400],[51.5100,25.3200]]]}', 'qa'),
  ('Wukair', 10, 120, true, '{"type":"Polygon","coordinates":[[[51.4700,25.1500],[51.5100,25.1500],[51.5100,25.1900],[51.4700,25.1900],[51.4700,25.1500]]]}', 'qa');

-- Note: Additional zones from the Excel file can be added with is_active=false for non-serviceable areas
-- This is a simplified version with major serviceable areas. More zones can be added as needed.