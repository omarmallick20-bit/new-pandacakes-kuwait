import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FCC SMS API endpoint
const FCC_ENDPOINT = 'https://api.future-club.com/falconapi/fccsms.aspx';

// OTP configuration
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_REQUESTS_PER_WINDOW = 999;
const RATE_LIMIT_WINDOW_MINUTES = 10;

// Success pattern: "00" optionally followed by space and track ID
const SUCCESS_PATTERN = /^00(\s|$)/;

// FCC fetch timeout in milliseconds
const FCC_FETCH_TIMEOUT_MS = 15000;

// Proxy-aware fetch: routes through Fixie HTTP proxy if HTTPS_PROXY is set
async function proxyFetch(url: string, headers: Record<string, string>, countryId?: string): Promise<{ ok: boolean; status: number; text: string; contentType: string }> {
  // Select proxy based on country: KW uses its own Fixie proxy, others use default (Qatar)
  let proxyUrl: string | undefined = countryId === 'kw'
    ? (Deno.env.get('HTTPS_PROXY_KW') || Deno.env.get('HTTP_PROXY_KW'))
    : (Deno.env.get('HTTPS_PROXY') || Deno.env.get('HTTP_PROXY'));
  
  // Validate proxy URL -- fall back to direct fetch if placeholder or invalid
  if (proxyUrl && (proxyUrl.includes('PLACEHOLDER') || !proxyUrl.startsWith('http'))) {
    console.warn('[send-otp] Proxy URL is invalid/placeholder, falling back to direct fetch');
    proxyUrl = undefined;
  }

  if (!proxyUrl) {
    console.log('⚠️ [send-otp] No proxy configured, using direct fetch');
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), FCC_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: abortController.signal,
      });
      clearTimeout(timeoutId);
      const text = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        text: text.trim(),
        contentType: response.headers.get('content-type') || 'unknown',
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  console.log(`🔀 [send-otp] Using proxy: ${proxyUrl.replace(/:[^:@]+@/, ':***@')}`);

  // Parse proxy URL: http://user:pass@host:port
  const parsed = new URL(proxyUrl);
  const proxyHost = parsed.hostname;
  const proxyPort = parseInt(parsed.port) || 80;
  const proxyAuth = parsed.username && parsed.password
    ? btoa(`${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`)
    : null;

  // Parse target URL
  const targetUrl = new URL(url);
  const targetHost = targetUrl.hostname;
  const targetPort = targetUrl.port || (targetUrl.protocol === 'https:' ? '443' : '80');
  const isHttps = targetUrl.protocol === 'https:';

  if (isHttps) {
    // For HTTPS: use CONNECT tunnel
    const conn = await Deno.connect({ hostname: proxyHost, port: proxyPort });
    
    // Send CONNECT request
    let connectRequest = `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\n`;
    if (proxyAuth) {
      connectRequest += `Proxy-Authorization: Basic ${proxyAuth}\r\n`;
    }
    connectRequest += `\r\n`;
    
    await conn.write(new TextEncoder().encode(connectRequest));
    
    // Read CONNECT response
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    const connectResponse = new TextDecoder().decode(buf.subarray(0, n || 0));
    
    if (!connectResponse.includes('200')) {
      conn.close();
      throw new Error(`Proxy CONNECT failed: ${connectResponse.split('\r\n')[0]}`);
    }
    
    // Upgrade to TLS
    const tlsConn = await Deno.startTls(conn, { hostname: targetHost });
    
    // Build HTTP request
    const path = targetUrl.pathname + targetUrl.search;
    let httpRequest = `GET ${path} HTTP/1.1\r\nHost: ${targetHost}\r\n`;
    for (const [key, value] of Object.entries(headers)) {
      httpRequest += `${key}: ${value}\r\n`;
    }
    httpRequest += `Connection: close\r\n\r\n`;
    
    await tlsConn.write(new TextEncoder().encode(httpRequest));
    
    // Read response
    const chunks: Uint8Array[] = [];
    while (true) {
      const readBuf = new Uint8Array(8192);
      const bytesRead = await tlsConn.read(readBuf);
      if (bytesRead === null) break;
      chunks.push(readBuf.subarray(0, bytesRead));
    }
    tlsConn.close();
    
    // Combine chunks
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    const fullResponse = new TextDecoder().decode(combined);
    
    // Parse HTTP response
    const headerEnd = fullResponse.indexOf('\r\n\r\n');
    const responseHeaders = fullResponse.substring(0, headerEnd);
    const responseBody = fullResponse.substring(headerEnd + 4);
    
    const statusLine = responseHeaders.split('\r\n')[0];
    const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d+)/);
    const status = statusMatch ? parseInt(statusMatch[1]) : 0;
    
    const ctMatch = responseHeaders.match(/content-type:\s*([^\r\n]+)/i);
    const contentType = ctMatch ? ctMatch[1] : 'unknown';
    
    return {
      ok: status >= 200 && status < 300,
      status,
      text: responseBody.trim(),
      contentType,
    };
  } else {
    // For HTTP: simple proxy via GET with full URL
    const proxyHeaders: Record<string, string> = { ...headers };
    if (proxyAuth) {
      proxyHeaders['Proxy-Authorization'] = `Basic ${proxyAuth}`;
    }
    
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), FCC_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: proxyHeaders,
        signal: abortController.signal,
      });
      clearTimeout(timeoutId);
      const text = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        text: text.trim(),
        contentType: response.headers.get('content-type') || 'unknown',
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

