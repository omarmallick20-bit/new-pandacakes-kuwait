-- Fix existing KW customers who have wrong country_id
-- These are customers with +965 phone code but country_id defaulted to 'qa'
UPDATE "Customers" 
SET country_id = 'kw', preferred_country = 'kw'
WHERE phone_country_code = '+965' 
  AND (country_id = 'qa' OR country_id IS NULL);