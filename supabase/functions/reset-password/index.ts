import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Time window for valid reset (10 minutes)
const RESET_WINDOW_MINUTES = 10;

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, new_password } = await req.json();

    console.log(`🔐 [reset-password] Received reset request for phone: ${phone_number}`);

    // Validate inputs
    if (!phone_number || !new_password) {
      console.error('❌ [reset-password] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Phone number and new password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password length
    if (new_password.length < 6) {
      console.error('❌ [reset-password] Password too short');
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Generate multiple phone format variants with dynamic country code splitting
    const digitsOnly = phone_number.replace(/\D/g, '');
    const withPlus = `+${digitsOnly}`;
    const withoutPlus = digitsOnly;
    const { code: countryCode, local: localNumber } = splitCountryCode(digitsOnly);
    const withSpace = `+${countryCode} ${localNumber}`;
    const withDash = `+${countryCode}-${localNumber}`;
    const last8 = digitsOnly.slice(-8);

    console.log(`📱 [reset-password] Phone formats: withPlus="${withPlus}", withSpace="${withSpace}", countryCode="${countryCode}", localNumber="${localNumber}"`);

    // Use normalized format for phone_verifications lookup
    const normalizedPhone = withPlus;

    // Check for a recently verified OTP for password reset
    const resetWindowStart = new Date(Date.now() - RESET_WINDOW_MINUTES * 60 * 1000).toISOString();
    
    const { data: verificationRecord, error: verifyError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('verified', true)
      .gte('created_at', resetWindowStart)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifyError) {
      console.error('❌ [reset-password] Error checking verification:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify reset authorization' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!verificationRecord) {
      console.warn(`⚠️ [reset-password] No valid verification found for phone: ${normalizedPhone}`);
      return new Response(
        JSON.stringify({ error: 'Reset session expired. Please verify your phone number again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [reset-password] Found valid verification record: ${verificationRecord.id}`);

    // Find the customer by phone number (check multiple formats including partial match)
    const { data: customers, error: customerError } = await supabase
      .from('Customers')
      .select('id, whatsapp_number')
      .or(`whatsapp_number.eq.${withPlus},whatsapp_number.eq.${withoutPlus},whatsapp_number.eq.${withSpace},whatsapp_number.eq.${withDash},whatsapp_number.ilike.%${last8}`)
      .order('created_at', { ascending: false })
      .limit(1);

    const customer = customers?.[0] || null;

    if (customerError || !customer) {
      console.error('❌ [reset-password] Customer not found:', customerError);
      console.log(`📱 [reset-password] Searched for: ${withPlus}, ${withoutPlus}, ${withSpace}, ${withDash}, %${localNumber}`);
      return new Response(
        JSON.stringify({ error: 'Account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [reset-password] Found customer: ${customer.id} with phone: ${customer.whatsapp_number}`);

    // CRITICAL: Verify auth user exists before attempting password update
    const { data: authUser, error: authCheckError } = await supabase.auth.admin.getUserById(customer.id);

    if (authCheckError || !authUser?.user) {
      console.error(`❌ [reset-password] No auth.users record for customer: ${customer.id}`, authCheckError);
      return new Response(
        JSON.stringify({ 
          error: 'No account found for this phone number. Please sign up first.',
          error_code: 'NO_AUTH_ACCOUNT'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [reset-password] Auth user verified. Email: ${authUser.user.email}`);

    // Update the user's password using Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      customer.id,
      { password: new_password }
    );

    if (updateError) {
      console.error('❌ [reset-password] Failed to update password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to reset password. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [reset-password] Password updated for user: ${customer.id}`);

    // Clean up verification records for this phone
    const { error: cleanupError } = await supabase
      .from('phone_verifications')
      .delete()
      .eq('phone_number', normalizedPhone);

    if (cleanupError) {
      console.warn('⚠️ [reset-password] Failed to cleanup verification records:', cleanupError);
    }

    console.log(`✅ [reset-password] Password reset complete for phone: ${normalizedPhone}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [reset-password] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
