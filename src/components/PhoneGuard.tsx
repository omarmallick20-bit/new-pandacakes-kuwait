import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AUTH_TIMEOUT_MS = 10000; // 10 seconds max wait for auth

export const PhoneGuard = () => {
  const { user, customerProfile, isLoading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);

  // Auth timeout fallback - prevent infinite loading
  useEffect(() => {
    if (isAuthReady) {
      setAuthTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      if (!isAuthReady) {
        console.warn('⏱️ [PhoneGuard] Auth timeout - proceeding as guest');
        setAuthTimedOut(true);
      }
    }, AUTH_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [isAuthReady]);

  useEffect(() => {
    const checkUserSetup = async () => {
      // Wait for auth to be fully ready
      if (!isAuthReady && !authTimedOut) return;

      // Guest users: Allow immediate access
      if (!user) {
        setIsCheckingSetup(false);
        return;
      }

      // User exists but no profile (e.g. deleted from DB) - treat as guest
      if (!customerProfile && isAuthReady) {
        console.warn('[PhoneGuard] User has no profile, allowing guest access');
        setIsCheckingSetup(false);
        return;
      }

      // Check phone from customerProfile (no extra query!)
      const hasPhone = customerProfile?.whatsapp_number && 
                       customerProfile.whatsapp_number.trim() !== '';
      const phoneVerified = customerProfile?.phone_verified === true;
      const phoneSkipped = localStorage.getItem('phone_setup_skipped') === 'true';

      // Step 1: Check phone verification for ALL routes (allow skip for browsing)
      if (!hasPhone || !phoneVerified) {
        if (!phoneSkipped) {
          toast.info('Please verify your phone number to continue');
          navigate('/phone-setup');
          setIsCheckingSetup(false);
          return;
        }
        // User skipped - allow browsing but will block at checkout
      }

      // Step 2: Check if user has at least one address
      try {
        const { data: addresses, error } = await supabase
          .from('addresses')
          .select('id')
          .eq('customer_id', user.id)
          .limit(1);

        if (error) {
          console.error('[PhoneGuard] Error checking addresses:', error);
          setIsCheckingSetup(false);
          return;
        }

        const hasAddress = addresses && addresses.length > 0;
        const addressSkipped = localStorage.getItem('address_setup_skipped') === 'true';

        if (!hasAddress && !addressSkipped) {
          toast.info('Please add your delivery address to continue');
          navigate('/address-setup');
          setIsCheckingSetup(false);
          return;
        }

        // User has completed both steps - allow access
        setIsCheckingSetup(false);
      } catch (error) {
        console.error('[PhoneGuard] Error checking user setup:', error);
        setIsCheckingSetup(false);
      }
    };

    checkUserSetup();
  }, [user, customerProfile, isAuthReady, authTimedOut, location.pathname, navigate]);

  // Show loading only during initial auth (with timeout fallback)
  if ((isLoading || !isAuthReady || isCheckingSetup) && !authTimedOut && user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Auth timed out but user can still proceed
  if (authTimedOut && !isAuthReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Connection is slow...</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload
        </Button>
        {/* Still render the outlet - let user proceed */}
        <div className="w-full">
          <Outlet />
        </div>
      </div>
    );
  }

  return <Outlet />;
};
