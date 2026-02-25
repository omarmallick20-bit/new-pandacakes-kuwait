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

    const { action, phone_number, message, message_type, customer_id, log_id } = await req.json();

    switch (action) {
      case 'send_message':
        return await sendWhatsAppMessage(supabase, phone_number, message, message_type, customer_id);
      
      case 'process_pending':
        return await processPendingMessages(supabase);
      
      case 'update_status':
        return await updateMessageStatus(supabase, log_id, 'delivered');
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error in whatsapp-notifications function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function sendWhatsAppMessage(supabase: any, phone_number: string, message: string, message_type: string, customer_id: string) {
  try {
    // Log the message attempt
    const { data: logData, error: logError } = await supabase
      .from('whatsapp_logs')
      .insert({
        customer_id,
        phone_number,
        message_type,
        message_content: message,
        status: 'sending',
        country_id: COUNTRY_CODE
      })
      .select()
      .single();

    if (logError) {
      throw logError;
    }

    // Here you would integrate with Twilio WhatsApp API
    // For now, we'll simulate the sending process
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (twilioAccountSid && twilioAuthToken && twilioWhatsAppNumber) {
      // Twilio WhatsApp API integration
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      
      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'From': `whatsapp:${twilioWhatsAppNumber}`,
          'To': `whatsapp:${phone_number}`,
          'Body': message
        })
      });

      if (response.ok) {
        // Update status to sent
        await supabase
          .from('whatsapp_logs')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', logData.id);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'WhatsApp message sent successfully',
          log_id: logData.id 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        const errorText = await response.text();
        throw new Error(`Twilio API error: ${errorText}`);
      }
    } else {
      // Update status to pending if Twilio credentials not configured
      await supabase
        .from('whatsapp_logs')
        .update({ status: 'pending' })
        .eq('id', logData.id);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Message queued for sending (Twilio not configured)',
        log_id: logData.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    
    // Update status to failed
    if (customer_id) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await supabase
          .from('whatsapp_logs')
          .update({ 
            status: 'failed', 
            error_message: errorMessage 
          })
        .eq('customer_id', customer_id)
        .eq('status', 'sending');
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function processPendingMessages(supabase: any) {
  try {
    // Get pending messages
    const { data: pendingMessages, error } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('status', 'pending')
      .eq('country_id', COUNTRY_CODE)
      .limit(50); // Process in batches

    if (error) {
      throw error;
    }

    const results = [];
    for (const message of pendingMessages || []) {
      const result = await sendWhatsAppMessage(
        supabase,
        message.phone_number,
        message.message_content,
        message.message_type,
        message.customer_id
      );
      results.push({
        log_id: message.id,
        success: result.ok
      });
    }

    return new Response(JSON.stringify({ 
      processed: results.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing pending messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function updateMessageStatus(supabase: any, log_id: string, status: string) {
  try {
    const { error } = await supabase
      .from('whatsapp_logs')
      .update({ status })
      .eq('id', log_id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Status updated successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating message status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}