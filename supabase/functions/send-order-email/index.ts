import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  orderId: string;
}

// Country-aware configuration
const COUNTRY_CONFIG: Record<string, {
  currency: string;
  decimals: number;
  businessEmail: string;
  tempEmailDomain: string;
  whatsappNumber: string;
  whatsappDisplay: string;
  phones: { number: string; display: string }[];
  address: string;
  hours: string;
  instagram: string;
  instagramHandle: string;
  pickupLocation: string;
}> = {
  kw: {
    currency: 'KWD',
    decimals: 3,
    businessEmail: 'kw@pandacakes.me',
    tempEmailDomain: '@temp.pandacakes.kw',
    whatsappNumber: '96550018008',
    whatsappDisplay: '+965 5001 8008',
    phones: [
      { number: '+96550018008', display: '+965 5001 8008' },
      { number: '+96555756675', display: '+965 5575 6675' },
    ],
    address: 'Ardiya Herafiya, Kuwait',
    hours: 'Open Daily 8:00 AM – 9:00 PM',
    instagram: 'https://www.instagram.com/pandacakes.kw/',
    instagramHandle: '@pandacakes.kw',
    pickupLocation: 'Ardiya Herafiya, Kuwait',
  },
  qa: {
    currency: 'QAR',
    decimals: 2,
    businessEmail: 'kw@pandacakes.me',
    tempEmailDomain: '@temp.pandacakes.qa',
    whatsappNumber: '97460018005',
    whatsappDisplay: '+974 60018005',
    phones: [
      { number: '+97460018005', display: '+974 60018005' },
      { number: '+97460019344', display: '+974 60019344' },
    ],
    address: 'Barwa Village, Doha, Qatar',
    hours: 'Open Daily 8:00 AM – 9:00 PM',
    instagram: 'https://www.instagram.com/pandacakes.qa/',
    instagramHandle: '@pandacakes.qa',
    pickupLocation: 'Barwa Village, Doha, Qatar',
  },
};

