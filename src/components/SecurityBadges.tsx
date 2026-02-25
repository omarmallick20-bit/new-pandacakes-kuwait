import { Shield, Lock, CheckCircle2, CreditCard } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function SecurityBadges() {
  const badges = [
    {
      icon: Lock,
      label: '256-bit SSL',
      tooltip: 'Your payment information is encrypted with bank-level security'
    },
    {
      icon: Shield,
      label: 'PCI DSS',
      tooltip: 'Payment Card Industry Data Security Standard compliant'
    },
    {
      icon: CheckCircle2,
      label: '3D Secure',
      tooltip: 'Additional authentication layer for your protection'
    },
    {
      icon: CreditCard,
      label: 'Tap Payments',
      tooltip: 'Powered by Tap - a leading payment gateway in the region'
    }
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 gap-2">
        {badges.map((badge, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-help">
                <badge.icon className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium">{badge.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-xs">{badge.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
