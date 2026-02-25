import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

interface CategoryErrorFallbackProps {
  error: string;
  onRetry: () => void;
  onGoHome: () => void;
}

export const CategoryErrorFallback = ({ 
  error, 
  onRetry, 
  onGoHome 
}: CategoryErrorFallbackProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-gradient-to-br from-tiffany/20 to-accent/20 p-6">
            <AlertCircle className="w-12 h-12 text-tiffany" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            {t('cat_error_title')}
          </h2>
          <p className="text-muted-foreground">
            {error || t('cat_error_default')}
          </p>
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          <Button
            onClick={onRetry}
            variant="default"
            className="gap-2 bg-tiffany hover:bg-tiffany/90 text-white"
          >
            <RefreshCw className="w-4 h-4" />
            {t('cat_error_try_again')}
          </Button>
          <Button
            onClick={onGoHome}
            variant="outline"
            className="gap-2 border-tiffany text-tiffany hover:bg-tiffany/10"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('cat_error_back')}
          </Button>
        </div>
      </div>
    </div>
  );
};