// Send SMS via FCC API with both P parameter and X-API-KEY header
async function sendSmsViaFcc(phone: string, message: string, countryId?: string): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  const fccApiKey = Deno.env.get('FCC_API_KEY');
  
  if (!fccApiKey || fccApiKey.includes('PLACEHOLDER') || fccApiKey.length < 10) {
    console.error('❌ [send-otp] FCC_API_KEY is missing or contains a placeholder value');
    return { success: false, error: 'SMS service not configured -- contact support' };
  }

  // Debug: log first 8 chars of API key to verify correct secret is loaded
  console.log(`🔑 [send-otp] FCC_API_KEY prefix: ${fccApiKey.substring(0, 8)}... (length: ${fccApiKey.length})`);

  // Determine sender ID based on destination country
  const { code } = splitCountryCode(phone);
  const INFOSMS_COUNTRIES = ['91', '20', '216', '213', '961', '977', '966'];
  const senderId = INFOSMS_COUNTRIES.includes(code) ? 'InfoSMS' : 'PANDA CAKES';

  console.log(`📤 [send-otp] Sender ID: ${senderId} (country code: ${code})`);

  // Build query parameters - include P parameter for authentication
  const params = new URLSearchParams({
    IID: '2339',
    UID: 'userPanda',
    P: fccApiKey,
    S: senderId,
    G: phone,
    M: message,
    L: 'L'
  });

  const smsUrl = `${FCC_ENDPOINT}?${params.toString()}`;
  
  console.log(`📤 [send-otp] Sending SMS to: ${phone.slice(0, 3)}****${phone.slice(-3)}`);
  
  try {
    const result = await proxyFetch(smsUrl, {
      'Accept': 'text/plain',
      'User-Agent': 'PandaCakes/1.0',
      'X-API-KEY': fccApiKey,
    }, countryId);

    const fetchDuration = Date.now() - startTime;
    console.log(`⏱️ [send-otp] FCC fetch completed in ${fetchDuration}ms`);
    console.log(`📨 [send-otp] HTTP Status: ${result.status}`);
    console.log(`📨 [send-otp] Content-Type: ${result.contentType}`);
    console.log(`📨 [send-otp] Response body: "${result.text.substring(0, 100)}"`);

    // Success check: HTTP 2xx AND response matches "00" pattern
    if (result.ok && SUCCESS_PATTERN.test(result.text)) {
      console.log(`✅ [send-otp] SMS sent successfully in ${fetchDuration}ms`);
      return { success: true };
    }

    // Log detailed failure info
    console.error('❌ [send-otp] SMS send failed:');
    console.error(`   HTTP Status: ${result.status}`);
    console.error(`   Response (first 200 chars): ${result.text.substring(0, 200)}`);

    if (result.contentType.includes('html') || result.text.startsWith('<!DOCTYPE') || result.text.startsWith('<html')) {
      return { success: false, error: 'FCC returned HTML error page - possible IP whitelist issue' };
    }

    if (result.text.startsWith('30')) {
      return { success: false, error: 'FCC rejected request - IP not whitelisted or invalid credentials' };
    }

    return { success: false, error: `FCC returned: ${result.text.substring(0, 100)}` };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`❌ [send-otp] SMS provider timeout after ${FCC_FETCH_TIMEOUT_MS}ms`);
      return { success: false, error: 'SMS provider timeout - please try again' };
    }
    
    console.error('❌ [send-otp] Network error:', error);
    return { success: false, error: `Network error: ${error.message}` };
  }
}

