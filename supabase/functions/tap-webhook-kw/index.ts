import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Multi-country currency mapping
const COUNTRY_CURRENCY: Record<string, { code: string; decimals: number }> = {
  qa: { code: 'QAR', decimals: 2 },
  kw: { code: 'KWD', decimals: 3 },
  sa: { code: 'SAR', decimals: 2 },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookBody = await req.json();
    console.log('Received Tap webhook (KW):', JSON.stringify(webhookBody, null, 2));

    const { id, amount, currency, status, metadata } = webhookBody;

    const sessionId = metadata?.session_id;
    if (!sessionId) {
      console.error('Missing session_id in metadata');
      throw new Error('Invalid webhook data - missing session_id');
    }

    console.log(`Processing payment (KW) for session ${sessionId}, status: ${status}, amount: ${amount} ${currency}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: Verify the charge by re-fetching it from Tap API
    const tapSecretKey = Deno.env.get('TAP_SECRET_KUWAIT_KEY')?.trim();
    if (!tapSecretKey) {
      console.error('TAP_SECRET_KUWAIT_KEY not configured - cannot verify webhook');
      throw new Error('Payment verification not configured');
    }

    const verifyResponse = await fetch(`https://api.tap.company/v2/charges/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tapSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!verifyResponse.ok) {
      console.error('Failed to verify charge with Tap API:', verifyResponse.status);
      throw new Error(`Charge verification failed: ${verifyResponse.status}`);
    }

    const verifiedCharge = await verifyResponse.json();
    console.log('Verified charge from Tap API (KW):', { id: verifiedCharge.id, status: verifiedCharge.status, amount: verifiedCharge.amount });

    const verifiedStatus = verifiedCharge.status;
    const verifiedAmount = verifiedCharge.amount;
    const verifiedCurrency = verifiedCharge.currency;

    // Retrieve full order data from pending_checkouts first (need countryId for currency validation)
    const { data: pendingCheckout, error: fetchError } = await supabase
      .from('pending_checkouts')
      .select('order_data')
      .eq('session_id', sessionId)
      .single();

    if (fetchError || !pendingCheckout) {
      console.error('Failed to retrieve pending checkout:', fetchError);
      throw new Error(`Checkout session not found or expired: ${sessionId}`);
    }

    const orderData = pendingCheckout.order_data as any;
    console.log('Retrieved order data from pending_checkouts for session:', sessionId);

    // Validate customerId exists and is non-empty
    if (!orderData.customerId || typeof orderData.customerId !== 'string' || orderData.customerId.trim() === '') {
      console.error('Missing or invalid customerId in order data for session:', sessionId);
      throw new Error('Invalid checkout data - missing customer ID');
    }

    // Validate currency dynamically based on order country
    const countryId = orderData.countryId || 'kw';
    const expectedCurrencyConfig = COUNTRY_CURRENCY[countryId] || COUNTRY_CURRENCY.kw;
    const expectedCurrency = expectedCurrencyConfig.code;
    const decimalFactor = Math.pow(10, expectedCurrencyConfig.decimals);

    if (verifiedCurrency !== expectedCurrency) {
      console.error(`Currency mismatch: expected ${expectedCurrency}, got ${verifiedCurrency}`);
      throw new Error(`Payment currency must be ${expectedCurrency}`);
    }

    console.log(`Verified payment (KW) for session ${sessionId}, status: ${verifiedStatus}, amount: ${verifiedAmount} ${verifiedCurrency}`);

    // Handle failed/cancelled payments
    if (verifiedStatus === 'FAILED' || verifiedStatus === 'DECLINED' || verifiedStatus === 'CANCELLED') {
      console.log(`Payment ${verifiedStatus} for session ${sessionId} - cleaning up pending checkout`);
      await supabase.from('pending_checkouts').delete().eq('session_id', sessionId);
      
      return new Response(
        JSON.stringify({ success: true, sessionId, status: 'no_order_created', message: `Payment ${verifiedStatus} - no order was created` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only create order for successful payments
    if (verifiedStatus !== 'CAPTURED' && verifiedStatus !== 'AUTHORIZED') {
      console.log(`Ignoring payment with status ${verifiedStatus}`);
      return new Response(
        JSON.stringify({ success: true, sessionId, status: 'ignored', message: `Status ${verifiedStatus} does not trigger order creation` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PAYMENT SUCCESSFUL - Check idempotency first
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('tap_charge_id', id)
      .maybeSingle();

    if (existingOrder) {
      console.log(`Order already exists for charge ${id}: ${existingOrder.order_number} - skipping duplicate`);
      return new Response(
        JSON.stringify({ success: true, orderId: existingOrder.id, orderNumber: existingOrder.order_number, status: 'already_processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Payment ${verifiedStatus} - creating order for session ${sessionId}`);
    console.log(`BakePoints to redeem: ${orderData.bakePointsApplied || 0}, Voucher discount: ${orderData.voucherDiscount || 0}`);

    // Round verified amount using correct decimals for currency
    const receivedAmount = Math.round(verifiedAmount * decimalFactor) / decimalFactor;
    const expectedAmount = Math.round(orderData.totalAmount * decimalFactor) / decimalFactor;
    const tolerance = 1 / decimalFactor;

    if (Math.abs(expectedAmount - receivedAmount) > tolerance) {
      console.error(`Amount mismatch: expected ${expectedAmount} ${verifiedCurrency}, received ${receivedAmount} ${verifiedCurrency}`);
      throw new Error('Payment amount mismatch');
    }

    const estimatedDeliveryTime = orderData.deliveryDate && orderData.deliveryTime
      ? `${orderData.deliveryDate}T${orderData.deliveryTime.split('-')[0]}:00+03:00`
      : null;

    // Resolve human-readable delivery time slot label
    const TIME_SLOT_LABELS: Record<string, string> = {
      '09:00-12:00': '09:00 AM - 12:00 PM',
      '12:00-15:00': '12:00 PM - 03:00 PM',
      '15:00-18:00': '03:00 PM - 06:00 PM',
      '18:00-21:00': '06:00 PM - 09:00 PM',
      '21:00-23:00': '09:00 PM - 11:00 PM',
    };
    const deliveryTimeSlotLabel = orderData.deliveryTime ? (TIME_SLOT_LABELS[orderData.deliveryTime] || orderData.deliveryTime) : null;

    // Merge delivery scheduling info into cake_details
    const enrichedCakeDetails = {
      ...(orderData.cakeDetails || {}),
      delivery_time_slot: deliveryTimeSlotLabel,
      delivery_time_value: orderData.deliveryTime || null,
      delivery_date: orderData.deliveryDate || null,
    };

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: orderData.customerId,
        total_amount: receivedAmount,
        delivery_fee: orderData.deliveryFee || 0,
        status: 'pending',
        payment_method: 'card',
        payment_status: verifiedStatus === 'CAPTURED' ? 'captured' : 'authorized',
        payment_amount: receivedAmount,
        payment_currency: verifiedCurrency,
        tap_charge_id: id,
        tap_payment_reference: webhookBody.reference?.transaction || null,
        estimated_delivery_time: estimatedDeliveryTime,
        customer_notes: orderData.customerNotes,
        order_number: '',
        vat_percentage: orderData.vatPercentage || 0,
        vat_amount: orderData.vatAmount || 0,
        country_id: countryId,
        fulfillment_type: orderData.fulfillmentType,
        delivery_address_id: orderData.fulfillmentType === 'delivery' ? orderData.deliveryAddressId : null,
        cake_details: orderData.cakeDetails,
        platform_source: 'website',
        original_amount: orderData.originalAmount || orderData.totalAmount,
        voucher_id: orderData.voucherId,
        voucher_discount_amount: orderData.voucherDiscount || null,
        bakepoints_discount_amount: orderData.bakePointsDiscount || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log(`✅ Order created (KW): ${newOrder.id}, order_number: ${newOrder.order_number}`);

    // Create order items
    const orderItems = orderData.cartItems.map((item: any) => ({
      order_id: newOrder.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      original_unit_price: item.originalUnitPrice || item.unitPrice,
      item_discount_percentage: item.itemDiscountPercentage || null,
      item_discount_amount: item.itemDiscountAmount || null,
      customizations: item.customizations || {}
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
      console.error('Error creating order items:', itemsError);
    }

    console.log(`✅ Order items created for order ${newOrder.id}`);

    // Redeem BakePoints if any were applied
    if (orderData.bakePointsApplied > 0) {
      console.log(`Redeeming ${orderData.bakePointsApplied} BakePoints for order ${newOrder.id}`);
      const { data: redeemResult, error: redeemError } = await supabase.rpc('redeem_bakepoints', {
        p_customer_id: orderData.customerId,
        p_points_to_redeem: orderData.bakePointsApplied,
        p_order_id: newOrder.id,
        p_country_id: countryId
      });
      if (redeemError) {
        console.error('Error redeeming BakePoints:', redeemError);
      } else {
        console.log(`✅ BakePoints redeemed successfully:`, redeemResult);
      }
    }

    // Record voucher usage
    if (orderData.voucherId && orderData.voucherDiscount > 0) {
      console.log(`📝 Recording voucher usage for order ${newOrder.id}, voucher: ${orderData.voucherId}`);
      const { error: voucherError } = await supabase.rpc('record_voucher_usage', {
        p_voucher_id: orderData.voucherId,
        p_customer_id: orderData.customerId,
        p_order_id: newOrder.id,
        p_discount_applied: orderData.voucherDiscount
      });
      if (voucherError) {
        console.error('⚠️ Voucher usage recording failed:', voucherError);
      } else {
        console.log('✅ Voucher usage recorded successfully');
      }
    }

    // Clean up pending checkout
    await supabase.from('pending_checkouts').delete().eq('session_id', sessionId);
    console.log(`✅ Cleaned up pending checkout for session ${sessionId}`);

    // Log WhatsApp notification
    const { data: customer } = await supabase
      .from('Customers')
      .select('whatsapp_number, first_name, country_id')
      .eq('id', orderData.customerId)
      .single();

    if (customer?.whatsapp_number) {
      await supabase.from('whatsapp_logs').insert({
        customer_id: orderData.customerId,
        phone_number: customer.whatsapp_number,
        message_type: 'payment_confirmation',
        message_content: `✅ Payment confirmed! Your order ${newOrder.order_number} (${receivedAmount} ${verifiedCurrency}) has been successfully placed. We'll notify you when it's being prepared.`,
        status: 'pending',
        country_id: customer.country_id || countryId,
      });
    }

    // Send order confirmation email (fire and forget)
    // The send-order-email function handles email lookup from both auth.users and Customers table
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId: newOrder.id })
      });
      console.log('✅ Order confirmation email triggered for order:', newOrder.order_number);
    } catch (emailError) {
      console.error('Failed to send order email (non-critical):', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: newOrder.id,
        orderNumber: newOrder.order_number,
        status: 'order_created',
        paymentStatus: verifiedStatus === 'CAPTURED' ? 'captured' : 'authorized',
        bakePointsRedeemed: orderData.bakePointsApplied,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in tap-webhook-kw:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
