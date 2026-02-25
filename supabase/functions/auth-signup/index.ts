import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Server-side country enforcement: always use this, ignore client-provided country_id
const SERVER_COUNTRY_ID = Deno.env.get('COUNTRY_ID') || 'qa';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, phone, userData } = await req.json();

    console.log('Creating customer profile for:', email || phone);
    console.log('User data received:', JSON.stringify(userData));
    console.log('Server country_id enforced:', SERVER_COUNTRY_ID);

    // OPTIMIZED: Use targeted lookup instead of listUsers() which fetches ALL users
    let user = null;

    // Try email lookup first using DB function (getUserByEmail doesn't exist in supabase-js)
    if (email) {
      const { data: authUserId } = await supabase.rpc('get_auth_user_id_by_email', { email_input: email });
      if (authUserId) {
        const { data, error } = await supabase.auth.admin.getUserById(authUserId);
        if (!error && data?.user) {
          user = data.user;
        }
      }
    }

    // If not found by email, try phone lookup via Customers table
    if (!user && phone) {
      // Look up by phone in Customers table to find the user ID
      const normalizedPhone = phone.replace(/\s/g, '');
      const { data: customer } = await supabase
        .from('Customers')
        .select('id')
        .or(`whatsapp_number.eq.${normalizedPhone},whatsapp_number.ilike.%${normalizedPhone.replace('+', '')}`)
        .limit(1)
        .maybeSingle();
      
      if (customer) {
        const { data, error } = await supabase.auth.admin.getUserById(customer.id);
        if (!error && data?.user) {
          user = data.user;
        }
      }
      
      // Fallback: try temp email format
      if (!user) {
        const tempEmail = `${normalizedPhone}@temp.pandacakes.qa`;
        const { data: tempAuthUserId } = await supabase.rpc('get_auth_user_id_by_email', { email_input: tempEmail });
        if (tempAuthUserId) {
          const { data, error } = await supabase.auth.admin.getUserById(tempAuthUserId);
          if (!error && data?.user) {
            user = data.user;
          }
        }
      }
    }
    
    if (!user) {
      throw new Error('User not found');
    }

    console.log('Found auth user:', user.id);

    // Check if we're claiming an existing dashboard-created customer
    if (userData.existingCustomerId) {
      console.log('Claiming existing customer account:', userData.existingCustomerId);

      // Get the existing customer data (including loyalty points!)
      const { data: existingCustomer, error: fetchError } = await supabase
        .from('Customers')
        .select('*')
        .eq('id', userData.existingCustomerId)
        .single();

      if (fetchError) {
        console.error('Error fetching existing customer:', fetchError);
        throw fetchError;
      }

      console.log('Existing customer data:', JSON.stringify(existingCustomer));
      console.log('Preserving loyalty points:', existingCustomer.loyalty_points);

      // Create new customer record with the auth user's ID, preserving loyalty data
      const isRealEmail = email && !email.includes('@temp.pandacakes.qa');

      const { error: insertError } = await supabase
        .from('Customers')
        .insert({
          id: user.id,
          first_name: userData.first_name || existingCustomer.first_name,
          last_name: userData.last_name || existingCustomer.last_name,
          whatsapp_number: userData.whatsapp_number || existingCustomer.whatsapp_number,
          birthdate: userData.birthdate || existingCustomer.birthdate,
          loyalty_points: existingCustomer.loyalty_points || 0,
          loyalty_code: existingCustomer.loyalty_code,
          preferred_country: SERVER_COUNTRY_ID,
          country_id: SERVER_COUNTRY_ID,
          phone_verified: true,
          created_via_dashboard: false,
          email: isRealEmail ? email : (existingCustomer.email || null),
        });

      if (insertError) {
        console.error('Error creating new customer record:', insertError);
        throw insertError;
      }

      // Delete the orphaned dashboard-created record
      const { error: deleteError } = await supabase
        .from('Customers')
        .delete()
        .eq('id', userData.existingCustomerId);

      if (deleteError) {
        console.error('Error deleting orphaned customer record:', deleteError);
        // Don't throw - the main operation succeeded
      }

      console.log('Customer account claimed successfully! Loyalty points preserved:', existingCustomer.loyalty_points);

      return new Response(JSON.stringify({ 
        success: true,
        claimed: true,
        loyaltyPointsPreserved: existingCustomer.loyalty_points || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Standard flow: Create new customer profile
    const isRealEmail = email && !email.includes('@temp.pandacakes.qa');

    const { error: customerError } = await supabase
      .from('Customers')
      .upsert({
        id: user.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        whatsapp_number: userData.whatsapp_number || phone || null,
        birthdate: userData.birthdate,
        preferred_country: SERVER_COUNTRY_ID,
        country_id: SERVER_COUNTRY_ID,
        phone_verified: true,
        email: isRealEmail ? email : null
      });

    if (customerError) {
      console.error('Customer creation error:', customerError);
      throw customerError;
    }

    console.log('Customer profile created successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auth-signup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
