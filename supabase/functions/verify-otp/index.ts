import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 5;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, otp_code, user_id, purpose } = await req.json();
    const isPasswordReset = purpose === 'password_reset';
    const isSignupVerification = purpose === 'signup_verification';

    console.log(`🔐 [verify-otp] Received verification request for phone: ${phone_number}, purpose: ${purpose || 'phone_verification'}`);

    if (!phone_number || !otp_code) {
      return new Response(
        JSON.stringify({ error: 'Phone number and OTP code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isPasswordReset && !isSignupVerification && !user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/^\d{4}$/.test(otp_code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const digitsOnly = phone_number.replace(/\D/g, '');
    const normalizedPhone = `+${digitsOnly}`;

    let query = supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (!isPasswordReset && !isSignupVerification && user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: otpRecord, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      console.error('❌ [verify-otp] Database error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Verification failed. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ success: false, error: 'Verification code expired or not found. Please request a new code.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many failed attempts. Please request a new code.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (otpRecord.otp_code !== otp_code) {
      await supabase
        .from('phone_verifications')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      const remainingAttempts = MAX_ATTEMPTS - otpRecord.attempts - 1;
      return new Response(
        JSON.stringify({ success: false, error: 'Incorrect OTP entered, please enter the correct one', remaining_attempts: remainingAttempts }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [verify-otp] OTP verified successfully for phone: ${normalizedPhone}`);

    // Mark OTP as verified
    await supabase
      .from('phone_verifications')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    if (!isPasswordReset && !isSignupVerification) {
      // Try to update customer profile - handle unique constraint conflict
      const { error: profileError } = await supabase
        .from('Customers')
        .update({ 
          phone_verified: true,
          whatsapp_number: normalizedPhone
        })
        .eq('id', user_id);

      if (profileError) {
        // Handle unique constraint violation on whatsapp_number
        if (profileError.code === '23505' && profileError.message?.includes('whatsapp_number')) {
          console.warn(`⚠️ [verify-otp] Phone conflict for ${normalizedPhone} - clearing from old record and retrying`);
          
          // Clear the phone from the conflicting (old/stub) customer record
          const { error: clearError } = await supabase
            .from('Customers')
            .update({ whatsapp_number: null, phone_verified: false })
            .eq('whatsapp_number', normalizedPhone)
            .neq('id', user_id);

          if (clearError) {
            console.error('❌ [verify-otp] Failed to clear conflicting phone:', clearError);
            // Still mark as verified even if we can't reassign the number
            await supabase
              .from('Customers')
              .update({ phone_verified: true })
              .eq('id', user_id);
          } else {
            // Retry the update now that the conflict is resolved
            const { error: retryError } = await supabase
              .from('Customers')
              .update({ 
                phone_verified: true,
                whatsapp_number: normalizedPhone
              })
              .eq('id', user_id);

            if (retryError) {
              console.error('❌ [verify-otp] Retry update failed:', retryError);
              // At minimum mark phone_verified
              await supabase
                .from('Customers')
                .update({ phone_verified: true })
                .eq('id', user_id);
            }
          }
        } else {
          console.error('❌ [verify-otp] Failed to update customer profile:', profileError);
          // Don't block verification - OTP was correct
          await supabase
            .from('Customers')
            .update({ phone_verified: true })
            .eq('id', user_id);
        }
      }

      // Cleanup old OTPs
      await supabase
        .from('phone_verifications')
        .delete()
        .eq('phone_number', normalizedPhone)
        .eq('user_id', user_id)
        .neq('id', otpRecord.id);

      console.log(`✅ [verify-otp] Phone verification complete for user: ${user_id}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Phone number verified successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [verify-otp] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
