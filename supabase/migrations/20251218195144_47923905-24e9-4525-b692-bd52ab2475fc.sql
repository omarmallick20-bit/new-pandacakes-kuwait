-- Create pending_checkouts table to store full order data during payment flow
-- This solves the Tap metadata length limit issue (must be < 1000 chars)
CREATE TABLE public.pending_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  order_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS
ALTER TABLE public.pending_checkouts ENABLE ROW LEVEL SECURITY;

-- Allow public insert/select for payment flow (edge functions use service role)
CREATE POLICY "Allow insert pending checkouts"
ON public.pending_checkouts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow select pending checkouts"
ON public.pending_checkouts
FOR SELECT
USING (true);

CREATE POLICY "Allow delete pending checkouts"
ON public.pending_checkouts
FOR DELETE
USING (true);

-- Index for faster lookups and cleanup
CREATE INDEX idx_pending_checkouts_session ON public.pending_checkouts(session_id);
CREATE INDEX idx_pending_checkouts_expires ON public.pending_checkouts(expires_at);

-- Comment
COMMENT ON TABLE public.pending_checkouts IS 'Temporary storage for checkout data during payment flow. Entries expire after 30 minutes.';