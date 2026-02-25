import { cn } from '@/lib/utils';

interface DiscountBadgeProps {
  percentage: number;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Red discount badge showing percentage off
 * Positioned absolutely on product images
 */
export function DiscountBadge({ 
  percentage, 
  className,
  size = 'md' 
}: DiscountBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1'
  };

  return (
    <div className={cn(
      'absolute top-3 left-3 bg-destructive text-destructive-foreground font-bold rounded-lg shadow-md z-10',
      sizeClasses[size],
      className
    )}>
      -{Math.round(percentage)}%
    </div>
  );
}
