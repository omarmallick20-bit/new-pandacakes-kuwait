import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process all active countries
const ACTIVE_COUNTRIES = ['qa', 'kw'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting birthday voucher automation for all countries...');

    let totalVouchers = 0;
    let totalMessages = 0;

    for (const countryCode of ACTIVE_COUNTRIES) {
      console.log(`Processing country: ${countryCode}`);

      const { data: voucherCount, error: voucherError } = await supabase
        .rpc('create_birthday_vouchers', { country_code: countryCode });

      if (voucherError) {
        console.error(`Error creating birthday vouchers for ${countryCode}:`, voucherError);
        continue;
      }

      const created = voucherCount || 0;
      totalVouchers += created;
      console.log(`Created ${created} birthday vouchers for ${countryCode}`);

      // Process pending WhatsApp notifications for this country
      const { data: pendingMessages, error: messagesError } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .eq('status', 'pending')
        .eq('message_type', 'birthday_voucher')
        .eq('country_id', countryCode)
        .limit(50);

      if (messagesError) {
        console.error(`Error fetching pending messages for ${countryCode}:`, messagesError);
        continue;
      }

      console.log(`Found ${pendingMessages?.length || 0} pending birthday voucher messages for ${countryCode}`);

      if (pendingMessages && pendingMessages.length > 0) {
        const whatsappResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-notifications`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'process_pending' })
        });

        if (whatsappResponse.ok) {
          const result = await whatsappResponse.json();
          const sent = result.processed || 0;
          totalMessages += sent;
          console.log(`Processed ${sent} WhatsApp messages for ${countryCode}`);
        } else {
          console.error(`Error calling WhatsApp notifications for ${countryCode}:`, await whatsappResponse.text());
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      vouchers_created: totalVouchers,
      messages_sent: totalMessages,
      countries_processed: ACTIVE_COUNTRIES,
      message: `Birthday automation completed: ${totalVouchers} vouchers created, ${totalMessages} messages sent`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in birthday-voucher-automation function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
