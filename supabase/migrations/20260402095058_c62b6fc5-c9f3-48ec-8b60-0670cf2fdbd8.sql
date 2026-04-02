ALTER TABLE phone_verifications 
  DROP CONSTRAINT IF EXISTS phone_verifications_user_id_fkey;

ALTER TABLE phone_verifications 
  ADD CONSTRAINT phone_verifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;