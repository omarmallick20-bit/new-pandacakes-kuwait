import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { retryWithBackoff } from '@/utils/retryWithBackoff';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAddress?: boolean;
}

export const ProtectedRoute = ({ children, requireAddress = false }: ProtectedRouteProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const [hasAddress, setHasAddress] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    if (requireAddress) {
      checkUserAddress();
    } else {
      setIsChecking(false);
    }
  }, [user, authLoading, requireAddress, navigate]);

  const checkUserAddress = async () => {
    if (!user) return;

    try {
      const data = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase
            .from('addresses')
            .select('id')
            .eq('customer_id', user.id)
            .limit(1);

          if (error) throw error;
          return data;
        },
        { operationName: 'checkUserAddress' }
      );

      const userHasAddress = data && data.length > 0;
      setHasAddress(userHasAddress);

      if (!userHasAddress) {
        navigate('/address-setup');
      }
    } catch (error) {
      console.error('Error checking user address:', error);
      navigate('/address-setup');
    } finally {
      setIsChecking(false);
    }
  };

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-tiffany" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (requireAddress && !hasAddress) {
    return null; // Will redirect to address setup
  }

  return <>{children}</>;
};