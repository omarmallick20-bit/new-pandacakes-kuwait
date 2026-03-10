import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Lock, CheckCircle2, HelpCircle } from 'lucide-react';
import { CartItem } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatQAR } from '@/utils/currencyHelpers';
import { PaymentErrorGuide } from './PaymentErrorGuide';
import { PaymentSupportModal } from './PaymentSupportModal';
import { useTranslation } from '@/hooks/useTranslation';

interface OrderDataForPayment {
  customerId: string;
  cartItems: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    customizations?: any;
  }[];
  deliveryAddressId: string | null;
  fulfillmentType: 'delivery' | 'pickup';
  deliveryDate: string;
  deliveryTime: string;
  customerNotes: string;
  isGift: boolean;
  giftRecipient: { name: string; phone: string } | null;
  vatPercentage: number;
  vatAmount: number;
  deliveryFee: number;
  totalAmount: number;
  countryId: string;
  cakeDetails: any;
  originalAmount?: number;
  voucherId?: string | null;
  voucherDiscount?: number;
  bakePointsApplied?: number;
  bakePointsDiscount?: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cartItems: CartItem[];
  totalAmount: number;
  isGift: boolean;
  paymentMethod: 'card' | 'cash';
  customerInfo?: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone: string;
  };
  vatEnabled?: boolean;
  vatPercentage?: number;
  vatAmount?: number;
  deliveryFee?: number;
  fulfillmentType?: 'delivery' | 'pickup';
  voucherDiscount?: number;
  voucherCode?: string;
  bakePointsDiscount?: number;
  bakePointsApplied?: number;
  orderData?: OrderDataForPayment;
}

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  cartItems,
  totalAmount,
  isGift,
  paymentMethod,
  customerInfo,
  vatEnabled = false,
  vatPercentage = 0,
  vatAmount = 0,
  deliveryFee: deliveryFeeProp = 0,
  fulfillmentType = 'delivery',
  voucherDiscount = 0,
  voucherCode,
  bakePointsDiscount = 0,
  bakePointsApplied = 0,
  orderData
}: PaymentModalProps) {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<{
    type: string;
    message: string;
  } | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setPaymentError(null);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isOpen]);

  const handlePayment = async () => {
    if (isProcessing) return;
    setPaymentError(null);
    setIsProcessing(true);

    timeoutRef.current = setTimeout(() => {
      console.error('⏰ Payment request timed out after 30 seconds');
      setIsProcessing(false);
      setPaymentError({
        type: 'timeout',
        message: 'Payment request timed out. Please check your internet connection and try again.'
      });
    }, 30000);

    try {
      if (paymentMethod === 'cash') {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        onSuccess();
      } else {
        if (!orderData) {
          console.error('Missing orderData for card payment');
          setPaymentError({
            type: 'invalid_request',
            message: 'Order information missing. Please try again.'
          });
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setIsProcessing(false);
          return;
        }

        if (!customerInfo) {
          console.error('Missing customerInfo for card payment');
          setPaymentError({
            type: 'invalid_request',
            message: 'Customer information missing. Please try again.'
          });
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setIsProcessing(false);
          return;
        }

        console.log('Initiating Tap payment with order data, Amount:', totalAmount);

        const { data, error } = await supabase.functions.invoke('tap-create-charge-kw', {
          body: {
            amount: totalAmount,
            customerInfo,
            orderData
          }
        });

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        if (error) {
          console.error('Tap charge error:', error);
          setPaymentError({
            type: 'network',
            message: error.message || 'Failed to connect to payment gateway. Please try again.'
          });
          setIsProcessing(false);
          return;
        }

        if (!data) {
          console.error('No response from tap-create-charge');
          setPaymentError({
            type: 'api_error',
            message: 'No response from payment gateway. Please try again.'
          });
          setIsProcessing(false);
          return;
        }

        if (data.success && data.redirectUrl) {
          console.log('Redirecting to Tap payment page:', data.redirectUrl);
          console.log('Session ID:', data.sessionId);
          window.location.href = data.redirectUrl;
        } else {
          console.error('Tap charge failed:', data);
          setPaymentError({
            type: 'api_error',
            message: data.error || 'Unable to initialize payment. Please try again.'
          });
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setPaymentError({
        type: 'unknown',
        message: 'An unexpected error occurred. Please try again.'
      });
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setPaymentError(null);
    handlePayment();
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryFeeProp;
  const total = totalAmount;

  // Shared order summary component
  const OrderSummary = ({ showCodTotal = false }: { showCodTotal?: boolean }) => (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-2">{t('pay_order_summary')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{t('pay_subtotal')}</span>
            <span>{formatQAR(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('pay_delivery_fee')}</span>
            <span>{formatQAR(deliveryFee)}</span>
          </div>
          {voucherDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span className="break-words pr-2">{t('pay_discount')}{voucherCode ? ` (${voucherCode})` : ''}</span>
              <span>-{formatQAR(voucherDiscount)}</span>
            </div>
          )}
          {bakePointsDiscount > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>BakePoints ({bakePointsApplied})</span>
              <span>-{formatQAR(bakePointsDiscount)}</span>
            </div>
          )}
          {vatEnabled && vatAmount > 0 && (
            <div className="flex justify-between">
              <span>{t('checkout_vat')} ({vatPercentage}%)</span>
              <span>{formatQAR(vatAmount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>{showCodTotal ? t('pay_total_cod') : t('pay_total')}</span>
            <span>{formatQAR(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (paymentMethod === 'cash') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              {t('pay_cash_confirmed')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <OrderSummary showCodTotal />

            <p className="text-sm text-muted-foreground text-center">
              {t('pay_cash_note').replace('{amount}', formatQAR(total))}
            </p>

            <Button onClick={handlePayment} disabled={isProcessing} className="w-full" variant="hero">
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('pay_processing')}
                </>
              ) : (
                t('pay_confirm_cash')
              )}
            </Button>
          </div>
        </DialogContent>

        <PaymentSupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t('pay_secure_card')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {paymentError && (
              <PaymentErrorGuide
                errorType={paymentError.type}
                errorMessage={paymentError.message}
                onRetry={handleRetry}
                onContactSupport={() => setShowSupportModal(true)}
              />
            )}

            {!paymentError && (
              <>
                <OrderSummary />

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span>{t('pay_secure_tap')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span>{t('pay_amounts_qar')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span>{t('pay_order_after_payment')}</span>
                  </div>
                </div>

                <Button onClick={handlePayment} disabled={isProcessing} className="w-full" variant="hero">
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {t('pay_redirecting')}
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      {t('pay_securely').replace('{amount}', formatQAR(total))}
                    </>
                  )}
                </Button>

                <Button variant="link" size="sm" className="w-full text-xs" onClick={() => setShowSupportModal(true)}>
                  <HelpCircle className="w-3 h-3 mr-1" />
                  {t('pay_need_help')}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PaymentSupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </>
  );
}
