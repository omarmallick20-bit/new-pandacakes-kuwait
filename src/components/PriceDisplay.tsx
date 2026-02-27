import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { formatAmount } from '@/utils/currencyHelpers';

interface PriceDisplayProps {
  originalPrice: number;
  discountedPrice?: number;
  hasDiscount?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  currency?: string;
  className?: string;
  layout?: 'inline' | 'stacked';
}

export function PriceDisplay({ 
  originalPrice, 
  discountedPrice, 
  hasDiscount = false,
  size = 'md',
  currency,
  className,
  layout = 'inline'
}: PriceDisplayProps) {
  const { toArabicNumerals, currencyLabel } = useTranslation();
  const displayCurrency = currency || currencyLabel;

  const sizeClasses = {
    xs: { original: 'text-[10px]', discount: 'text-xs font-semibold' },
    sm: { original: 'text-xs', discount: 'text-sm font-bold' },
    md: { original: 'text-sm', discount: 'text-base font-bold' },
    lg: { original: 'text-base', discount: 'text-xl font-black' }
  };

  if (!hasDiscount || discountedPrice === undefined) {
    return (
      <span className={cn(`text-tiffany ${sizeClasses[size].discount}`, className)}>
        {displayCurrency} {toArabicNumerals(formatAmount(originalPrice))}
      </span>
    );
  }

  const isStacked = layout === 'stacked';
  
  return (
    <div className={cn(
      isStacked ? 'flex flex-col items-end' : 'flex items-center gap-2',
      className
    )}>
      <span className={cn(
        'text-muted-foreground line-through',
        sizeClasses[size].original
      )}>
        {toArabicNumerals(formatAmount(originalPrice))} {displayCurrency}
      </span>
      <span className={cn(
        'text-destructive',
        sizeClasses[size].discount
      )}>
        {toArabicNumerals(formatAmount(discountedPrice))} {displayCurrency}
      </span>
    </div>
  );
}