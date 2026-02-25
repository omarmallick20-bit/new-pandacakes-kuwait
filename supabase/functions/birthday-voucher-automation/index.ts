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

    console.log('Starting birthday voucher automation for Qatar...');

    // Create birthday vouchers for customers with birthdays this month
    const { data: voucherCount, error: voucherError } = await supabase
      .rpc('create_birthday_vouchers', { country_code: COUNTRY_CODE });

    if (voucherError) {
      console.error('Error creating birthday vouchers:', voucherError);
      throw voucherError;
    }

    console.log(`Created ${voucherCount} birthday vouchers for Qatar`);

    // Process any pending WhatsApp notifications
    const { data: pendingMessages, error: messagesError } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('status', 'pending')
      .eq('message_type', 'birthday_voucher')
      .eq('country_id', COUNTRY_CODE)
      .limit(50);

    if (messagesError) {
      console.error('Error fetching pending messages:', messagesError);
      throw messagesError;
    }

    console.log(`Found ${pendingMessages?.length || 0} pending birthday voucher messages`);

    // Send notifications via WhatsApp function if messages are pending
    let messagesSent = 0;
    if (pendingMessages && pendingMessages.length > 0) {
      // Call the WhatsApp notifications function to process pending messages
      const whatsappResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process_pending'
        })
      });

      if (whatsappResponse.ok) {
        const result = await whatsappResponse.json();
        messagesSent = result.processed || 0;
        console.log(`Processed ${messagesSent} WhatsApp messages`);
      } else {
        console.error('Error calling WhatsApp notifications function:', await whatsappResponse.text());
      }
    }

    return new Response(JSON.stringify({
      success: true,
      vouchers_created: voucherCount,
      messages_sent: messagesSent,
      message: `Birthday automation completed: ${voucherCount} vouchers created, ${messagesSent} messages sent`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in birthday-voucher-automation function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});