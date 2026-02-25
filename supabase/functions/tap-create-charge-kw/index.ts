import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Multi-country currency & phone mapping
const COUNTRY_CONFIG: Record<string, { currency: string; phoneCode: string; decimals: number }> = {
  qa: { currency: 'QAR', phoneCode: '974', decimals: 2 },
  kw: { currency: 'KWD', phoneCode: '965', decimals: 3 },
  sa: { currency: 'SAR', phoneCode: '966', decimals: 2 },
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tapSecretKey = Deno.env.get('TAP_SECRET_KUWAIT_KEY')?.trim();
    if (!tapSecretKey) {
      console.error('TAP_SECRET_KUWAIT_KEY not configured');
      throw new Error('Payment gateway not configured');
    }

    const { amount, customerInfo, orderData }: ChargeRequest = await req.json();

    // Resolve country config
    const countryId = orderData.countryId || 'kw';
    const cc = COUNTRY_CONFIG[countryId] || COUNTRY_CONFIG.kw;
    const decimalFactor = Math.pow(10, cc.decimals);

    const sessionId = crypto.randomUUID();
    console.log('Creating Tap charge (KW) for session:', sessionId, 'Amount:', amount, cc.currency);

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }
    if (!orderData || !orderData.customerId) {
      throw new Error('Order data is required');
    }

    // Round to correct decimal places for the currency
    const roundedAmount = Math.round(amount * decimalFactor) / decimalFactor;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

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

    const appUrl = req.headers.get('origin') || 'https://pandacakes.me';
    const webhookUrl = `${supabaseUrl}/functions/v1/tap-webhook-kw`;

    console.log('Webhook URL:', webhookUrl);
    console.log('Redirect URL:', `${appUrl}/payment-success`);

    const minimalMetadata = {
      session_id: sessionId,
      customer_id: orderData.customerId,
      total: orderData.totalAmount
    };

    // Strip phone country code prefix
    const phoneRegex = new RegExp(`^${cc.phoneCode}`);

    const tapResponse = await fetch('https://api.tap.company/v2/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tapSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: roundedAmount,
        currency: cc.currency,
        merchant: { id: '2096036' },
        customer_initiated: true,
        threeDSecure: true,
        save_card: false,
        description: `Panda Cakes Order - Session ${sessionId.slice(0, 8)}`,
        metadata: minimalMetadata,
        reference: {
          transaction: `txn_${sessionId.slice(0, 8)}`,
          order: sessionId,
        },
        customer: {
          first_name: customerInfo.firstName,
          last_name: customerInfo.lastName || '',
          email: customerInfo.email || 'noreply@pandacakes.me',
          phone: {
            country_code: cc.phoneCode,
            number: customerInfo.phone.replace(/[^0-9]/g, '').replace(phoneRegex, ''),
          },
        },
        source: { id: 'src_all' },
        redirect: { url: `${appUrl}/payment-success` },
        post: { url: webhookUrl },
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

    console.log('Tap charge created (KW):', {
      id: chargeData.id,
      status: chargeData.status,
      session: sessionId,
    });

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in tap-create-charge-kw:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment initialization failed',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
