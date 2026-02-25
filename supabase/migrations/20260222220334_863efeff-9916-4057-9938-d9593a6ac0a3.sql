
-- Fix addresses table defaults: change from Kuwait to Qatar
ALTER TABLE public.addresses ALTER COLUMN country_id SET DEFAULT 'qa';
ALTER TABLE public.addresses ALTER COLUMN country SET DEFAULT 'Qatar';
