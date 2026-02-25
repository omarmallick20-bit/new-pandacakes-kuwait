-- Create site configuration table for Qatar website identification
CREATE TABLE public.site_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code varchar(2) NOT NULL DEFAULT 'qa',
  country_name varchar(50) NOT NULL DEFAULT 'Qatar', 
  website_name text NOT NULL DEFAULT 'Sweet Delight Qatar',
  currency_code varchar(3) NOT NULL DEFAULT 'QAR',
  currency_symbol varchar(5) NOT NULL DEFAULT 'ر.ق',
  phone_country_code varchar(5) NOT NULL DEFAULT '+974',
  default_timezone varchar(50) NOT NULL DEFAULT 'Asia/Qatar',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert Qatar website configuration
INSERT INTO public.site_config (
  country_code, country_name, website_name, currency_code, 
  currency_symbol, phone_country_code, default_timezone
) VALUES (
  'qa', 'Qatar', 'Sweet Delight Qatar', 'QAR', 
  'ر.ق', '+974', 'Asia/Qatar'
);

-- Add country association to staff table
ALTER TABLE public.staff 
ADD COLUMN country_id varchar(2) DEFAULT 'qa' NOT NULL;

-- Update existing staff records to Qatar
UPDATE public.staff SET country_id = 'qa' WHERE country_id IS NULL;

-- Add country labeling to vouchers table
ALTER TABLE public.vouchers 
ADD COLUMN country_id varchar(2) DEFAULT 'qa' NOT NULL;

-- Update existing vouchers to Qatar
UPDATE public.vouchers SET country_id = 'qa' WHERE country_id IS NULL;

-- Add country labeling to whatsapp_logs table  
ALTER TABLE public.whatsapp_logs
ADD COLUMN country_id varchar(2) DEFAULT 'qa' NOT NULL;

-- Update existing whatsapp logs to Qatar
UPDATE public.whatsapp_logs SET country_id = 'qa' WHERE country_id IS NULL;

-- Add country labeling to loyalty_transactions table
ALTER TABLE public.loyalty_transactions
ADD COLUMN country_id varchar(2) DEFAULT 'qa' NOT NULL;

-- Update existing loyalty transactions to Qatar
UPDATE public.loyalty_transactions SET country_id = 'qa' WHERE country_id IS NULL;

-- Add country labeling to addresses table
ALTER TABLE public.addresses
ADD COLUMN country_id varchar(2) DEFAULT 'qa' NOT NULL;

-- Update existing addresses to Qatar (they already have country='Qatar' but need country_id)
UPDATE public.addresses SET country_id = 'qa' WHERE country_id IS NULL;

-- Update Customers table to use country_id consistently
ALTER TABLE public."Customers"
ADD COLUMN country_id varchar(2) DEFAULT 'qa' NOT NULL;

-- Update existing customers to Qatar
UPDATE public."Customers" SET country_id = 'qa' WHERE country_id IS NULL;

-- Create indexes for efficient country-based filtering
CREATE INDEX idx_orders_country_id ON public.orders(country_id);
CREATE INDEX idx_menu_items_country_id ON public.menu_items(country_id);
CREATE INDEX idx_staff_country_id ON public.staff(country_id);
CREATE INDEX idx_vouchers_country_id ON public.vouchers(country_id);
CREATE INDEX idx_customers_country_id ON public."Customers"(country_id);
CREATE INDEX idx_addresses_country_id ON public.addresses(country_id);

-- Create country-aware function for order number generation
CREATE OR REPLACE FUNCTION public.generate_country_order_number(delivery_date timestamp with time zone, country_code varchar(2) DEFAULT 'qa')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  year_digits TEXT;
  month_abbrev TEXT;
  counter INTEGER;
  order_num TEXT;
  country_prefix TEXT;
BEGIN
  -- Set country prefix based on country code
  country_prefix := CASE country_code
    WHEN 'qa' THEN 'QA'
    WHEN 'kw' THEN 'KW'
    WHEN 'ae' THEN 'AE'
    ELSE 'PC'
  END;
  
  -- Extract year (last 2 digits) and month abbreviation from delivery date
  year_digits := TO_CHAR(delivery_date, 'YY');
  
  -- Convert month number to 3-letter abbreviation
  month_abbrev := CASE EXTRACT(MONTH FROM delivery_date)
    WHEN 1 THEN 'JAN'
    WHEN 2 THEN 'FEB'
    WHEN 3 THEN 'MAR'
    WHEN 4 THEN 'APR'
    WHEN 5 THEN 'MAY'
    WHEN 6 THEN 'JUN'
    WHEN 7 THEN 'JUL'
    WHEN 8 THEN 'AUG'
    WHEN 9 THEN 'SEP'
    WHEN 10 THEN 'OCT'
    WHEN 11 THEN 'NOV'
    WHEN 12 THEN 'DEC'
    ELSE 'UNK'
  END;
  
  -- Get the next sequential number for this country-year-month combination
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM LENGTH(country_prefix || year_digits || month_abbrev || '-') + 1) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.orders
  WHERE order_number LIKE country_prefix || year_digits || month_abbrev || '-%'
    AND country_id = country_code
    AND EXTRACT(YEAR FROM estimated_delivery_time) = EXTRACT(YEAR FROM delivery_date)
    AND EXTRACT(MONTH FROM estimated_delivery_time) = EXTRACT(MONTH FROM delivery_date);
  
  -- Format the order number: COUNTRYYYMON-XXXX (e.g., QA25JAN-0001)
  order_num := country_prefix || year_digits || month_abbrev || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN order_num;
