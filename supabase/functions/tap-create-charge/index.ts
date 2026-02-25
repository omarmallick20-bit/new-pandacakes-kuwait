import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItemData {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations?: any;
}

interface OrderData {
  customerId: string;
  cartItems: OrderItemData[];
  deliveryAddressId: string | null;
  fulfillmentType: 'delivery' | 'pickup';
  deliveryDate: string;
  deliveryTime: string;
  customerNotes: string;
  isGift: boolean;
  giftRecipient: { name: string; phone: string } | null;
  vatPercentage: number;
  vatAmount: number;
  totalAmount: number;
  countryId: string;
  cakeDetails: any;
  // Voucher and BakePoints data
  originalAmount?: number;
  voucherId?: string | null;
  voucherDiscount?: number;
  bakePointsApplied?: number;
  bakePointsDiscount?: number;
}

interface ChargeRequest {
  amount: number;
  customerInfo: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone: string;
  };
  orderData: OrderData;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tapSecretKey = Deno.env.get('TAP_SECRET_KEY')?.trim();
    if (!tapSecretKey) {
      console.error('TAP_SECRET_KEY not configured');
      throw new Error('Payment gateway not configured');
    }




    const { amount, customerInfo, orderData }: ChargeRequest = await req.json();

    // Generate a unique session ID for this payment attempt (not an order ID!)
    const sessionId = crypto.randomUUID();

    console.log('Creating Tap charge for session:', sessionId, 'Amount:', amount, 'QAR');

    // Validate amount (QAR with 2 decimal places)
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (!orderData || !orderData.customerId) {
      throw new Error('Order data is required');
    }

    // Round to 2 decimal places for QAR
    const qarAmount = Math.round(amount * 100) / 100;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Store full order data in pending_checkouts table (expires in 30 mins)
    // This avoids Tap metadata length limit of 1000 chars
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    
    const { error: storeError } = await supabaseClient
      .from('pending_checkouts')
      .insert({
        session_id: sessionId,
        order_data: orderData,
        expires_at: expiresAt
      });

    if (storeError) {
      console.error('Error storing pending checkout:', storeError);
      throw new Error('Failed to initialize checkout session');
    }

    console.log('Stored order data in pending_checkouts for session:', sessionId);
    console.log('BakePoints to redeem:', orderData.bakePointsApplied || 0);
    console.log('Voucher discount:', orderData.voucherDiscount || 0);

    // Get app URL for redirect (user goes back to frontend after payment)
    const appUrl = req.headers.get('origin') || 'https://pandacakes.qa';

    // Webhook URL for Tap to call after payment
    const webhookUrl = `${supabaseUrl}/functions/v1/tap-webhook`;

    console.log('Webhook URL:', webhookUrl);
    console.log('Redirect URL:', `${appUrl}/payment-success`);

    // Store MINIMAL data in Tap metadata (must be under 1000 chars total)
    // The webhook will retrieve full order data from pending_checkouts using session_id
    const minimalMetadata = {
      session_id: sessionId,
      customer_id: orderData.customerId,
      total: orderData.totalAmount
    };

    // Create charge via Tap Payments API
    // IMPORTANT: We do NOT create an order in the database here!
    // The order will only be created by tap-webhook after successful payment
    const tapResponse = await fetch('https://api.tap.company/v2/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tapSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: qarAmount,
        currency: 'QAR',
        merchant: { id: '27353015' },
        customer_initiated: true,
        threeDSecure: true,
        save_card: false,
        description: `Panda Cakes Order - Session ${sessionId.slice(0, 8)}`,
        metadata: minimalMetadata,
        reference: {
          transaction: `txn_${sessionId.slice(0, 8)}`,
          order: sessionId, // Using session ID as temporary reference
        },
        customer: {
          first_name: customerInfo.firstName,
          last_name: customerInfo.lastName || '',
          email: customerInfo.email || 'noreply@pandacakes.me',
          phone: {
            country_code: '974',
            number: customerInfo.phone.replace(/[^0-9]/g, '').replace(/^974/, ''),
          },
        },
        source: {
          id: 'src_all',
        },
        redirect: {
          url: `${appUrl}/payment-success`,
        },
        post: {
          url: webhookUrl,
        },
      }),
    });

    const responseText = await tapResponse.text();
    console.log('Tap API response status:', tapResponse.status);

    if (!tapResponse.ok) {
      console.error('Tap API error:', responseText);
      throw new Error(`Payment gateway error: ${tapResponse.status}`);
    }

    let chargeData;
    try {
      chargeData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Tap response:', responseText);
      throw new Error('Invalid response from payment gateway');
    }

    console.log('Tap charge created:', {
      id: chargeData.id,
      status: chargeData.status,
      response: chargeData.response,
      card: chargeData.card,
      security: chargeData.security,
      session: sessionId,
    });

    // Build redirect URL with charge ID
    const redirectUrl = chargeData.transaction?.url;
    if (!redirectUrl) {
      console.error('No redirect URL in Tap response:', chargeData);
      throw new Error('No payment URL received');
    }

    return new Response(
      JSON.stringify({
        success: true,
        chargeId: chargeData.id,
        sessionId: sessionId,
        redirectUrl: redirectUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in tap-create-charge:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment initialization failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
