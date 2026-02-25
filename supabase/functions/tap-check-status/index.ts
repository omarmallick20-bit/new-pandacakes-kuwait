import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TapChargeResponse {
  id: string;
  status: string;
  response?: {
    code: string;
    message: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { charge_id } = await req.json();

    if (!charge_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'charge_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tapSecretKey = Deno.env.get('TAP_SECRET_KEY')?.trim();
    if (!tapSecretKey) {
      console.error('TAP secret key not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query Tap API for charge status
    const tapResponse = await fetch(`https://api.tap.company/v2/charges/${charge_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tapSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!tapResponse.ok) {
      const errorText = await tapResponse.text();
      console.error('Tap API error:', tapResponse.status, errorText);
      
      // If charge not found, it might be invalid
      if (tapResponse.status === 404) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: 'NOT_FOUND',
            message: 'Payment not found. Please return to cart and try again.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check payment status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chargeData: TapChargeResponse = await tapResponse.json();
    console.log('Tap charge status:', chargeData.id, chargeData.status);

    // Map Tap status to user-friendly message
    const statusMessages: Record<string, string> = {
      'CAPTURED': 'Payment successful! Your order is being processed.',
      'AUTHORIZED': 'Payment authorized! Your order is being processed.',
      'INITIATED': 'Payment is still being processed. Please wait...',
      'IN_PROGRESS': 'Payment is in progress. Please wait...',
      'PENDING': 'Payment is pending. Please wait...',
      'CANCELLED': 'Payment was cancelled. Your cart items are still saved.',
      'ABANDONED': 'Payment was not completed. Your cart items are still saved.',
      'FAILED': `Payment failed: ${chargeData.response?.message || 'Your card was declined. Please try a different payment method.'}`,
      'DECLINED': `Payment declined: ${chargeData.response?.message || 'Your bank declined the transaction. Please try a different card.'}`,
      'RESTRICTED': 'Payment restricted. Please contact your bank or try a different card.',
      'VOID': 'Payment was voided.',
      'TIMEDOUT': 'Payment timed out. Please try again.',
      'UNKNOWN': 'Payment status unknown. Please check your order history.',
    };

    const message = statusMessages[chargeData.status] || `Payment status: ${chargeData.status}`;

    return new Response(
      JSON.stringify({
        success: true,
        status: chargeData.status,
        message,
        response_code: chargeData.response?.code,
        response_message: chargeData.response?.message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking Tap status:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
