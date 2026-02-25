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
    const { old_customer_id, new_user_id } = await req.json();

    if (!old_customer_id || !new_user_id) {
      return new Response(
        JSON.stringify({ error: 'old_customer_id and new_user_id are required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (old_customer_id === new_user_id) {
      return new Response(
        JSON.stringify({ success: true, message: 'IDs already match' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[reassign-customer-profile] Reassigning:', old_customer_id, '->', new_user_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify the old customer exists
    const { data: oldCustomer, error: fetchError } = await supabase
      .from('Customers')
      .select('*')
      .eq('id', old_customer_id)
      .maybeSingle();

    if (fetchError || !oldCustomer) {
      console.error('[reassign-customer-profile] Old customer not found:', fetchError?.message);
      return new Response(
        JSON.stringify({ error: 'Old customer not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if a customer already exists with the new ID
    const { data: existingNew } = await supabase
      .from('Customers')
      .select('id')
      .eq('id', new_user_id)
      .maybeSingle();

    // === STEP A: Transfer ALL child records from old to new FIRST ===
    // This must happen before any Customers.id change to avoid FK violations

    // Transfer addresses
    const { error: addressError } = await supabase
      .from('addresses')
      .update({ customer_id: new_user_id })
      .eq('customer_id', old_customer_id);
    if (addressError) {
      console.warn('[reassign-customer-profile] Address update warning:', addressError.message);
    }

    // Transfer cart_items
    const { error: cartError } = await supabase
      .from('cart_items')
      .update({ customer_id: new_user_id })
      .eq('customer_id', old_customer_id);
    if (cartError) {
      console.warn('[reassign-customer-profile] Cart items update warning:', cartError.message);
    }

    // Transfer wishlist_items
    const { error: wishlistError } = await supabase
      .from('wishlist_items')
      .update({ customer_id: new_user_id })
      .eq('customer_id', old_customer_id);
    if (wishlistError) {
      console.warn('[reassign-customer-profile] Wishlist update warning:', wishlistError.message);
    }

    // Transfer orders
    const { error: ordersError } = await supabase
      .from('orders')
      .update({ customer_id: new_user_id })
      .eq('customer_id', old_customer_id);
    if (ordersError) {
      console.warn('[reassign-customer-profile] Orders update warning:', ordersError.message);
    }

    // Transfer loyalty_transactions
    const { error: loyaltyError } = await supabase
      .from('loyalty_transactions')
      .update({ customer_id: new_user_id })
      .eq('customer_id', old_customer_id);
    if (loyaltyError) {
      console.warn('[reassign-customer-profile] Loyalty transactions update warning:', loyaltyError.message);
    }

    // === STEP B: Handle the Customer record itself ===
    if (existingNew) {
      // A Customer record already exists for the new user ID (e.g. auto-created).
      // Child records are already transferred above. Just delete the old record.
      console.log('[reassign-customer-profile] Customer already exists with new ID, merging data and deleting old record');
      const { error: deleteOldError } = await supabase
        .from('Customers')
        .delete()
        .eq('id', old_customer_id);
      if (deleteOldError) {
        console.warn('[reassign-customer-profile] Old customer deletion warning:', deleteOldError.message);
      }
    } else {
      // No customer with new ID — update the old record's ID in-place
      const { error: updateIdError } = await supabase
        .from('Customers')
        .update({ id: new_user_id })
        .eq('id', old_customer_id);

      if (updateIdError) {
        console.error('[reassign-customer-profile] Failed to update customer ID:', updateIdError);
        return new Response(
          JSON.stringify({ error: 'Failed to update customer ID', details: updateIdError.message, success: false }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // === STEP C: Delete the orphaned auth user (old temp email account) ===
    console.log('[reassign-customer-profile] Deleting orphaned auth user:', old_customer_id);
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(old_customer_id);
    if (deleteAuthError) {
      console.warn('[reassign-customer-profile] Orphaned auth user deletion warning:', deleteAuthError.message);
    }

    console.log('[reassign-customer-profile] Reassignment complete');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reassign-customer-profile] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
