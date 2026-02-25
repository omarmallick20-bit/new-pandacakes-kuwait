import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COUNTRY_CODE = 'qa'; // Qatar country code

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, voucher_code, customer_id, order_amount, voucher_data } = await req.json();

    switch (action) {
      case 'validate':
        return await validateVoucher(supabase, voucher_code, customer_id, order_amount);
      
      case 'apply':
        return await applyVoucher(supabase, voucher_code, customer_id, order_amount);
      
      case 'create':
        return await createVoucher(supabase, voucher_data);
      
      case 'create_birthday_vouchers':
        return await createBirthdayVouchers(supabase);
      
      case 'get_customer_vouchers':
        return await getCustomerVouchers(supabase, customer_id);
      
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

async function validateVoucher(supabase: any, voucher_code: string, customer_id: string, order_amount: number) {
  try {
    const { data, error } = await supabase
      .rpc('validate_voucher', {
        voucher_code_param: voucher_code,
        customer_id_param: customer_id,
        order_amount_param: order_amount,
        country_code_param: COUNTRY_CODE
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

async function applyVoucher(supabase: any, voucher_code: string, customer_id: string, order_amount: number) {
  try {
    const { data, error } = await supabase
      .rpc('apply_voucher', {
        voucher_code_param: voucher_code,
        customer_id_param: customer_id,
        order_amount_param: order_amount,
        country_code_param: COUNTRY_CODE
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

async function createVoucher(supabase: any, voucher_data: any) {
  try {
    // Generate voucher code if not provided
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
        country_id: COUNTRY_CODE
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

async function createBirthdayVouchers(supabase: any) {
  try {
    const { data, error } = await supabase
      .rpc('create_birthday_vouchers', { country_code: COUNTRY_CODE });

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

async function getCustomerVouchers(supabase: any, customer_id: string) {
  try {
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('country_id', COUNTRY_CODE)
      .gte('valid_until', new Date().toISOString().split('T')[0])
      .lt('usage_count', supabase.rpc('max_usage'))
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