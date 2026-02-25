import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, filters = {}, message, message_type = 'promotional', country_id } = await req.json();
    // Use client-provided country_id, default to 'qa' for backward compatibility
    const COUNTRY_CODE = country_id || 'qa';

    switch (action) {
      case 'get_loyalty_segments':
        return await getLoyaltySegments(supabase, filters);
      
      case 'get_birthday_customers':
        return await getBirthdayCustomers(supabase, filters);
      
      case 'send_mass_message':
        return await sendMassMessage(supabase, filters, message, message_type);
      
      case 'get_inactive_customers':
        return await getInactiveCustomers(supabase, filters);
      
      case 'get_high_value_customers':
        return await getHighValueCustomers(supabase, filters);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error in customer-segmentation function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getLoyaltySegments(supabase: any, filters: any) {
  try {
    const min_points = filters.min_points || 0;
    
    const { data, error } = await supabase
      .rpc('get_customer_segments_by_loyalty', { min_points, country_code: COUNTRY_CODE });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      customers: data || [] 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting loyalty segments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getBirthdayCustomers(supabase: any, filters: any) {
  try {
    const days_ahead = filters.days_ahead || 7;
    
    const { data, error } = await supabase
      .rpc('get_birthday_customers', { days_ahead, country_code: COUNTRY_CODE });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      customers: data || [] 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting birthday customers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function sendMassMessage(supabase: any, filters: any, message: string, message_type: string) {
  try {
    let customers = [];
    
    // Get customers based on filters
    if (filters.segment === 'loyalty') {
      const { data } = await supabase
        .rpc('get_customer_segments_by_loyalty', { 
          min_points: filters.min_points || 0,
          country_code: COUNTRY_CODE
        });
      customers = data || [];
    } else if (filters.segment === 'birthday') {
      const { data } = await supabase
        .rpc('get_birthday_customers', { 
          days_ahead: filters.days_ahead || 7,
          country_code: COUNTRY_CODE
        });
      customers = data || [];
    } else if (filters.segment === 'inactive') {
      // Get inactive customers (no orders in last X days)
      const days_inactive = filters.days_inactive || 30;
      const { data } = await supabase
        .from('Customers')
        .select('id, first_name, whatsapp_number, loyalty_points')
        .eq('country_id', COUNTRY_CODE)
        .not('whatsapp_number', 'is', null)
        .filter('id', 'not.in', `(
          SELECT DISTINCT customer_id 
          FROM orders 
          WHERE created_at > NOW() - INTERVAL '${days_inactive} days'
            AND country_id = '${COUNTRY_CODE}'
        )`);
      customers = data || [];
    } else {
      // Default: all customers with WhatsApp numbers
      const { data } = await supabase
        .from('Customers')
        .select('id, first_name, whatsapp_number, loyalty_points')
        .eq('country_id', COUNTRY_CODE)
        .not('whatsapp_number', 'is', null);
      customers = data || [];
    }

    // Queue messages for all selected customers
    const messagePromises = customers.map(async (customer: any) => {
      const personalizedMessage = message.replace('{name}', customer.first_name || 'Dear Customer');
      
      return supabase
        .from('whatsapp_logs')
        .insert({
          customer_id: customer.customer_id || customer.id,
          phone_number: customer.whatsapp_number,
          message_type,
          message_content: personalizedMessage,
          status: 'pending',
          country_id: COUNTRY_CODE
        });
    });

    await Promise.all(messagePromises);

    return new Response(JSON.stringify({ 
      success: true, 
      messages_queued: customers.length,
      message: `${customers.length} messages queued for sending`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error sending mass message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getInactiveCustomers(supabase: any, filters: any) {
  try {
    const days_inactive = filters.days_inactive || 30;
    
    const { data, error } = await supabase
      .from('Customers')
      .select(`
        id,
        first_name,
        last_name,
        whatsapp_number,
        loyalty_points,
        created_at
      `)
      .eq('country_id', COUNTRY_CODE)
      .not('whatsapp_number', 'is', null)
      .filter('id', 'not.in', `(
        SELECT DISTINCT customer_id 
        FROM orders 
        WHERE created_at > NOW() - INTERVAL '${days_inactive} days'
          AND country_id = '${COUNTRY_CODE}'
      )`);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      customers: data || [] 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting inactive customers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getHighValueCustomers(supabase: any, filters: any) {
  try {
    const min_total_spent = filters.min_total_spent || 1000;
    
    const { data, error } = await supabase
      .rpc('get_customer_segments_by_loyalty', { min_points: 0, country_code: COUNTRY_CODE })
      .gte('total_spent', min_total_spent);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      customers: data || [] 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting high value customers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}