import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDataContext } from '@/contexts/DataContext';
import { Loader2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

/**
 * AppReadyGuard prevents route components from rendering
 * until both auth and data contexts are fully initialized.
 * This prevents React Error #310 (invalid hook call) from race conditions.
 */
export function AppReadyGuard({ children }: Props) {
  const { isAuthReady } = useAuth();
  const { isDataReady } = useDataContext();
  
  // Only show loading on truly fresh loads (no cached data)
  if (!isAuthReady || !isDataReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-tiffany" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}
