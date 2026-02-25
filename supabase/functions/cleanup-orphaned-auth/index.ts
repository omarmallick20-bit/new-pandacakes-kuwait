import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { temp_email } = await req.json();

    if (!temp_email) {
      return new Response(
        JSON.stringify({ error: 'temp_email is required', cleaned: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[cleanup-orphaned-auth] Checking for orphaned auth user:', temp_email);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Find auth user by email using our DB function (getUserByEmail doesn't exist in supabase-js)
    const { data: authUserId, error: lookupError } = await supabase
      .rpc('get_auth_user_id_by_email', { email_input: temp_email });

    if (lookupError || !authUserId) {
      console.log('[cleanup-orphaned-auth] No auth user found for:', temp_email, lookupError?.message);
      return new Response(
        JSON.stringify({ cleaned: false, reason: 'no_auth_user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[cleanup-orphaned-auth] Found auth user:', authUserId);

    // 2. Check if a Customers row exists for this auth user
    const { data: customer, error: customerError } = await supabase
      .from('Customers')
      .select('id')
      .eq('id', authUserId)
      .maybeSingle();

    if (customerError) {
      console.error('[cleanup-orphaned-auth] Error checking Customers:', customerError);
      return new Response(
        JSON.stringify({ cleaned: false, reason: 'db_error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (customer) {
      console.log('[cleanup-orphaned-auth] Customer row exists - not orphaned:', authUserId);
      return new Response(
        JSON.stringify({ cleaned: false, reason: 'has_customer_row' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. No Customers row - this is an orphaned ghost. Delete it.
    console.log('[cleanup-orphaned-auth] Deleting orphaned auth user:', authUserId);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authUserId);

    if (deleteError) {
      console.error('[cleanup-orphaned-auth] Failed to delete orphaned user:', deleteError);
      return new Response(
        JSON.stringify({ cleaned: false, reason: 'delete_failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[cleanup-orphaned-auth] Successfully cleaned orphaned auth user:', authUserId);
    return new Response(
      JSON.stringify({ cleaned: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[cleanup-orphaned-auth] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', cleaned: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