END;
$function$;

-- Update the order number trigger to use country-aware function
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only generate order number if not already set and estimated_delivery_time is provided
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    IF NEW.estimated_delivery_time IS NOT NULL THEN
      NEW.order_number := generate_country_order_number(NEW.estimated_delivery_time, NEW.country_id);
    ELSE
      -- Fallback to current date if no delivery time specified
      NEW.order_number := generate_country_order_number(NOW(), NEW.country_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update customer segmentation function to be country-aware
CREATE OR REPLACE FUNCTION public.get_customer_segments_by_loyalty(min_points integer DEFAULT 0, country_code varchar(2) DEFAULT 'qa')
RETURNS TABLE(customer_id uuid, full_name text, whatsapp_number text, loyalty_points smallint, total_orders bigint, total_spent numeric, last_order_date timestamp with time zone, days_since_last_order integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
  LEFT JOIN orders o ON c.id = o.customer_id AND o.country_id = country_code
  WHERE c.loyalty_points >= min_points
    AND c.whatsapp_number IS NOT NULL
    AND c.country_id = country_code
  GROUP BY c.id, c.first_name, c.last_name, c.whatsapp_number, c.loyalty_points
  ORDER BY c.loyalty_points DESC, total_spent DESC;
END;
$function$;

-- Update birthday customers function to be country-aware  
CREATE OR REPLACE FUNCTION public.get_birthday_customers(days_ahead integer DEFAULT 7, country_code varchar(2) DEFAULT 'qa')
RETURNS TABLE(customer_id uuid, full_name text, whatsapp_number text, birthdate date, days_until_birthday integer, loyalty_points smallint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
    AND c.country_id = country_code
    AND EXTRACT(DAY FROM (
      DATE(EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
           EXTRACT(MONTH FROM c.birthdate) || '-' || 
           EXTRACT(DAY FROM c.birthdate)) - CURRENT_DATE
    )) BETWEEN 0 AND days_ahead
  ORDER BY days_until_birthday ASC;
END;
$function$;

-- Update birthday voucher creation to be country-aware
CREATE OR REPLACE FUNCTION public.create_birthday_vouchers(country_code varchar(2) DEFAULT 'qa')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  birthday_customer record;
  voucher_count integer := 0;
  new_voucher_code text;
BEGIN
  -- Loop through customers with birthdays this month who don't already have a birthday voucher this year
  FOR birthday_customer IN 
    SELECT c.id, c.first_name, c.whatsapp_number
    FROM "Customers" c
    WHERE EXTRACT(MONTH FROM c.birthdate) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND c.birthdate IS NOT NULL
      AND c.country_id = country_code
      AND NOT EXISTS (
        SELECT 1 FROM vouchers v 
        WHERE v.customer_id = c.id 
          AND v.voucher_type = 'birthday' 
          AND v.country_id = country_code
          AND EXTRACT(YEAR FROM v.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      )
  LOOP
    -- Generate unique voucher code
    new_voucher_code := generate_voucher_code();
    
    -- Create birthday voucher (15% discount)
    INSERT INTO vouchers (
      voucher_code,
      customer_id,
      voucher_type,
      discount_percentage,
      valid_from,
      valid_until,
      max_usage,
      country_id
    ) VALUES (
      new_voucher_code,
      birthday_customer.id,
      'birthday',
      15,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      1,
      country_code
    );
    
    -- Log WhatsApp notification for birthday voucher
    IF birthday_customer.whatsapp_number IS NOT NULL THEN
      INSERT INTO whatsapp_logs (
        customer_id,
        phone_number,
        message_type,
        message_content,
        status,
        country_id
      ) VALUES (
        birthday_customer.id,
        birthday_customer.whatsapp_number,
        'birthday_voucher',
        'Happy Birthday ' || COALESCE(birthday_customer.first_name, 'Dear Customer') || '! 🎉 Enjoy 15% off your next order with code: ' || new_voucher_code || '. Valid for 30 days.',
        'pending',
        country_code
      );
    END IF;
    
    voucher_count := voucher_count + 1;
  END LOOP;
  
  RETURN voucher_count;
END;
$function$;

-- Enable RLS on site_config table
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for site_config (readable by all, manageable by staff)
CREATE POLICY "Anyone can view site config" ON public.site_config FOR SELECT USING (true);
CREATE POLICY "Staff can manage site config" ON public.site_config FOR ALL USING (is_active_staff());

-- Create trigger for updated_at on site_config
CREATE TRIGGER update_site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();