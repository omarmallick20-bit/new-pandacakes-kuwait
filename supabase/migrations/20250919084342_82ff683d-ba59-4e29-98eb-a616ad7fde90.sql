-- =========================================
-- STEP 2: ADD ANALYTICS FUNCTIONS AND VIEWS
-- Plus fix security warnings
-- =========================================

-- Analytics Views
-- =========================================

-- Orders with customer details view
CREATE OR REPLACE VIEW orders_with_customer_details AS
SELECT 
  o.*,
  c.first_name,
  c.last_name,
  c.whatsapp_number,
  c.loyalty_points,
  c.birthdate,
  a.street_address,
  a.city,
  a.state,
  a.country,
  a.latitude,
  a.longitude
FROM orders o
LEFT JOIN "Customers" c ON o.customer_id = c.id
LEFT JOIN addresses a ON o.delivery_address_id = a.id;

-- Recent orders view (last 3 hours priority)
CREATE OR REPLACE VIEW recent_orders AS
SELECT 
  o.*,
  c.first_name,
  c.last_name,
  c.whatsapp_number,
  EXTRACT(EPOCH FROM (NOW() - o.created_at))/3600 as hours_ago
FROM orders o
LEFT JOIN "Customers" c ON o.customer_id = c.id
WHERE o.created_at >= NOW() - INTERVAL '3 hours'
  AND o.status = ANY(ARRAY['pending'::order_status, 'confirmed'::order_status, 'preparing'::order_status])
ORDER BY o.created_at DESC;

-- Menu with category details view
CREATE OR REPLACE VIEW menu_with_categories AS
SELECT 
  m.*,
  c.name as category_name,
  c.image_url as category_image_url
FROM menu_items m
LEFT JOIN categories c ON m.category_id = c.id
WHERE m.is_active = true
ORDER BY c.name, m.sort_order, m.name;

-- Analytics Functions (with proper search_path security)
-- =========================================

