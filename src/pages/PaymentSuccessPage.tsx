import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, MessageCircle, Home, User, Calendar, MapPin, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatQAR } from '@/utils/currencyHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { clearCartInDB, clearCartFromLocalStorage, setCheckoutComplete, resetCheckoutFlag } from '@/utils/cartSync';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const KUWAIT_TIMEZONE = 'Asia/Kuwait';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, customerProfile } = useAuth();
  const { dispatch } = useAppContext();
  const [orderData, setOrderData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'pending' | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const toastShownRef = useRef(false);
  const maxRetries = 5; // Max retries waiting for webhook to create order

  // Show success toast when payment is successful
  useEffect(() => {
    if (paymentStatus === 'success' && orderDetails && !toastShownRef.current) {
      toastShownRef.current = true;
      
      const formattedDate = orderDetails.estimated_delivery_time 
        ? (() => {
            const start = new Date(orderDetails.estimated_delivery_time);
            const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
            return `${format(start, 'MMM d, yyyy h:mm a')} - ${format(end, 'h:mm a')}`;
          })()
        : 'your scheduled date';
      const fulfillmentText = orderDetails.fulfillment_type === 'pickup' ? 'Store Pickup' : 'Delivery';
      const formattedTotal = formatQAR(orderDetails.total_amount || 0);
      
      toast.success(
        `Your order (${orderDetails.order_number}) for ${formattedTotal} was placed via ${fulfillmentText} on ${formattedDate}. Check your profile under orders to see your order details.`,
        { duration: 8000, position: 'bottom-right' }
      );
    }
  }, [paymentStatus, orderDetails]);

  // Track if cart has been cleared to avoid duplicate clears
  const cartClearedRef = useRef(false);

  // SET CHECKOUT FLAG IMMEDIATELY on mount - blocks AppContext revalidation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tapChargeId = searchParams.get('tap_id');
    
    // Set flag IMMEDIATELY on mount if coming from payment
    if (tapChargeId) {
      setCheckoutComplete(true);
    }
    
    // Cleanup when leaving page - reset after delay
    return () => {
      setTimeout(() => resetCheckoutFlag(), 2000);
    };
  }, [location.search]);

  // Cart clearing helper - only called after confirmed successful payment
  const clearCartAfterSuccess = () => {
    if (cartClearedRef.current || !user?.id) return;
    cartClearedRef.current = true;
    console.log('🛒 Clearing cart after CONFIRMED successful payment');
    dispatch({ type: 'CLEAR_CART' });
    clearCartFromLocalStorage(user.id);
    clearCartInDB(user.id)
      .then(() => console.log('✅ Cart cleared from DB after confirmed payment'))
      .catch((error) => console.error('Failed to clear cart from DB:', error));
  };

  // Clear cart when payment is confirmed successful
  useEffect(() => {
    if (paymentStatus === 'success') {
      clearCartAfterSuccess();
    }
  }, [paymentStatus]);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      // Get order data from navigation state or query params
      const stateData = location.state?.orderData;
      const searchParams = new URLSearchParams(location.search);
      const tapChargeId = searchParams.get('tap_id');

      if (stateData) {
        // If we have order data in state (from cash payment or direct navigation)
        setOrderData(stateData);
        setPaymentStatus(stateData.paymentMethod === 'cash' ? 'success' : null);
        setIsLoading(false);
      } else if (tapChargeId) {
        // If redirected from Tap Payments, check for the order
        // The order is created by the webhook, so it might not exist immediately
        await checkForOrder(tapChargeId);
      } else {
        // No order data available - user navigated here directly
        // Just redirect silently without any misleading message
        navigate('/', { replace: true });
      }
    };

    checkPaymentStatus();
  }, [location.state, location.search, navigate]);

  const checkForOrder = async (tapChargeId: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/login', { replace: true });
        return;
      }

      // STEP 1: Check Tap payment status FIRST (fast, ~1s)
      console.log('⚡ Checking Tap payment status first...');
      const { data: tapData, error: tapError } = await supabase.functions.invoke('tap-check-status-kw', {
        body: { charge_id: tapChargeId }
      });

      if (tapError || !tapData?.success) {
        console.error('Failed to check Tap status:', tapError || tapData?.error);
        // Fall back to polling for order
        await pollForOrder(tapChargeId, authUser.id);
        return;
      }

      const tapStatus = tapData.status;
      console.log('⚡ Tap status:', tapStatus, tapData.message);

      // STEP 2: Route based on Tap status
      switch (tapStatus) {
        case 'FAILED':
        case 'DECLINED':
        case 'RESTRICTED':
        case 'TIMEDOUT':
          // Payment failed - show failure screen IMMEDIATELY, cart untouched
          console.log('❌ Payment failed, showing failure screen immediately');
          setPaymentStatus('failed');
          setOrderData({
            failureMessage: tapData.message,
            responseCode: tapData.response_code
          });
          setIsLoading(false);
          return;

        case 'CANCELLED':
        case 'ABANDONED':
          // Payment cancelled - redirect to cart, cart untouched
          toast.info(tapData.message || 'Payment was cancelled. Your cart items are still saved.');
          navigate('/cart', { replace: true });
          return;

        case 'NOT_FOUND':
          toast.info('Payment session not found. Please try again from your cart.');
          navigate('/cart', { replace: true });
          return;

        case 'CAPTURED':
        case 'AUTHORIZED':
          // Payment succeeded! Now poll for the webhook-created order
          console.log('✅ Payment confirmed successful, polling for order...');
          setPaymentStatus('pending');
          await pollForOrder(tapChargeId, authUser.id);
          return;

        case 'INITIATED':
        case 'IN_PROGRESS':
        case 'PENDING':
          // Still processing - poll with timeout
          toast.info('Payment is still processing. Please wait...');
          setPaymentStatus('pending');
          await pollForOrder(tapChargeId, authUser.id);
          return;

        default:
          // Unknown status - try polling
          console.log('Unknown Tap status:', tapStatus);
          await pollForOrder(tapChargeId, authUser.id);
          return;
      }
    } catch (error) {
      console.error('Error in checkForOrder:', error);
      toast.error('Something went wrong. Please check your order history.');
      navigate('/profile?tab=orders', { replace: true });
    }
  };

  // Poll for the webhook-created order (only called after Tap confirms success/pending)
  const pollForOrder = async (tapChargeId: string, userId: string, attempt = 0) => {
    const maxAttempts = 5;
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('tap_charge_id', tapChargeId)
        .eq('customer_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching order:', error);
      }

      if (order) {
        // Order found!
        const isSuccess = ['captured', 'authorized', 'paid'].includes(order.payment_status?.toLowerCase() || '');
        if (isSuccess) {
          setOrderData({
            orderNumber: order.order_number,
            total: order.total_amount,
            items: order.order_items || [],
            scheduledTime: order.estimated_delivery_time,
            deliveryAddress: order.delivery_address_id,
            paymentMethod: 'card',
            isGift: (order.cake_details as any)?.isGift || false,
          });
          setOrderDetails(order);
          setPaymentStatus('success');
          setIsLoading(false);
          return;
        }
      }

      // Order not found yet - retry if we have attempts left
      if (attempt < maxAttempts) {
        console.log(`Order not found yet, retry ${attempt + 1}/${maxAttempts}`);
        setRetryCount(attempt + 1);
        setTimeout(() => pollForOrder(tapChargeId, userId, attempt + 1), 2000);
        return;
      }

      // Max retries - payment was confirmed successful by Tap but order not yet created
      // Clear cart (payment succeeded) and redirect to orders
      clearCartAfterSuccess();
      toast.info('Your order is being prepared. Check your order history shortly.');
      navigate('/profile?tab=orders', { replace: true });
    } catch (err) {
      console.error('Error polling for order:', err);
      if (attempt < maxAttempts) {
        setTimeout(() => pollForOrder(tapChargeId, userId, attempt + 1), 2000);
        return;
      }
      toast.error('Something went wrong. Please check your order history.');
      navigate('/profile?tab=orders', { replace: true });
    }
  };

  // Show loading/pending state
  if (isLoading || paymentStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium mb-2">
            {paymentStatus === 'pending' ? 'Confirming your payment...' : 'Verifying payment...'}
          </p>
          <p className="text-sm text-muted-foreground">
            Please wait while we process your order.
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              This may take a few moments...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    const failureMessage = orderData?.failureMessage || 'Unfortunately, your payment could not be processed.';
    
    return (
      <main className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-red-600 mb-2">Payment Failed</h1>
            <p className="text-muted-foreground mb-2">
              {failureMessage}
            </p>
            
            <div className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              <p className="font-medium mb-2">Common reasons:</p>
              <ul className="list-disc list-inside text-left">
                <li>Insufficient funds</li>
                <li>Card declined by bank</li>
                <li>Incorrect card details</li>
                <li>3D Secure verification failed</li>
              </ul>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Your cart items are still saved. You can try again with a different payment method.
            </p>
            
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/')} variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <Button onClick={() => navigate('/cart')}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const whatsappMessage = `🎉 Order Confirmed!
Order #${orderData.orderNumber}
Total: ${formatQAR(orderData.total)}
${orderData.isGift ? '🎁 Gift Order' : ''}

We'll update you on WhatsApp about your order status. Thank you for choosing us! 🧁`;

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground">Your order has been confirmed</p>
        </div>

        {/* Order Details Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Order Details</h2>
              <Badge variant="secondary" className="text-sm">
                Order #{orderData.orderNumber}
              </Badge>
            </div>

            <div className="space-y-4">
              {/* Order Items */}
              <div>
                <h3 className="font-medium mb-3">Items Ordered</h3>
                <div className="space-y-2">
                  {orderData.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product_name || item.cake?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="font-medium">{formatQAR(item.total_price != null ? item.total_price : (item.price * (item.quantity || 1)))}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Order Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatQAR(orderDetails?.original_amount || orderData.subtotal || orderData.total)}</span>
                </div>
                
                {(orderDetails?.delivery_fee || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span>{formatQAR(orderDetails.delivery_fee)}</span>
                  </div>
                )}
                
                {(orderDetails?.voucher_discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Voucher Discount</span>
                    <span>-{formatQAR(orderDetails.voucher_discount_amount)}</span>
                  </div>
                )}
                
                {(orderDetails?.bakepoints_discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>BakePoints Discount</span>
                    <span>-{formatQAR(orderDetails.bakepoints_discount_amount)}</span>
                  </div>
                )}
                
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total Paid</span>
                  <span>{formatQAR(orderData.total)}</span>
                </div>
              </div>

              <Separator />

              {/* Delivery Details */}
              <div className="space-y-3">
                <h3 className="font-medium">Delivery Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {orderDetails?.estimated_delivery_time 
                        ? (() => {
                            const start = new Date(orderDetails.estimated_delivery_time);
                            const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
                            return `${format(start, 'MMM d, yyyy h:mm a')} - ${format(end, 'h:mm a')}`;
                          })()
                        : orderData.scheduledTime}
                    </span>
                  </div>
                  {orderData.deliveryAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span>{orderData.deliveryAddress}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <Badge variant="outline">
                      {orderData.paymentMethod === 'card' ? 'Credit Card' : 'Cash on Delivery'}
                    </Badge>
                  </div>
                  {orderData.isGift && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">🎁 Gift Order</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Preview */}
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-medium text-green-800">WhatsApp Confirmation</h3>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <pre className="text-xs whitespace-pre-wrap text-green-900 font-mono">
                {whatsappMessage}
              </pre>
            </div>
            <p className="text-xs text-green-700 mt-2">
              We'll send you updates via WhatsApp as your order progresses through preparation and delivery.
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
          <Button
            onClick={() => navigate('/profile?tab=orders')}
            variant="hero"
            className="flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4" />
            View Orders
          </Button>
        </div>

        {/* Thank You Message */}
        <div className="text-center mt-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Thank you for choosing PANDA CAKES! We're excited to create something special for you. 🧁
          </p>
        </div>
      </div>
    </main>
  );
};

export default PaymentSuccessPage;
