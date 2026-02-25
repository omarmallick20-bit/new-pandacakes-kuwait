import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Invalid token or user not found:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deleting account for user:', user.id);

    // IMPORTANT: Orders are preserved! The FK is now ON DELETE SET NULL,
    // so orders.customer_id will become null but orders remain in history.
    // Customer and address snapshots on the orders table preserve the details.

    // Delete user's cart items (correct column name: customer_id)
    const { error: cartError } = await supabase
      .from('cart_items')
      .delete()
      .eq('customer_id', user.id);
    
    if (cartError) {
      console.warn('Error deleting cart items:', cartError);
    }

    // Delete user's wishlist items (correct column name: customer_id)
    const { error: wishlistError } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('customer_id', user.id);
    
    if (wishlistError) {
      console.warn('Error deleting wishlist items:', wishlistError);
    }

    // Delete user's addresses (correct table name: addresses, column: customer_id)
    // This is now safe because orders.delivery_address_id FK is ON DELETE SET NULL
    const { error: addressError } = await supabase
      .from('addresses')
      .delete()
      .eq('customer_id', user.id);
    
    if (addressError) {
      console.warn('Error deleting addresses:', addressError);
    }

    // Delete user's customer profile
    // This is now safe because orders.customer_id FK is ON DELETE SET NULL
    const { error: customerError } = await supabase
      .from('Customers')
      .delete()
      .eq('id', user.id);
    
    if (customerError) {
      console.error('Error deleting customer profile:', customerError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete customer profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete user from auth (using admin API)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully deleted account for user:', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
