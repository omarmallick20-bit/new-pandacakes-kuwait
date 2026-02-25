import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customerInfo: { phone: string; name: string; email?: string }) => void;
  cakeName: string;
  totalPrice: number;
}

export function OrderConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  cakeName,
  totalPrice
}: OrderConfirmationModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handleNext = () => {
    if (currentStep === 1) {
      if (!phone.trim()) {
        toast({ title: 'Phone number is required', variant: 'destructive' });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!name.trim()) {
        toast({ title: 'Full name is required', variant: 'destructive' });
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // SMS confirmation demo
      onConfirm({ phone, name, email: email || undefined });
      handleClose();
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setPhone('');
    setName('');
    setEmail('');
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Confirm Your Order
              </h3>
              <p className="text-muted-foreground">
                {cakeName} - ${totalPrice}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+974 XXXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
            </div>
            <Button onClick={handleNext} className="w-full" size="lg">
              Next
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Your Information
              </h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1" size="lg">
                Next
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Email (Optional)
              </h3>
              <p className="text-sm text-muted-foreground">
                We'll send you order updates if provided
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1" size="lg">
                Continue
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                SMS Confirmation
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                We've sent a confirmation code to {phone}
              </p>
              <div className="p-4 bg-card rounded-2xl">
                <p className="text-sm text-muted-foreground mb-2">Demo Mode:</p>
                <p className="text-xs text-muted-foreground">
                  This is a demo - no actual SMS sent
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(3)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1" size="lg">
                Confirm Order
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Step {currentStep} of 4
          </DialogTitle>
        </DialogHeader>
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}