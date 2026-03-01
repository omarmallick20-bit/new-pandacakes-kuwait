-- Remove qa-only guard from get_available_bakepoints
CREATE OR REPLACE FUNCTION get_available_bakepoints(
  p_customer_id UUID,
  p_country_id VARCHAR DEFAULT 'qa'
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE available_points INTEGER;
BEGIN
  SELECT COALESCE(SUM(points), 0)::INTEGER INTO available_points
  FROM loyalty_transactions
  WHERE customer_id = p_customer_id
    AND country_id = p_country_id
    AND (is_expired = false OR is_expired IS NULL)
    AND (is_redeemed = false OR is_redeemed IS NULL)
    AND (expires_at IS NULL OR expires_at > NOW());
  RETURN available_points;
END; $$;

-- Remove qa-only guard from redeem_bakepoints, use dynamic rate per country
CREATE OR REPLACE FUNCTION redeem_bakepoints(
  p_customer_id UUID, p_points_to_redeem INTEGER,
  p_order_id UUID DEFAULT NULL, p_country_id VARCHAR DEFAULT 'qa'
) RETURNS TABLE(success BOOLEAN, discount_amount NUMERIC, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_balance INTEGER;
  calculated_discount NUMERIC;
  redemption_rate INTEGER;
  currency_label TEXT;
BEGIN
  -- Set rate per country
  IF p_country_id = 'kw' THEN
    redemption_rate := 500; currency_label := 'KWD';
  ELSE
    redemption_rate := 50; currency_label := 'QAR';
  END IF;

  IF p_points_to_redeem < redemption_rate THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 0, ('Minimum redemption is ' || redemption_rate || ' BakePoints')::TEXT;
    RETURN;
  END IF;

  IF p_points_to_redeem % redemption_rate != 0 THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 0, ('BakePoints must be redeemed in multiples of ' || redemption_rate)::TEXT;
    RETURN;
  END IF;

  current_balance := get_available_bakepoints(p_customer_id, p_country_id);

  IF current_balance < p_points_to_redeem THEN
    RETURN QUERY SELECT false, 0::NUMERIC, current_balance, 'Insufficient BakePoints balance'::TEXT;
    RETURN;
  END IF;

  calculated_discount := (p_points_to_redeem::NUMERIC / redemption_rate);

  INSERT INTO loyalty_transactions (customer_id, order_id, points, transaction_type, description, country_id, is_redeemed)
  VALUES (p_customer_id, p_order_id, -p_points_to_redeem, 'redeem',
    'Redeemed ' || p_points_to_redeem || ' BakePoints for ' || calculated_discount || ' ' || currency_label || ' discount',
    p_country_id, true);

  UPDATE "Customers" SET loyalty_points = loyalty_points - p_points_to_redeem WHERE id = p_customer_id;

  RETURN QUERY SELECT true, calculated_discount, (current_balance - p_points_to_redeem), 'BakePoints redeemed successfully'::TEXT;
END; $$;