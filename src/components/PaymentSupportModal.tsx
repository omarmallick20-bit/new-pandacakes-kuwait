import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Mail, Clock } from 'lucide-react';

interface PaymentSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
}

export function PaymentSupportModal({ isOpen, onClose, orderId }: PaymentSupportModalProps) {
  const whatsappNumber = '+97460018005';
  const phoneNumber = '+974 60018005';
  const supportEmail = 'hello@pandacakes.me';

  const handleWhatsApp = () => {
    const message = orderId 
      ? `Hi, I need help with payment for order ${orderId}`
      : 'Hi, I need help with a payment issue';
    window.open(`https://api.whatsapp.com/send/?phone=97460018005&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`, '_blank');
  };

  const handleEmail = () => {
    const subject = orderId ? `Payment Issue - Order ${orderId}` : 'Payment Issue';
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Need Help with Payment?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Our support team is here to help you resolve any payment issues quickly.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleWhatsApp}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              <div className="text-left flex-1">
                <div className="font-medium">WhatsApp Support</div>
                <div className="text-xs text-muted-foreground">Fastest response - usually within minutes</div>
              </div>
            </Button>

            <Button
              onClick={() => window.location.href = `tel:${phoneNumber.replace(/\s/g, '')}`}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
            >
              <Phone className="w-5 h-5 text-blue-600" />
              <div className="text-left flex-1">
                <div className="font-medium">Call Us</div>
                <div className="text-xs text-muted-foreground">{phoneNumber}</div>
              </div>
            </Button>

            <Button
              onClick={handleEmail}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
            >
              <Mail className="w-5 h-5 text-purple-600" />
              <div className="text-left flex-1">
                <div className="font-medium">Email Support</div>
                <div className="text-xs text-muted-foreground">{supportEmail}</div>
              </div>
            </Button>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <div className="font-medium text-foreground mb-1">Business Hours</div>
              <div>Saturday - Thursday: 9:00 AM - 9:00 PM</div>
              <div>Friday: 2:00 PM - 9:00 PM</div>
            </div>
          </div>

          {orderId && (
            <div className="text-xs text-muted-foreground text-center">
              Reference Order: {orderId}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
