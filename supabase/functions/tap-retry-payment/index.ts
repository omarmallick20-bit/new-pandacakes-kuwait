import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetryRequest {
  orderId: string;
  amount: number;
  customerInfo: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TAP_SECRET_KEY = Deno.env.get('TAP_SECRET_KEY')?.trim();
    if (!TAP_SECRET_KEY) {
      throw new Error('TAP_SECRET_KEY not configured');
    }

    const { orderId, amount, customerInfo }: RetryRequest = await req.json();

    if (!orderId || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order to verify it exists and is retryable
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, payment_status, status, payment_retry_count')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if order is in a retryable state
    if (order.status === 'completed' || order.status === 'cancelled') {
      return new Response(
        JSON.stringify({ success: false, error: 'Order cannot be retried' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Round amount to 2 decimal places for QAR
    const roundedAmount = Math.round(amount * 100) / 100;

    // Generate new idempotency key for retry
    const retryCount = (order.payment_retry_count || 0) + 1;
    const idempotencyKey = `${orderId}-retry-${retryCount}-${Date.now()}`;

    // Get explicit URLs for webhook and redirect
    const supabaseFnUrl = Deno.env.get('SUPABASE_URL')!;
    const appUrl = req.headers.get('origin') || 'https://pandacakes.qa';
    const webhookUrl = `${supabaseFnUrl}/functions/v1/tap-webhook`;

    console.log('Creating Tap charge for retry:', {
      orderId,
      amount: roundedAmount,
      retryCount,
      idempotencyKey
    });

    // Create charge with Tap Payments
    const tapResponse = await fetch('https://api.tap.company/v2/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TAP_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        amount: roundedAmount,
        currency: 'QAR',
        merchant: { id: '27353015' },
        customer: {
          first_name: customerInfo.firstName,
          last_name: customerInfo.lastName || '',
          email: customerInfo.email || 'noreply@pandacakes.me',
          phone: {
            country_code: '974',
            number: customerInfo.phone.replace(/\D/g, '').replace(/^974/, '')
          }
        },
        source: {
          id: 'src_all'
        },
        redirect: {
          url: `${appUrl}/payment-success`
        },
        post: {
          url: webhookUrl
        },
        metadata: {
          orderId: orderId,
          retryAttempt: retryCount.toString()
        },
        reference: {
          transaction: order.order_number,
          order: orderId
        },
        description: `Payment retry for order ${order.order_number}`
      })
    });

    if (!tapResponse.ok) {
      const errorText = await tapResponse.text();
      console.error('Tap API error:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment service error',
          details: errorText 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tapData = await tapResponse.json();
    const chargeId = tapData.id;
    const redirectUrl = tapData.transaction?.url;

    console.log('Tap charge created for retry:', { chargeId, redirectUrl });

    // Update order with new charge details and increment retry count
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        tap_charge_id: chargeId,
        tap_idempotency_key: idempotencyKey,
        payment_retry_count: retryCount,
        payment_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order with retry details:', updateError);
      // Don't fail the request if order update fails - charge is already created
    }

    return new Response(
      JSON.stringify({
        success: true,
        chargeId,
        redirectUrl,
        retryCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Retry payment error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
