-- Add phone_verified column to Customers table
ALTER TABLE "Customers" 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Create phone_verifications table for OTP storage
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user ON phone_verifications(user_id);

-- Enable RLS
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own verification records
CREATE POLICY "Users can view own verifications" ON phone_verifications
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Allow insert for authenticated users
CREATE POLICY "Users can insert verifications" ON phone_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Allow update for authenticated users on their own records
CREATE POLICY "Users can update own verifications" ON phone_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Allow delete for authenticated users on their own records
CREATE POLICY "Users can delete own verifications" ON phone_verifications
  FOR DELETE USING (auth.uid() = user_id);