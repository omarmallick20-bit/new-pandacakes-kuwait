import { AlertCircle, CreditCard, Wifi, Shield, Clock, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface PaymentErrorGuideProps {
  errorType: string;
  errorMessage?: string;
  onRetry?: () => void;
  onContactSupport?: () => void;
}

export function PaymentErrorGuide({ errorType, errorMessage, onRetry, onContactSupport }: PaymentErrorGuideProps) {
  const getErrorDetails = () => {
    const lowercaseError = errorType.toLowerCase();
    const message = errorMessage?.toLowerCase() || '';

    if (lowercaseError.includes('declined') || message.includes('declined')) {
      return {
        icon: CreditCard,
        title: 'Card Declined',
        description: 'Your card was declined by your bank. Please check your card details or try a different payment method.',
        suggestions: [
          'Verify your card number, expiry date, and CVV are correct',
          'Ensure you have sufficient funds in your account',
          'Contact your bank to authorize international payments',
          'Try using a different card'
        ]
      };
    }

    if (lowercaseError.includes('insufficient') || message.includes('insufficient')) {
      return {
        icon: CreditCard,
        title: 'Insufficient Funds',
        description: 'Your card does not have sufficient balance to complete this payment.',
        suggestions: [
          'Add funds to your account',
          'Try a different payment method',
          'Contact your bank for assistance'
        ]
      };
    }

    if (lowercaseError.includes('3d secure') || lowercaseError.includes('authentication') || message.includes('3d secure')) {
      return {
        icon: Shield,
        title: '3D Secure Verification Failed',
        description: 'The additional security verification with your bank was not completed.',
        suggestions: [
          'Make sure to complete the verification with your bank',
          'Check if you received an OTP from your bank',
          'Ensure you have 3D Secure enabled on your card',
          'Try again or use a different card'
        ]
      };
    }

    if (lowercaseError.includes('network') || lowercaseError.includes('timeout') || message.includes('network') || message.includes('timeout')) {
      return {
        icon: Wifi,
        title: 'Connection Issue',
        description: 'We couldn\'t connect to the payment service. This is usually temporary.',
        suggestions: [
          'Check your internet connection',
          'Wait a moment and try again',
          'Refresh the page if the issue persists'
        ]
      };
    }

    if (lowercaseError.includes('expired') || message.includes('expired')) {
      return {
        icon: Clock,
        title: 'Card Expired',
        description: 'The payment card you\'re trying to use has expired.',
        suggestions: [
          'Check your card expiry date',
          'Use a different card',
          'Contact your bank for a replacement card'
        ]
      };
    }

    if (lowercaseError.includes('invalid') || message.includes('invalid')) {
      return {
        icon: AlertCircle,
        title: 'Invalid Card Details',
        description: 'The card information provided appears to be incorrect.',
        suggestions: [
          'Double-check your card number',
          'Verify the expiry date (MM/YY format)',
          'Ensure the CVV is correct',
          'Try typing the details again carefully'
        ]
      };
    }

    // Generic error
    return {
      icon: HelpCircle,
      title: 'Payment Failed',
      description: errorMessage || 'We encountered an issue processing your payment.',
      suggestions: [
        'Wait a moment and try again',
        'Try a different payment method',
        'Clear your browser cache and retry',
        'Contact support if the issue continues'
      ]
    };
  };

  const details = getErrorDetails();
  const Icon = details.icon;

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <Icon className="h-4 w-4" />
        <AlertTitle>{details.title}</AlertTitle>
        <AlertDescription className="mt-2">
          {details.description}
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <p className="text-sm font-medium">What you can try:</p>
        <ul className="space-y-1.5">
          {details.suggestions.map((suggestion, index) => (
            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2 pt-2">
        {onRetry && (
          <Button onClick={onRetry} variant="default" className="flex-1">
            Try Again
          </Button>
        )}
        {onContactSupport && (
          <Button onClick={onContactSupport} variant="outline" className="flex-1">
            Contact Support
          </Button>
        )}
      </div>
    </div>
  );
}
