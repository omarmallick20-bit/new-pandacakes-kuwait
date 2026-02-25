import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Banknote, AlertCircle, Loader2 } from 'lucide-react';
import { formatQAR } from '@/utils/currencyHelpers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RetryPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: {
    id: string;
    order_number: string;
    total_amount: number;
    payment_method: string;
    payment_status?: string;
  };
  customerInfo: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone: string;
  };
}

export function RetryPaymentModal({ isOpen, onClose, onSuccess, order, customerInfo }: RetryPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>(
    order.payment_method === 'cash' ? 'cash' : 'card'
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRetryPayment = async () => {
    setIsProcessing(true);
    
    try {
      if (paymentMethod === 'cash') {
        // Update order to cash payment
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            payment_method: 'cash',
            payment_status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (updateError) throw updateError;

        toast.success('Payment method updated to Cash on Delivery');
        onSuccess();
      } else {
        // Retry card payment via edge function
        const { data, error } = await supabase.functions.invoke('tap-retry-payment-kw', {
          body: {
            orderId: order.id,
            amount: order.total_amount,
            customerInfo
          }
        });

        if (error) {
          console.error('Retry payment error:', error);
          toast.error('Failed to retry payment. Please try again.');
          return;
        }

        if (data?.success && data?.redirectUrl) {
          // Redirect to Tap payment page
          window.location.href = data.redirectUrl;
        } else {
          toast.error('Unable to initialize payment. Please try again.');
        }
      }
    } catch (error) {
      console.error('Retry payment error:', error);
      toast.error('Failed to retry payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Retry Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">Payment Failed</p>
              <p className="text-xs mt-1">You can retry with the same method or switch to cash on delivery.</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Number</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatQAR(order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Select Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value: 'card' | 'cash') => setPaymentMethod(value)}>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="card" id="retry-card" />
                  <Label htmlFor="retry-card" className="flex items-center gap-2 flex-1 cursor-pointer">
                    <CreditCard className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Credit/Debit Card</div>
                      <div className="text-xs text-muted-foreground">Secure payment via Tap</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="cash" id="retry-cash" />
                  <Label htmlFor="retry-cash" className="flex items-center gap-2 flex-1 cursor-pointer">
                    <Banknote className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Cash on Delivery</div>
                      <div className="text-xs text-muted-foreground">Pay when you receive</div>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleRetryPayment} className="flex-1" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Retry Payment'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
