-- Fix 1: Update is_redeemed flag for existing redeem transactions
UPDATE loyalty_transactions 
SET is_redeemed = true 
WHERE transaction_type = 'redeem' 
  AND country_id = 'kw' 
  AND is_redeemed = false;

-- Fix 2: Insert missing redeem transaction for KW-26MA-0005
-- Note: customer_id is NULL on this order, using the known customer from all other KW BakePoints orders
INSERT INTO loyalty_transactions (customer_id, order_id, points, transaction_type, description, country_id, is_redeemed)
VALUES (
  '5badc423-651f-4947-9d52-827a4cad009c',
  'e6c6094d-3d8b-4ed1-9439-58b1353b8e3a',
  -1000,
  'redeem',
  'Redeemed 1000 BakePoints for 2 KWD discount (backfill for KW-26MA-0005)',
  'kw',
  true
);

-- Fix 3: Replace redeem_bakepoints with concurrency-safe version using advisory lock
CREATE OR REPLACE FUNCTION public.redeem_bakepoints(
  p_customer_id uuid,
  p_points_to_redeem integer,
  p_order_id uuid,
  p_country_id text DEFAULT 'qa'
)
RETURNS TABLE(success boolean, message text, discount_amount numeric, remaining_points integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available_points integer;
  v_discount numeric;
  v_rate numeric;
  v_currency text;
  v_min_points integer;
  v_new_balance integer;
BEGIN
  -- Acquire advisory lock per customer to prevent concurrent redemptions
  PERFORM pg_advisory_xact_lock(hashtext(p_customer_id::text));

  -- Get country-specific rate
  IF p_country_id = 'kw' THEN
    v_rate := 500.0;
    v_currency := 'KWD';
    v_min_points := 500;
  ELSE
    v_rate := 50.0;
    v_currency := 'QAR';
    v_min_points := 50;
  END IF;

  -- Check minimum points
  IF p_points_to_redeem < v_min_points THEN
    RETURN QUERY SELECT false, ('Minimum redemption is ' || v_min_points || ' points')::text, 0::numeric, 0;
    RETURN;
  END IF;

  -- Get available points (sum of all non-expired transactions)
  SELECT COALESCE(SUM(points), 0)::integer INTO v_available_points
  FROM loyalty_transactions
  WHERE customer_id = p_customer_id
    AND country_id = p_country_id
    AND (is_expired = false OR is_expired IS NULL)
    AND (is_redeemed = false OR is_redeemed IS NULL OR transaction_type = 'redeem')
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_available_points < p_points_to_redeem THEN
    RETURN QUERY SELECT false, ('Insufficient points. Available: ' || v_available_points)::text, 0::numeric, v_available_points;
    RETURN;
  END IF;

  -- Calculate discount
  v_discount := ROUND(p_points_to_redeem::numeric / v_rate, 2);

  -- Insert redeem transaction
  INSERT INTO loyalty_transactions (
    customer_id, points, transaction_type, description, country_id, 
    is_redeemed, order_id
  ) VALUES (
    p_customer_id, 
    -p_points_to_redeem, 
    'redeem', 
    'Redeemed ' || p_points_to_redeem || ' BakePoints for ' || ROUND(v_discount, 2) || ' ' || v_currency || ' discount',
    p_country_id, 
    true, 
    p_order_id
  );

  -- Get new balance
  SELECT COALESCE(SUM(points), 0)::integer INTO v_new_balance
  FROM loyalty_transactions
  WHERE customer_id = p_customer_id
    AND country_id = p_country_id
    AND (is_expired = false OR is_expired IS NULL)
    AND (is_redeemed = false OR is_redeemed IS NULL OR transaction_type = 'redeem')
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN QUERY SELECT true, ('Successfully redeemed ' || p_points_to_redeem || ' points for ' || ROUND(v_discount, 2) || ' ' || v_currency)::text, v_discount, v_new_balance;
END;
$$;