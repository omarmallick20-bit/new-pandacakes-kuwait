-- Create time_slot_blocks table for staff control over availability
CREATE TABLE public.time_slot_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id VARCHAR REFERENCES countries(id) DEFAULT 'qa',
  
  -- Block a specific date, optionally with specific time slot
  block_date DATE NOT NULL,
  time_slot VARCHAR NULL,  -- NULL = entire day blocked, otherwise specific slot like '09:00-12:00'
  
  -- Metadata
  reason TEXT,  -- e.g., "Holiday", "Staff shortage", "Maintenance"
  created_by UUID NULL,  -- Optional reference to staff member
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique blocks per country/date/slot combination
  UNIQUE (country_id, block_date, time_slot)
);

-- Enable Row Level Security
ALTER TABLE public.time_slot_blocks ENABLE ROW LEVEL SECURITY;

-- Staff can manage time slot blocks (for external dashboard)
CREATE POLICY "Staff can manage time slot blocks" 
ON public.time_slot_blocks
FOR ALL 
USING (is_authenticated_staff())
WITH CHECK (is_authenticated_staff());

-- Public can read active blocks (needed for frontend to check availability)
CREATE POLICY "Anyone can view active time slot blocks" 
ON public.time_slot_blocks
FOR SELECT 
USING (is_active = true);

-- Allow public insert/update/delete for external dashboard (same pattern as categories)
CREATE POLICY "Allow all INSERT on time_slot_blocks"
ON public.time_slot_blocks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow all UPDATE on time_slot_blocks"
ON public.time_slot_blocks
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all DELETE on time_slot_blocks"
ON public.time_slot_blocks
FOR DELETE
USING (true);

-- Create index for efficient date range queries
CREATE INDEX idx_time_slot_blocks_date ON public.time_slot_blocks (block_date, is_active);
CREATE INDEX idx_time_slot_blocks_country ON public.time_slot_blocks (country_id, block_date);