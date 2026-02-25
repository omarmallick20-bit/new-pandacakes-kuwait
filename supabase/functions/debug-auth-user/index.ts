import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function splitCountryCode(digitsOnly: string): { code: string; local: string } {
  const threeCodes = ['974','971','966','965','968','973','962','961','963','964','967','970','972','880','886','960','975','976','977','992','993','994','995','996','998','212','213','216','218','351','353','358','370','371','372','373','374','375','380','381','420','421','502','503','504','505','506','507','591','592','593','595','670','673','674','675','676','677','678','679','852','853','855','856'];
  const twoCodes = ['93','94','95','98','20','27','30','31','32','33','34','36','39','40','41','43','44','45','46','47','48','49','51','52','53','54','55','56','57','58','60','61','62','63','64','65','66','81','82','84','86','90','91','92'];
  const oneCodes = ['1','7'];
  const d3 = digitsOnly.substring(0, 3);
  const d2 = digitsOnly.substring(0, 2);
  const d1 = digitsOnly.substring(0, 1);
  if (threeCodes.includes(d3)) return { code: d3, local: digitsOnly.substring(3) };
  if (twoCodes.includes(d2)) return { code: d2, local: digitsOnly.substring(2) };
  if (oneCodes.includes(d1)) return { code: d1, local: digitsOnly.substring(1) };
  return { code: d3, local: digitsOnly.substring(3) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id, phone_number } = await req.json();

    console.log(`🔍 [debug-auth-user] Checking auth for customer_id: ${customer_id}, phone: ${phone_number}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: Record<string, unknown> = {};

    // If customer_id provided, check auth.users directly
    if (customer_id) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(customer_id);
      
      results.auth_user_by_id = {
        exists: !!authUser?.user,
        email: authUser?.user?.email || null,
        phone: authUser?.user?.phone || null,
        user_metadata: authUser?.user?.user_metadata || null,
        error: authError?.message || null
      };
    }

    // If phone_number provided, check Customers table and then auth
    if (phone_number) {
      const digitsOnly = phone_number.replace(/\D/g, '');
      const withPlus = `+${digitsOnly}`;
      const withoutPlus = digitsOnly;
      const { code: countryCode, local: localNumber } = splitCountryCode(digitsOnly);
      const withSpace = `+${countryCode} ${localNumber}`;
      const last8 = digitsOnly.slice(-8);

      // Find customer by phone
      const { data: customers, error: customerError } = await supabase
        .from('Customers')
        .select('id, whatsapp_number, email, first_name, created_via_dashboard')
        .or(`whatsapp_number.eq.${withPlus},whatsapp_number.eq.${withoutPlus},whatsapp_number.eq.${withSpace},whatsapp_number.ilike.%${localNumber}`)
        .order('created_at', { ascending: false })
        .limit(5);

      results.customers_found = customers || [];
      results.customer_lookup_error = customerError?.message || null;

      // For each customer, check if auth user exists
      if (customers && customers.length > 0) {
        results.auth_status = [];
        for (const customer of customers) {
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(customer.id);
          (results.auth_status as Array<unknown>).push({
            customer_id: customer.id,
            whatsapp_number: customer.whatsapp_number,
            created_via_dashboard: customer.created_via_dashboard,
            has_auth_account: !!authUser?.user,
            auth_email: authUser?.user?.email || null,
            auth_error: authError?.message || null
          });
        }
      }

      // Check what temp email formats would be generated
      results.temp_email_formats = {
        with_plus: `${withPlus}@temp.pandacakes.qa`,
        without_plus: `${withoutPlus}@temp.pandacakes.qa`,
        with_space: `${withSpace}@temp.pandacakes.qa`,
      };
    }

    console.log(`✅ [debug-auth-user] Results:`, JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [debug-auth-user] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
