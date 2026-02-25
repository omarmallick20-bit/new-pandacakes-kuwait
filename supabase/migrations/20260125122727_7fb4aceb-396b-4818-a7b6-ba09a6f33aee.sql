-- First, drop the problematic FK constraint
ALTER TABLE phone_verifications 
DROP CONSTRAINT IF EXISTS phone_verifications_user_id_fkey;

-- Delete orphan phone_verifications that don't have matching Customers
DELETE FROM phone_verifications 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM "Customers");

-- Now add FK to Customers table
ALTER TABLE phone_verifications 
ADD CONSTRAINT phone_verifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES "Customers"(id) ON DELETE CASCADE;