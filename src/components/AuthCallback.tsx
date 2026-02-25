import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { COUNTRY_ID } from '@/config/country';

export const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session after OAuth redirect
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('🍎 [AuthCallback] Auth callback error:', error);
          toast.error('Authentication failed. Please try again.');
          navigate('/login');
          return;
        }

        if (session) {
          console.log('🍎 [AuthCallback] OAuth session established for user:', session.user.id);
          
          // Check if customer profile exists (may need to wait for auto-creation by AuthContext)
          let customer = null;
          let retries = 0;
          const maxRetries = 5;
          
          while (!customer && retries < maxRetries) {
            const { data, error: fetchError } = await supabase
              .from('Customers')
              .select('whatsapp_number, first_name, phone_verified')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (fetchError) {
              console.error('🍎 [AuthCallback] Error fetching customer:', fetchError);
            }
            
            customer = data;
            
            if (!customer && retries < maxRetries - 1) {
              console.log(`⏳ [AuthCallback] Customer profile not found, waiting... (attempt ${retries + 1}/${maxRetries})`);
              await new Promise(r => setTimeout(r, 500)); // Wait 500ms before retry
              retries++;
            } else if (!customer) {
              console.log('⏳ [AuthCallback] Customer profile still not found after retries, proceeding anyway');
            }
          }

          if (customer) {
            console.log('🍎 [AuthCallback] Customer profile found:', { 
              hasPhone: !!customer.whatsapp_number, 
              phoneVerified: customer.phone_verified,
              firstName: customer.first_name 
            });

            // Ensure country_id is set correctly for existing profiles
            await supabase
              .from('Customers')
              .update({ country_id: COUNTRY_ID, preferred_country: COUNTRY_ID })
              .eq('id', session.user.id);
          } else {
            // OAuth user with no profile yet — create one with correct country
            console.log('🍎 [AuthCallback] No customer profile, creating with country_id:', COUNTRY_ID);
            const fullName = session.user.user_metadata?.full_name || '';
            const [firstName, ...lastParts] = fullName.split(' ');
            const userEmail = session.user.email;
            const isRealEmail = userEmail && !userEmail.includes('@temp.pandacakes.qa');

            await supabase.from('Customers').upsert({
              id: session.user.id,
              first_name: firstName || null,
              last_name: lastParts.join(' ') || null,
              email: isRealEmail ? userEmail : null,
              country_id: COUNTRY_ID,
              preferred_country: COUNTRY_ID,
              phone_verified: false,
            });
          }

          // Send welcome email for OAuth users with real email (not temp)
          const userEmail = session.user.email;
          if (userEmail && !userEmail.includes('@temp.pandacakes.qa')) {
            const firstName = session.user.user_metadata?.full_name?.split(' ')[0] 
              || customer?.first_name 
              || 'there';
            
            // Fire and forget - don't block the auth flow
            supabase.functions.invoke('send-welcome-email', {
              body: { email: userEmail, firstName }
            }).catch(err => console.error('Failed to send welcome email:', err));
          }

          // If no phone number, redirect to phone-setup (one-time only)
          if (!customer?.whatsapp_number || customer.whatsapp_number.trim() === '') {
            console.log('🍎 [AuthCallback] No phone number found, redirecting to phone-setup');
            toast.info('Please add your phone number to complete your profile');
            navigate('/phone-setup');
            return;
          }

          // Otherwise, redirect to homepage or return URL
          console.log('🍎 [AuthCallback] Phone verified, redirecting to app');
          toast.success('Welcome back!');
          const returnUrl = sessionStorage.getItem('return_after_login');
          sessionStorage.removeItem('return_after_login');
          sessionStorage.removeItem('auth_return_url');
          navigate(returnUrl || '/cart');
        } else {
          console.error('🍎 [AuthCallback] No valid session found');
          toast.error('No valid session found. Please try signing in again.');
          navigate('/login');
        }
      } catch (error) {
        console.error('🍎 [AuthCallback] Auth callback error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign-in...</p>
      </div>
    </div>
  );
};