-- Get orders by period function
CREATE OR REPLACE FUNCTION get_orders_by_period(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS TABLE(
  order_count bigint,
  total_revenue numeric,
  avg_order_value numeric,
  top_customer_id uuid,
  top_customer_name text,
  top_customer_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH order_stats AS (
    SELECT 
      COUNT(*) as order_count,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as avg_order_value
    FROM orders 
    WHERE created_at BETWEEN start_date AND end_date
  ),
  top_customer AS (
    SELECT 
      o.customer_id,
      c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
      COUNT(*) as customer_orders
    FROM orders o
    LEFT JOIN "Customers" c ON o.customer_id = c.id
    WHERE o.created_at BETWEEN start_date AND end_date
    GROUP BY o.customer_id, c.first_name, c.last_name
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT 
    os.order_count,
    os.total_revenue,
    os.avg_order_value,
    tc.customer_id,
    tc.customer_name,
    tc.customer_orders
  FROM order_stats os
  CROSS JOIN top_customer tc;
END;
$$;

-- Get recent urgent orders function
CREATE OR REPLACE FUNCTION get_recent_urgent_orders()
RETURNS TABLE(
  id uuid,
  order_number text,
  customer_name text,
  whatsapp_number text,
  status order_status,
  total_amount numeric,
  created_at timestamp with time zone,
  hours_ago numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.order_number,
    c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
    c.whatsapp_number,
    o.status,
    o.total_amount,
    o.created_at,
    EXTRACT(EPOCH FROM (NOW() - o.created_at))/3600 as hours_ago
  FROM orders o
  LEFT JOIN "Customers" c ON o.customer_id = c.id
  WHERE o.created_at >= NOW() - INTERVAL '3 hours'
    AND o.status = ANY(ARRAY['pending'::order_status, 'confirmed'::order_status, 'preparing'::order_status])
  ORDER BY o.created_at DESC;
END;
$$;

-- Customer segmentation function
CREATE OR REPLACE FUNCTION get_customer_segments_by_loyalty(min_points integer DEFAULT 0)
RETURNS TABLE(
  customer_id uuid,
  full_name text,
  whatsapp_number text,
  loyalty_points smallint,
  total_orders bigint,
  total_spent numeric,
  last_order_date timestamp with time zone,
  days_since_last_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as customer_id,
    c.first_name || ' ' || COALESCE(c.last_name, '') as full_name,
    c.whatsapp_number,
    c.loyalty_points,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    MAX(o.created_at) as last_order_date,
    COALESCE(EXTRACT(DAY FROM (NOW() - MAX(o.created_at)))::integer, 999) as days_since_last_order
  FROM "Customers" c
  LEFT JOIN orders o ON c.id = o.customer_id
  WHERE c.loyalty_points >= min_points
    AND c.whatsapp_number IS NOT NULL
  GROUP BY c.id, c.first_name, c.last_name, c.whatsapp_number, c.loyalty_points
  ORDER BY c.loyalty_points DESC, total_spent DESC;
END;
$$;

-- Birthday customers function
CREATE OR REPLACE FUNCTION get_birthday_customers(days_ahead integer DEFAULT 7)
RETURNS TABLE(
  customer_id uuid,
  full_name text,
  whatsapp_number text,
  birthdate date,
  days_until_birthday integer,
  loyalty_points smallint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as customer_id,
    c.first_name || ' ' || COALESCE(c.last_name, '') as full_name,
    c.whatsapp_number,
    c.birthdate,
    EXTRACT(DAY FROM (
      DATE(EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
           EXTRACT(MONTH FROM c.birthdate) || '-' || 
           EXTRACT(DAY FROM c.birthdate)) - CURRENT_DATE
    ))::integer as days_until_birthday,
    c.loyalty_points
  FROM "Customers" c
  WHERE c.birthdate IS NOT NULL
    AND c.whatsapp_number IS NOT NULL
    AND EXTRACT(DAY FROM (
      DATE(EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
           EXTRACT(MONTH FROM c.birthdate) || '-' || 
           EXTRACT(DAY FROM c.birthdate)) - CURRENT_DATE
    )) BETWEEN 0 AND days_ahead
  ORDER BY days_until_birthday ASC;
END;
$$;

-- Order status transition function
CREATE OR REPLACE FUNCTION update_order_status(
  order_id_param uuid,
  new_status order_status,
  staff_notes_param text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status order_status;
  valid_transition boolean := false;
BEGIN
  -- Get current status
  SELECT status INTO current_status 
  FROM orders 
  WHERE id = order_id_param;
  
  IF current_status IS NULL THEN
    RETURN false;
  END IF;
  
  -- Define valid status transitions
  valid_transition := CASE 
    WHEN current_status = 'pending'::order_status AND new_status = ANY(ARRAY['confirmed'::order_status, 'cancelled'::order_status]) THEN true
    WHEN current_status = 'confirmed'::order_status AND new_status = ANY(ARRAY['preparing'::order_status, 'cancelled'::order_status]) THEN true
    WHEN current_status = 'preparing'::order_status AND new_status = ANY(ARRAY['ready'::order_status, 'cancelled'::order_status]) THEN true
    WHEN current_status = 'ready'::order_status AND new_status = ANY(ARRAY['out_for_delivery'::order_status, 'completed'::order_status, 'cancelled'::order_status]) THEN true
    WHEN current_status = 'out_for_delivery'::order_status AND new_status = ANY(ARRAY['completed'::order_status, 'cancelled'::order_status]) THEN true
    ELSE false
  END;
  
  IF NOT valid_transition THEN
    RETURN false;
  END IF;
  
  -- Update the order
  UPDATE orders 
  SET 
    status = new_status,
    staff_notes = COALESCE(staff_notes_param, staff_notes),
    updated_at = NOW()
  WHERE id = order_id_param;
  
  RETURN true;
END;
$$;

-- Voucher validation function
CREATE OR REPLACE FUNCTION validate_voucher(
  voucher_code_param text,
  customer_id_param uuid,
  order_amount numeric
)
RETURNS TABLE(
  is_valid boolean,
  discount_amount numeric,
  discount_percentage integer,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  voucher_record record;
BEGIN
  SELECT * INTO voucher_record
  FROM vouchers 
  WHERE voucher_code = voucher_code_param;
  
  -- Check if voucher exists
  IF voucher_record IS NULL THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher code not found';
    RETURN;
  END IF;
  
  -- Check if voucher is expired
  IF voucher_record.valid_until < CURRENT_DATE THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher has expired';
    RETURN;
  END IF;
  
  -- Check if voucher is not yet valid
  IF voucher_record.valid_from > CURRENT_DATE THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher is not yet valid';
    RETURN;
  END IF;
  
  -- Check usage limits
  IF voucher_record.usage_count >= voucher_record.max_usage THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher usage limit exceeded';
    RETURN;
  END IF;
  
  -- Check customer eligibility (allow NULL customer_id for public vouchers)
  IF voucher_record.customer_id IS NOT NULL AND voucher_record.customer_id != customer_id_param THEN
    RETURN QUERY SELECT false, 0::numeric, 0, 'Voucher not valid for this customer';
    RETURN;
  END IF;
  
  -- Voucher is valid, return discount info
  RETURN QUERY SELECT 
    true, 
    voucher_record.discount_amount, 
    voucher_record.discount_percentage,
    'Voucher is valid'::text;
END;
$$;

-- Fix existing functions to have proper search_path security
-- =========================================

-- Update existing functions that were flagged by security linter
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_num TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
  INTO counter
  FROM orders
  WHERE order_number LIKE 'PC' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '%';
  
  order_num := 'PC' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD(counter::TEXT, 3, '0');
  RETURN order_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  voucher_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    voucher_code := 'PC' || UPPER(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM vouchers WHERE voucher_code = generate_voucher_code.voucher_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN voucher_code;
END;
$$;