function getCountryConfig(countryId: string | null) {
  return COUNTRY_CONFIG[countryId || 'kw'] || COUNTRY_CONFIG.kw;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId }: OrderEmailRequest = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing orderId' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        addresses:delivery_address_id(street_address, city, country, landmarks),
        order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Failed to fetch order:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Derive country config from the order
    const config = getCountryConfig(order.country_id);
    const fmt = (amount: number) => `${amount.toFixed(config.decimals)} ${config.currency}`;

    // Get customer email
    const { data: authUser } = await supabase.auth.admin.getUserById(order.customer_id);
    let customerEmail = authUser?.user?.email || null;

    // Check for temp emails across all country domains
    const isTempEmail = (email: string | null) =>
      !email || email.includes('@temp.pandacakes.qa') || email.includes('@temp.pandacakes.kw');

    if (isTempEmail(customerEmail)) {
      const { data: custData } = await supabase
        .from('Customers')
        .select('email')
        .eq('id', order.customer_id)
        .single();
      customerEmail = custData?.email || null;
    }

    const hasCustomerEmail = customerEmail && !isTempEmail(customerEmail);

    if (!hasCustomerEmail) {
      customerEmail = null;
      console.log('No real customer email found, will send to business only:', order.customer_id);
    }

    console.log('Using customer email:', customerEmail);

    // Get customer name
    const { data: customer } = await supabase
      .from('Customers')
      .select('first_name, last_name')
      .eq('id', order.customer_id)
      .single();

    const customerName = customer
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Valued Customer'
      : 'Valued Customer';

    // Format order items
    const orderItems = order.order_items || [];
    const itemsHtml = orderItems.map((item: any) => {
      const customizations = item.customizations || {};
      const customizationDetails = [];
      if (customizations.flavor) customizationDetails.push(`Flavor: ${customizations.flavor}`);
      if (customizations.variant) customizationDetails.push(`Size: ${customizations.variant}`);
      if (customizations.specialInstructions) customizationDetails.push(`Note: ${customizations.specialInstructions}`);

      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eeeeee;">
            <strong>${item.product_name}</strong>
            ${customizationDetails.length > 0 ? `<br><span style="font-size: 12px; color: #888;">${customizationDetails.join(' | ')}</span>` : ''}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: right;">${fmt(item.total_price)}</td>
        </tr>
      `;
    }).join('');

    const subtotal = orderItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);

    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'Asia/Qatar'
    });

    let scheduledDateTime = 'To be confirmed';
    if (order.estimated_delivery_time) {
      const dt = new Date(order.estimated_delivery_time);
      scheduledDateTime = dt.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
      }) + ' at ' + dt.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
      });
    }

    const isDelivery = order.fulfillment_type === 'delivery';
    const fulfillmentTitle = isDelivery ? '🚗 Delivery Details' : '🏪 Pickup Details';
    let fulfillmentDetails = '';

    if (isDelivery && order.addresses) {
      const addr = order.addresses;
      fulfillmentDetails = `
        <p style="margin: 0 0 8px;"><strong>Address:</strong> ${addr.street_address || ''}</p>
        <p style="margin: 0 0 8px;"><strong>City:</strong> ${addr.city || ''}, ${addr.country || config.address.split(', ').pop()}</p>
        ${addr.landmarks ? `<p style="margin: 0 0 8px;"><strong>Landmarks:</strong> ${addr.landmarks}</p>` : ''}
      `;
    } else {
      fulfillmentDetails = `
        <p style="margin: 0 0 8px;"><strong>Location:</strong> ${config.pickupLocation}</p>
      `;
    }

    // Build phone links for contact section
    const phoneLinks = config.phones.map(p =>
      `<a href="tel:${p.number}" style="color: #ffffff;">${p.display}</a>`
    ).join(' / ');

    console.log(`Sending order confirmation email to ${customerEmail} for order ${order.order_number}`);

    const emailResponse = await resend.emails.send({
      from: "Panda Cakes <order-noreply@pandacakes.me>",
      to: customerEmail ? [customerEmail] : [config.businessEmail],
      ...(customerEmail ? { cc: [config.businessEmail] } : {}),
      subject: `Order Confirmed - #${order.order_number} 🎂`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #40E0D0 0%, #FFD700 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; font-size: 28px; color: #ffffff; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">PANDA CAKES🐼</h1>
              <p style="margin: 10px 0 0; font-size: 16px; color: #ffffff;">Order Confirmed!</p>
            </td>
          </tr>
          
          <!-- Order Info -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <h2 style="margin: 0 0 10px; font-size: 22px; color: #333333;">Thank you, ${customerName}! 🎉</h2>
              <p style="margin: 0 0 20px; font-size: 15px; color: #666666; line-height: 1.5;">
                Your order has been received and we're getting it ready for you!
              </p>
              
              <div style="background-color: #f0fdf9; border: 1px solid #40E0D0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #666;">
                  <strong>Order Number:</strong> <span style="color: #333; font-size: 16px;">#${order.order_number}</span>
                </p>
                <p style="margin: 0 0 8px; font-size: 14px; color: #666;">
                  <strong>Order Date:</strong> ${orderDate}
                </p>
                <p style="margin: 0; font-size: 14px; color: #666;">
                  <strong>Scheduled:</strong> ${scheduledDateTime}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Order Items -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <h3 style="margin: 0 0 16px; font-size: 18px; color: #333333;">📦 Order Items</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; text-align: left; font-size: 13px; color: #666;">Item</th>
                    <th style="padding: 12px; text-align: center; font-size: 13px; color: #666;">Qty</th>
                    <th style="padding: 12px; text-align: right; font-size: 13px; color: #666;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Order Summary -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #666;">Subtotal</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #333; text-align: right;">${fmt(subtotal)}</td>
                </tr>
                ${isDelivery ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #666;">Delivery Fee</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #333; text-align: right;">${fmt(order.delivery_fee || 0)}</td>
                </tr>
                ` : ''}
                ${order.vat_amount ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #666;">VAT (${order.vat_percentage || 0}%)</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #333; text-align: right;">${fmt(order.vat_amount)}</td>
                </tr>
                ` : ''}
                ${order.voucher_discount_amount ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #22c55e;">Voucher Discount</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #22c55e; text-align: right;">-${fmt(order.voucher_discount_amount)}</td>
                </tr>
                ` : ''}
                ${order.bakepoints_discount_amount ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #d97706;">BakePoints Discount</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #d97706; text-align: right;">-${fmt(order.bakepoints_discount_amount)}</td>
                </tr>
                ` : ''}
                <tr style="border-top: 2px solid #40E0D0;">
                  <td style="padding: 12px 0; font-size: 18px; font-weight: bold; color: #333;">Total</td>
                  <td style="padding: 12px 0; font-size: 18px; font-weight: bold; color: #333; text-align: right;">${fmt(order.total_amount)}</td>
                </tr>
              </table>
              <p style="margin: 10px 0 0; font-size: 13px; color: #888;">
                Payment: ${order.payment_method === 'card' ? '💳 Card' : `💵 Cash on ${isDelivery ? 'Delivery' : 'Pickup'}`}
              </p>
            </td>
          </tr>
          
          <!-- Fulfillment Details -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <div style="background-color: #f8f9fa; border-radius: 12px; padding: 20px;">
                <h3 style="margin: 0 0 12px; font-size: 16px; color: #333333;">${fulfillmentTitle}</h3>
                ${fulfillmentDetails}
                <p style="margin: 0;"><strong>Time:</strong> ${scheduledDateTime}</p>
              </div>
            </td>
          </tr>
          
          ${order.customer_notes ? `
          <!-- Special Instructions -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px;">
                <h4 style="margin: 0 0 8px; font-size: 14px; color: #92400e;">📝 Special Instructions</h4>
                <p style="margin: 0; font-size: 14px; color: #78350f;">${order.customer_notes}</p>
              </div>
            </td>
          </tr>
          ` : ''}
          
          <!-- Branch Contact -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="background: linear-gradient(135deg, #40E0D0 0%, #48D1CC 100%); border-radius: 12px; padding: 24px; color: #ffffff;">
                <h3 style="margin: 0 0 16px; font-size: 18px;">📍 Need Help? Contact Us</h3>
                <p style="margin: 0 0 8px; font-size: 14px;">
                  <strong>WhatsApp:</strong> <a href="https://wa.me/${config.whatsappNumber}" style="color: #ffffff; text-decoration: underline;">${config.whatsappDisplay}</a>
                </p>
                <p style="margin: 0 0 8px; font-size: 14px;">
                  <strong>Phone:</strong> ${phoneLinks}
                </p>
                <p style="margin: 0 0 8px; font-size: 14px;">
                  <strong>Address:</strong> ${config.address}
                </p>
                <p style="margin: 0 0 8px; font-size: 14px;">
                  <strong>Hours:</strong> ${config.hours}
                </p>
                <p style="margin: 0; font-size: 14px;">
                  <strong>Instagram:</strong> <a href="${config.instagram}" style="color: #ffffff; text-decoration: underline;">${config.instagramHandle}</a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 14px; color: #666666;">
                Thank you for choosing Panda Cakes! 🐼❤️
              </p>
              <p style="margin: 12px 0 0; font-size: 12px; color: #999999;">
                © ${new Date().getFullYear()} Panda Cakes. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log("Order confirmation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-order-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