function splitCountryCode(digitsOnly: string): { code: string; local: string } {
  const threeCodes = ['974','971','966','965','968','973','962','961','963','964','967','970','972','880','886','960','975','976','977','992','993','994','995','996','998','212','213','216','218','351','353','358','370','371','372','373','374','375','380','381','420','421','502','503','504','505','506','507','591','592','593','595','670','673','674','675','676','677','678','679','852','853','855','856'];
  const twoCodes = ['93','94','95','98','20','27','30','31','32','33','34','36','39','40','41','43','44','45','46','47','48','49','51','52','53','54','55','56','57','58','60','61','62','63','64','65','66','81','82','84','86','90','91','92'];
  const oneCodes = ['1','7'];
  const d3 = digitsOnly.substring(0, 3);
  const d2 = digitsOnly.substring(0, 2);
  const d1 = digitsOnly.substring(0, 1);
  if (threeCodes.includes(d3)) return { code: d3, local: digitsOnly.substring(3) };
  if (twoCodes.includes(d2)) return { code: d2, local: digitsOnly.substring(2) };
  if (oneCodes.includes(d1)) return { code: d1, local: digitsOnly.substring(1) };
  return { code: d3, local: digitsOnly.substring(3) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, user_id, purpose, country_id } = await req.json();
    const isPasswordReset = purpose === 'password_reset';
    const isSignupVerification = purpose === 'signup_verification';

    console.log(`📱 [send-otp] Request - Phone: ${phone_number}, Purpose: ${purpose || 'phone_verification'}`);

    if (!phone_number) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isPasswordReset && !isSignupVerification && !user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const digitsOnly = phone_number.replace(/\D/g, '');
    const withPlus = `+${digitsOnly}`;
    const smsPhoneNumber = digitsOnly;
    const normalizedPhone = withPlus;

    // For password reset, look up the user by phone number
    let resolvedUserId = user_id;
    if (isPasswordReset) {
      const { code: countryCode, local: localNumber } = splitCountryCode(digitsOnly);
      const withSpace = `+${countryCode} ${localNumber}`;
      const last8 = digitsOnly.slice(-8);
      
      const { data: customers, error: customerError } = await supabase
        .from('Customers')
        .select('id, whatsapp_number')
        .or(`whatsapp_number.eq.${withPlus},whatsapp_number.eq.${digitsOnly},whatsapp_number.eq.${withSpace},whatsapp_number.ilike.%${last8}`)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const customer = customers?.[0] || null;

      if (customerError) {
        console.error('❌ [send-otp] Error looking up customer:', customerError);
        return new Response(
          JSON.stringify({ error: 'Failed to process request' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!customer) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No account found with this phone number. Please sign up first.',
            error_code: 'ACCOUNT_NOT_FOUND'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      resolvedUserId = customer.id;
      console.log(`✅ [send-otp] Found customer for password reset: ${resolvedUserId}`);
    }

    // Rate limiting (very permissive - FCC handles their own throttling)
    const rateLimitWindow = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    
    const { data: recentRequests, error: rateError } = await supabase
      .from('phone_verifications')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .gte('created_at', rateLimitWindow);

    if (rateError) {
      console.error('❌ [send-otp] Rate limit check error:', rateError);
    }

    if (recentRequests && recentRequests.length >= MAX_OTP_REQUESTS_PER_WINDOW) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait before requesting another code.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 4-digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: normalizedPhone,
        otp_code: otpCode,
        expires_at: expiresAt,
        user_id: resolvedUserId,
        verified: false,
        attempts: 0
      });

    if (insertError) {
      console.error('❌ [send-otp] Failed to store OTP:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = `${otpCode} is your Panda Cakes code. Don't share it.`;
    const smsResult = await sendSmsViaFcc(smsPhoneNumber, message, country_id);

    if (smsResult.success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Verification code sent',
          expires_in_minutes: OTP_EXPIRY_MINUTES
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error(`❌ [send-otp] SMS delivery failed: ${smsResult.error}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to send verification code. Please try again.',
          details: smsResult.error,
          code_stored: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ [send-otp] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred', details: error.message || String(error) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
