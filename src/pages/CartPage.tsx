import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { CheckoutModal } from '@/components/CheckoutModal';
import { UpsellModal } from '@/components/UpsellModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { deleteCartItemFromDB } from '@/utils/cartSync';
import { withTimeout } from '@/utils/withTimeoutAbort';
import { useTranslation } from '@/hooks/useTranslation';

export default function CartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useAppContext();
  const { user, isAuthReady, customerProfile } = useAuth();
  const { t, language, toArabicNumerals, translateVariant, currencyLabel } = useTranslation();

  useEffect(() => {
    if (!user) return; // Guest user, allow viewing cart

    // Check if user has address
    const checkAddress = async () => {
      try {
        const { data, error } = await supabase
          .from('addresses')
          .select('id')
          .eq('customer_id', user.id)
          .limit(1);

        // ✅ CRITICAL FIX: Handle RLS errors explicitly
        if (error) {
          if (error.code === '42501') {
            console.error('🔒 RLS policy blocked address access');
            toast.error('Permission denied. Please sign in again.');
          } else {
            console.error('Error checking address:', error);
          }
          return;
        }

        if (!data || data.length === 0) {
          // Save return URL for after address setup
          sessionStorage.setItem('checkout_return_url', location.pathname);
        }
      } catch (error) {
        console.error('Error checking address:', error);
      }
    };

    checkAddress();
  }, [user?.id, location.pathname]); // ✅ CRITICAL FIX: Use stable user?.id reference
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // Reset processing state on component mount (handles refresh scenario)
  useEffect(() => {
    setIsProcessing(false);
    setCheckoutError(null);
  }, []);

  // Auto-trigger checkout after returning from address setup
  useEffect(() => {
    const shouldAutoCheckout = sessionStorage.getItem('auto_trigger_checkout');
    // Add !isProcessing guard to prevent race condition with manual clicks
    if (shouldAutoCheckout === 'true' && user && isAuthReady && state.cart.length > 0 && !isProcessing) {
      console.log('🔄 [CartPage] Auto-triggering checkout after address setup');
      sessionStorage.removeItem('auto_trigger_checkout');
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        handleCheckoutClick();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, isAuthReady, state.cart.length, isProcessing]);

  // Scroll detection for sticky bottom bar
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const clientHeight = window.innerHeight;
      
      const isBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAtBottom(isBottom);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckoutSuccess = () => {
    setShowCheckoutModal(false);
    navigate('/');
  };

  const handleCheckoutClick = async () => {
    // Prevent double-clicks
    if (isProcessing) {
      console.log('🚫 [CartPage] Already processing, ignoring click');
      return;
    }

    console.log('🛒 [CartPage] Checkout clicked', {
      isAuthReady,
      hasUser: !!user,
      userId: user?.id,
      cartItemCount: state.cart.length
    });

    // Clear any previous errors
    setCheckoutError(null);

    // Wait for auth to be ready
    if (!isAuthReady) {
      console.log('⏳ [CartPage] Auth not ready yet');
      toast.info('Loading user session, please wait...');
      return;
    }

    if (!user) {
      console.log('🔐 [CartPage] No user, redirecting to login');
      sessionStorage.setItem('return_after_login', '/cart');
      navigate('/login');
      return;
    }

    // Check phone number before proceeding
    if (!customerProfile?.whatsapp_number?.trim()) {
      console.log('📱 [CartPage] No phone number, redirecting to phone setup');
      toast.info('Please add your phone number to complete checkout');
      navigate('/phone-setup');
      return;
    }

    // Set processing and add timeout protection
    setIsProcessing(true);
    const timeoutId = setTimeout(() => {
      console.warn('⏱️ [CartPage] Checkout timeout - resetting state');
      setIsProcessing(false);
      setCheckoutError('Request timed out. Please try again.');
      toast.error('Request timed out. Please try again.');
    }, 10000);

    // Check if user has address before allowing checkout (with timeout)
    try {
      console.log('📍 [CartPage] Checking user addresses...');
      
      const { data, error } = await withTimeout(
        async (signal) => {
          const result = await supabase
            .from('addresses')
            .select('id')
            .eq('customer_id', user.id)
            .limit(1)
            .abortSignal(signal);
          return result;
        },
        { timeoutMs: 6000, operationName: 'CartPage.addressCheck' }
      );

      if (error) {
        console.error('❌ [CartPage] Address check error:', error);
        setIsProcessing(false);
        clearTimeout(timeoutId);
        setCheckoutError('Unable to verify address. Please try again.');
        toast.error('Unable to verify address. Please try again.');
        return;
      }

      if (!data || data.length === 0) {
        console.log('🏠 [CartPage] No address found, redirecting to setup');
        setIsProcessing(false);
        clearTimeout(timeoutId);
        sessionStorage.setItem('checkout_return_url', '/cart');
        sessionStorage.setItem('auto_trigger_checkout', 'true');
        navigate('/address-setup');
        return;
      }

      console.log('✅ [CartPage] Address verified, showing upsell modal');
      clearTimeout(timeoutId);
      setIsProcessing(false);
      setShowUpsellModal(true);
    } catch (error: any) {
      console.error('❌ [CartPage] Error checking address:', error);
      clearTimeout(timeoutId);
      setIsProcessing(false);
      const isTimeout = error?.message?.includes('timed out');
      setCheckoutError(isTimeout ? 'Request timed out. Please try again.' : 'Unable to proceed with checkout. Please try again.');
      toast.error(isTimeout ? 'Request timed out. Please try again.' : 'Failed to verify address. Please try again.');
    }
  };

  const handleUpsellContinue = () => {
    console.log('🎁 [CartPage] Upsell continue clicked');
    setShowUpsellModal(false);
    setShowCheckoutModal(true);
    console.log('💳 [CartPage] Checkout modal should now be visible');
  };

  const handleQuantityUpdate = (itemId: string, newQuantity: number) => {
    const clampedQuantity = Math.min(5, Math.max(1, newQuantity));
    if (newQuantity > 5) {
      toast.error('Maximum 5 items allowed per cake');
    }
    dispatch({ 
      type: 'UPDATE_CART_QUANTITY', 
      payload: { id: itemId, quantity: clampedQuantity }
    });
  };

  // Handle cart item removal with immediate DB sync
  const handleRemoveItem = async (itemId: string) => {
    // 1. Remove from UI immediately (optimistic update)
    dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
    
    // 2. Also delete from DB immediately (no debounce)
    if (user?.id) {
      try {
        await deleteCartItemFromDB(user.id, itemId);
      } catch (error) {
        // Item already removed from UI - will sync on next save
        console.error('Failed to sync deletion to DB:', error);
      }
    }
  };

  if (state.cart.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-4">{t('cart_empty')}</h1>
          <p className="text-muted-foreground mb-8">{t('cart_empty_desc')}</p>
          <Button onClick={() => navigate('/')} size="lg">
            {t('cart_browse')}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8 pb-32">
        <h1 className="text-4xl font-black font-display text-foreground mb-8">{t('cart_title')}</h1>

        {/* Authentication Loading Indicator */}
        {!isAuthReady && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('cart_loading_auth')}
            </p>
          </div>
        )}

        {/* Checkout Error Fallback UI */}
        {checkoutError && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
            <p className="text-destructive text-sm">{checkoutError}</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setCheckoutError(null);
                window.location.reload();
              }}
              className="mt-2"
            >
              {t('cart_refresh')}
            </Button>
          </div>
        )}

        <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
          {state.cart.map((item) => (
            <div key={item.id} className="bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg">
              {/* Mobile: Stacked Layout, Desktop: Horizontal Layout */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {/* Image - full width on mobile */}
                <img
                  src={item.cake.image}
                  alt={item.cake.name}
                  className="w-full sm:w-20 h-32 sm:h-20 object-cover rounded-xl sm:rounded-2xl"
                />
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-sm sm:text-base pr-8 sm:pr-0 break-words">{(language === 'ar' && item.cake.name_ar) || item.cake.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                    {translateVariant(item.flavor)} • {translateVariant(item.variant)}
                  </p>
                  {item.customizations?.custom_selections && Object.keys(item.customizations.custom_selections).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {Object.entries(item.customizations.custom_selections).map(([title, data]) => (
                        <div key={title} className="break-words">
                          <span className="font-medium">{translateVariant(title)}:</span>{' '}
                          {Array.isArray(data.selected) ? data.selected.map(s => translateVariant(s)).join('، ') : translateVariant(data.selected)}
                          {data.price > 0 && <span className="text-primary"> (+{currencyLabel} {toArabicNumerals(data.price.toFixed(2))})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {item.specialInstructions && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {t('cart_special')}: {item.specialInstructions}
                    </p>
                  )}
                </div>
                
                {/* Quantity & Price - row on mobile, column on desktop */}
                <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-3 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0">
                  {/* Delete button - inline with controls */}
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleRemoveItem(item.id)}
                    className="h-9 w-9 sm:h-8 sm:w-8 border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 sm:h-8 sm:w-8"
                      onClick={() => handleQuantityUpdate(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="w-8 text-center relative">
                      <span className="text-sm font-medium">{item.quantity}</span>
                      {item.quantity >= 5 && (
                        <AlertCircle className="w-3 h-3 text-amber-500 absolute -top-1 -right-1" />
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 sm:h-8 sm:w-8"
                      onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
                      disabled={item.quantity >= 5}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Price display with discount support */}
                  {item.originalPrice && item.originalPrice > item.price ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs text-muted-foreground line-through">
                        {currencyLabel} {toArabicNumerals((item.originalPrice * item.quantity).toFixed(2))}
                      </span>
                      <span className="font-bold text-destructive whitespace-nowrap text-sm sm:text-base">
                        {currencyLabel} {toArabicNumerals((item.price * item.quantity).toFixed(2))}
                      </span>
                      {item.itemDiscount?.percentage && (
                        <span className="text-[10px] text-green-600 font-medium">
                          {toArabicNumerals(String(item.itemDiscount.percentage))}{t('checkout_percent_off')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="font-bold text-primary whitespace-nowrap text-sm sm:text-base">
                      {currencyLabel} {toArabicNumerals((item.price * item.quantity).toFixed(2))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>


        <div className="bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg space-y-4">
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span>{t('cart_subtotal')}</span>
              <span className="whitespace-nowrap">{currencyLabel} {toArabicNumerals(subtotal.toFixed(2))}</span>
            </div>
            <div className="flex justify-between text-base sm:text-lg font-bold text-foreground border-t pt-2">
              <span>{t('cart_total')}</span>
              <span className="text-primary whitespace-nowrap">{currencyLabel} {toArabicNumerals(subtotal.toFixed(2))}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t('cart_voucher_note')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
            <Button variant="outline" onClick={() => navigate('/')} className="flex-1 text-sm">
              {t('cart_add_more')}
            </Button>
            <Button 
              onClick={handleCheckoutClick} 
              disabled={isProcessing || !isAuthReady}
              className="flex-1 text-lg sm:text-base py-6 sm:py-3 font-semibold" 
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('cart_processing')}
                </>
              ) : (
                t('cart_checkout')
              )}
            </Button>
          </div>
        </div>
      </div>

      <UpsellModal
        isOpen={showUpsellModal}
        onClose={() => {
          console.log('🚪 [CartPage] Upsell modal closing');
          setShowUpsellModal(false);
        }}
        onContinue={handleUpsellContinue}
        cartItems={state.cart}
      />

      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => {
          console.log('🚪 [CartPage] Checkout modal closing');
          setShowCheckoutModal(false);
        }}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Sticky Bottom Checkout Bar - Cart Page Only */}
      {!isAtBottom && state.cart.length > 0 && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-transform duration-300 ease-in-out"
          style={{
            transform: isAtBottom ? 'translateY(100%)' : 'translateY(0)'
          }}
        >
          <div className="container max-w-4xl mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              {/* Left: Total Amount */}
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t('cart_total')}</span>
                <span className="text-lg sm:text-xl font-bold text-primary">
                  {currencyLabel} {toArabicNumerals(subtotal.toFixed(2))}
                </span>
              </div>
              
              {/* Right: Checkout Button */}
              <Button 
                onClick={handleCheckoutClick} 
                disabled={isProcessing || !isAuthReady}
                className="text-sm sm:text-base font-semibold px-6 sm:px-8" 
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">{t('cart_processing')}</span>
                    <span className="sm:hidden">{t('cart_processing')}</span>
                  </>
                ) : (
                  t('cart_checkout')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}