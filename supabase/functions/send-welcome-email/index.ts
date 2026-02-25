import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName }: WelcomeEmailRequest = await req.json();

    // Skip temp emails
    if (!email || email.includes('@temp.pandacakes.qa')) {
      console.log('Skipping welcome email - temp or missing email:', email);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'temp_email' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending welcome email to ${email} (${firstName})`);

    const emailResponse = await resend.emails.send({
      from: "Panda Cakes <order-noreply@pandacakes.me>",
      to: [email],
      subject: "Welcome to Panda Cakes! 🐼🎂",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Panda Cakes</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #40E0D0 0%, #FFD700 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; font-size: 32px; color: #ffffff; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">🐼 Panda Cakes</h1>
            </td>
          </tr>
          
          <!-- Welcome Message -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; color: #333333;">Welcome, ${firstName || 'there'}! 🎉</h2>
              <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                Thank you for joining the Panda Cakes family! We're thrilled to have you with us. Get ready to experience the most delicious cakes in Qatar! 🎂
              </p>
              
              <div style="background-color: #f8f9fa; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="margin: 0 0 16px; font-size: 18px; color: #333333;">What you can do:</h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #666666; line-height: 1.8;">
                  <li>Browse our delicious cake collection</li>
                  <li>Earn BakePoints with every order 🌟</li>
                  <li>Get exclusive birthday vouchers</li>
                  <li>Save your favorite cakes to wishlist</li>
                </ul>
              </div>
              
              <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                We can't wait to bake something special for you!
              </p>
            </td>
          </tr>
          
          <!-- Branch Contact Details -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background: linear-gradient(135deg, #40E0D0 0%, #48D1CC 100%); border-radius: 12px; padding: 24px; color: #ffffff;">
                <h3 style="margin: 0 0 16px; font-size: 18px;">📍 Visit Us</h3>
                <p style="margin: 0 0 8px; font-size: 14px;">
                  <strong>Address:</strong> Barwa Village, Doha, Qatar
                </p>
                <p style="margin: 0 0 8px; font-size: 14px;">
                  <strong>Hours:</strong> Open Daily 8:00 AM – 9:00 PM
                </p>
                <p style="margin: 0 0 8px; font-size: 14px;">
                  <strong>WhatsApp:</strong> +974 60018005
                </p>
                <p style="margin: 0 0 8px; font-size: 14px;">
                  <strong>Phone:</strong> +974 60018005 / +974 60019344
                </p>
                <p style="margin: 0; font-size: 14px;">
                  <strong>Instagram:</strong> @pandacakes.qa
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 12px; color: #999999;">
                © ${new Date().getFullYear()} Panda Cakes. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #999999;">
                This email was sent because you signed up at pandacakes.me
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

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
