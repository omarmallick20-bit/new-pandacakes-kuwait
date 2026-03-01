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

    const { action, voucher_code, customer_id, order_amount, voucher_data, country_id } = await req.json();
    const countryCode = country_id || 'qa';

    switch (action) {
      case 'validate':
        return await validateVoucher(supabase, voucher_code, customer_id, order_amount, countryCode);
      
      case 'apply':
        return await applyVoucher(supabase, voucher_code, customer_id, order_amount, countryCode);
      
      case 'create':
        return await createVoucher(supabase, voucher_data, countryCode);
      
      case 'create_birthday_vouchers':
        return await createBirthdayVouchers(supabase, countryCode);
      
      case 'get_customer_vouchers':
        return await getCustomerVouchers(supabase, customer_id, countryCode);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error in voucher-manager function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function validateVoucher(supabase: any, voucher_code: string, customer_id: string, order_amount: number, countryCode: string) {
  try {
    const { data, error } = await supabase
      .rpc('validate_voucher', {
        voucher_code_param: voucher_code,
        customer_id_param: customer_id,
        order_amount_param: order_amount,
        country_code_param: countryCode
      });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(data[0]), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error validating voucher:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      is_valid: false, 
      error_message: errorMessage 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function applyVoucher(supabase: any, voucher_code: string, customer_id: string, order_amount: number, countryCode: string) {
  try {
    const { data, error } = await supabase
      .rpc('apply_voucher', {
        voucher_code_param: voucher_code,
        customer_id_param: customer_id,
        order_amount_param: order_amount,
        country_code_param: countryCode
      });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(data[0]), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error applying voucher:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      success: false, 
      message: errorMessage 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function createVoucher(supabase: any, voucher_data: any, countryCode: string) {
  try {
    if (!voucher_data.voucher_code) {
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_voucher_code');
      
      if (codeError) {
        throw codeError;
      }
      
      voucher_data.voucher_code = codeData;
    }

    const { data, error } = await supabase
      .from('vouchers')
      .insert({
        ...voucher_data,
        country_id: countryCode
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      voucher: data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating voucher:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function createBirthdayVouchers(supabase: any, countryCode: string) {
  try {
    const { data, error } = await supabase
      .rpc('create_birthday_vouchers', { country_code: countryCode });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      vouchers_created: data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating birthday vouchers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getCustomerVouchers(supabase: any, customer_id: string, countryCode: string) {
  try {
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('country_id', countryCode)
      .gte('valid_until', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      vouchers: data || [] 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting customer vouchers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
