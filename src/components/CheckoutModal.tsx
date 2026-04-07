import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Clock, CreditCard, Banknote, Gift, Truck, Store, Plus, ArrowLeft, ArrowRight, Star, CheckCircle2, Loader2, Timer, XCircle, ChevronDown } from 'lucide-react';
import { DateSelector } from './DateSelector';
import { toast } from 'sonner';
import { PaymentModal } from './PaymentModal';
import { CompactMap } from './CompactMap';
import { DeliveryZoneMap } from './DeliveryZoneMap';
import { CartItem } from '@/types';
import { generateTimeSlotsWithStatus, generateTimeSlots, getCurrentDohaTime, BlockedSlot, RawBlockedSlot, expandBlockedSlots, isStoreCurrentlyClosed } from '@/utils/timeSlots';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { calculateDiscount, getPointsRedemptionInfo } from '@/utils/pointsDisplay';
import { clearCartInDB, clearCartFromLocalStorage, setCheckoutModalOpen } from '@/utils/cartSync';
import { retryWithBackoff } from '@/utils/retryWithBackoff';
import { COUNTRY_ID, COUNTRY_NAME, DEFAULT_CURRENCY } from '@/config/country';
import { formatAmount } from '@/utils/currencyHelpers';

// Session timeout constants
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const WARNING_THRESHOLD_S = 60; // Show warning at 1 minute left

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appliedVoucher?: {
    code: string;
    discount_amount: number;
    voucher_id: string;
  } | null;
}
type CheckoutStep = 'gift' | 'address' | 'payment';
export function CheckoutModal({
  isOpen,
  onClose,
  onSuccess,
  appliedVoucher: cartAppliedVoucher
}: CheckoutModalProps) {
  const {
    state,
    dispatch
  } = useAppContext();
  const { t, language, toArabicNumerals, translateVariant, currencyLabel } = useTranslation();
  const {
    user,
    customerProfile,
    updateCustomerProfile,
    refreshCustomerProfile
  } = useAuth();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('gift');
  const [isGift, setIsGift] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    area: '',
    block: '',
    street: '',
    house: '',
    country: COUNTRY_NAME,
    country_id: COUNTRY_ID,
    landmarks: '',
    latitude: null as number | null,
    longitude: null as number | null,
    delivery_zone_id: null as string | null,
    delivery_fee: null as number | null,
    min_order_value: null as number | null,
    is_serviceable: true
  });
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [deliveryTime, setDeliveryTime] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount_amount: number;
    final_amount: number;
    voucher_id?: string;
    applicable_products?: string[];
  } | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<{
    voucher_code: string;
    description_en: string | null;
    discount_percentage: number | null;
    discount_amount: number | null;
    voucher_type: string | null;
  }[]>([]);
  const [appliedBakePoints, setAppliedBakePoints] = useState<number>(0);
  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);
  const [countryBakePoints, setCountryBakePoints] = useState<number>(0);
  const [giftRecipientName, setGiftRecipientName] = useState('');
  const [giftRecipientPhone, setGiftRecipientPhone] = useState('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [vatSettings, setVatSettings] = useState<{
    enabled: boolean;
    percentage: number;
  }>({ enabled: false, percentage: 0 });
  const [minOrderValue, setMinOrderValue] = useState<number>(0);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [isStoreClosed, setIsStoreClosed] = useState(false);

  // Session timeout state
  const [sessionTimeLeft, setSessionTimeLeft] = useState(SESSION_TIMEOUT_MS / 1000);
  const lastActivityRef = useRef(Date.now());
  const warningShownRef = useRef(false);

  // Reset session timer on user activity
  const resetSessionTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSessionTimeLeft(SESSION_TIMEOUT_MS / 1000);
    warningShownRef.current = false;
  }, []);

  // Session timeout effect - with visibility change handling
  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes
      setSessionTimeLeft(SESSION_TIMEOUT_MS / 1000);
      warningShownRef.current = false;
      return;
    }

    // Reset timer when modal opens
    lastActivityRef.current = Date.now();
    setSessionTimeLeft(SESSION_TIMEOUT_MS / 1000);
    warningShownRef.current = false;

    const interval = setInterval(() => {
      // CRITICAL: Skip timer check if tab is hidden to prevent false expiry
      // Browsers throttle setInterval when tab is hidden, causing inaccurate elapsed time
      if (document.visibilityState === 'hidden') {
        return;
      }
      
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, SESSION_TIMEOUT_MS - elapsed);
      const remainingSeconds = Math.ceil(remaining / 1000);
      setSessionTimeLeft(remainingSeconds);

      // Show warning at 1 minute left
      if (remainingSeconds <= WARNING_THRESHOLD_S && remainingSeconds > 0 && !warningShownRef.current) {
        warningShownRef.current = true;
        toast.warning('Your checkout session will expire in 1 minute due to inactivity.', {
          duration: 5000,
        });
      }

      // Close modal when session expires
      if (remaining === 0) {
        toast.error('Checkout session expired due to inactivity. Please try again.', {
          duration: 5000,
        });
        onClose();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onClose]);

  // Handle visibility change - reset timer when tab becomes visible again
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible again - reset timer to prevent false session expiry
        console.log('[CheckoutModal] Tab visible again - resetting session timer');
        lastActivityRef.current = Date.now();
        warningShownRef.current = false;
        setSessionTimeLeft(SESSION_TIMEOUT_MS / 1000);
        
        // Reset only non-critical UI states -- NOT isProcessing
        // isProcessing must only be reset by payment flow completion or explicit user action
        setIsAddingAddress(false);
        setIsValidatingVoucher(false);
        setIsRedeemingPoints(false);
        // NOTE: intentionally NOT resetting isProcessing here to prevent duplicate submissions
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOpen]);

  // Add event listeners to reset timer on user activity
  useEffect(() => {
    if (!isOpen) return;

    const events = ['click', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    const handleActivity = () => resetSessionTimer();

    events.forEach(event => document.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, [isOpen, resetSessionTimer]);

  // Calculate maximum preparation time from cart items (in minutes)
  const getMaxPreparationTime = (): number => {
    return state.cart.reduce((maxTime, item) => {
      const prepTimeStr = item.cake.preparationTime || '';

      // Parse "Xh Ym" mixed format (e.g., "2h 30m")
      const mixedMatch = prepTimeStr.match(/(\d+)h\s*(\d+)m/);
      if (mixedMatch) {
        const hours = parseInt(mixedMatch[1], 10);
        const mins = parseInt(mixedMatch[2], 10);
        return Math.max(maxTime, hours * 60 + mins);
      }

      // Parse "X hour(s)" format (e.g., "24 hours", "1 hour")
      const hoursMatch = prepTimeStr.match(/(\d+)\s*hours?/i);
      if (hoursMatch) {
        return Math.max(maxTime, parseInt(hoursMatch[1], 10) * 60);
      }

      // Parse "X mins" format (e.g., "30 mins")
      const minsMatch = prepTimeStr.match(/(\d+)\s*mins?/i);
      if (minsMatch) {
        return Math.max(maxTime, parseInt(minsMatch[1], 10));
      }

      // "Standard" or unrecognized -> 0
      return maxTime;
    }, 0);
  };

  const maxPreparationTime = getMaxPreparationTime();

  // Get delivery time from selected address's delivery zone (in minutes)
  const getDeliveryTimeMinutes = (): number => {
    if (fulfillmentType === 'pickup') return 0;
    const selectedAddressData = savedAddresses.find(a => a.id === selectedAddress);
    // Default to 120 minutes (2 hours) if no zone data
    return selectedAddressData?.delivery_time_minutes || 120;
  };

  const deliveryTimeMinutes = getDeliveryTimeMinutes();
  
  // Block checkout if phone not verified
  useEffect(() => {
    if (isOpen && user && customerProfile) {
      const phoneVerified = customerProfile?.phone_verified === true;
      if (!phoneVerified) {
        toast.error('Please verify your phone number to checkout');
        onClose();
        // Clear skip flag so they see phone setup again
        localStorage.removeItem('phone_setup_skipped');
        window.location.href = '/phone-setup';
      }
    }
  }, [isOpen, user, customerProfile, onClose]);

  // Track when checkout modal is open - prevents background DB revalidation from clearing cart
  useEffect(() => {
    if (isOpen) {
      setCheckoutModalOpen(true);
    }
    return () => {
      // Only clear the flag when unmounting or modal closes - NOT during checkout completion
      if (!isOpen) {
        setCheckoutModalOpen(false);
      }
    };
  }, [isOpen]);

  // Fetch country-specific BakePoints balance via RPC
  const fetchCountryBakePoints = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_available_bakepoints', {
        p_customer_id: user.id,
        p_country_id: COUNTRY_ID
      });
      if (error) {
        console.error('Error fetching country BakePoints:', error);
        setCountryBakePoints(0);
        return;
      }
      setCountryBakePoints(data || 0);
    } catch (err) {
      console.error('Error fetching country BakePoints:', err);
      setCountryBakePoints(0);
    }
  };

  useEffect(() => {
    if (user && isOpen) {
      // OPTIMIZED: Run all 5 fetches in parallel instead of sequentially
      Promise.all([
        fetchUserAddresses(),
        fetchVatSettings(),
        fetchBlockedSlots(),
        fetchAvailableVouchers(),
        fetchCountryBakePoints()
      ]);
      setCurrentStep('gift');
      setAppliedBakePoints(0);
      setGiftRecipientName('');
      setGiftRecipientPhone('');
      setShowNewAddressForm(false);
      setIsProcessing(false);
      setPendingOrderId(null);
      setShowPaymentModal(false);
      // Use voucher from cart if provided
      if (cartAppliedVoucher) {
        setAppliedVoucher({
          code: cartAppliedVoucher.code,
          discount_amount: cartAppliedVoucher.discount_amount,
          final_amount: 0 // Will be recalculated below
        });
      } else {
        setAppliedVoucher(null);
      }
    }
  }, [user, isOpen, cartAppliedVoucher]);

  // Fetch public vouchers that should be shown on website
  const fetchAvailableVouchers = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('vouchers')
        .select('voucher_code, description_en, discount_percentage, discount_amount, voucher_type')
        .eq('show_on_website', true)
        .eq('country_id', COUNTRY_ID)
        .lte('valid_from', today)
        .gte('valid_until', today);
      
      if (error) {
        console.error('Error fetching available vouchers:', error);
        return;
      }
      
      if (data) {
        setAvailableVouchers(data);
      }
    } catch (error) {
      console.error('Error fetching available vouchers:', error);
    }
  };

  // Refetch blocked slots when fulfillment type changes
  useEffect(() => {
    if (user && isOpen) {
      fetchBlockedSlots();
    }
  }, [fulfillmentType]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
      setShowPaymentModal(false);
      setPendingOrderId(null);
    }
  }, [isOpen]);

  const fetchVatSettings = async () => {
    try {
      const { data } = await supabase
        .from('site_config')
        .select('vat_enabled, vat_percentage, min_order_value_delivery')
        .eq('country_code', COUNTRY_ID)
        .single();
      
      if (data) {
        setVatSettings({
          enabled: data.vat_enabled || false,
          percentage: data.vat_percentage || 0
        });
        setMinOrderValue(data.min_order_value_delivery || 0);
      }
    } catch (error) {
      console.error('Error fetching VAT settings:', error);
    }
  };

  const fetchBlockedSlots = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('time_slot_blocks')
        .select('block_date, time_slot, block_type, block_start, block_end, duration_hours, fulfillment_type, block_severity')
        .eq('is_active', true)
        .eq('country_id', COUNTRY_ID)
        .gte('block_date', today);
      
      const rawBlocks = (data as RawBlockedSlot[]) || [];
      
      // Check if store is currently closed
      setIsStoreClosed(isStoreCurrentlyClosed(rawBlocks));
      
      // Expand only 'busy' blocks for time slot blocking (closed blocks disable entire checkout)
      const busyBlocks = rawBlocks.filter(b => b.block_severity !== 'closed');
      const expandedBlocks = expandBlockedSlots(busyBlocks, fulfillmentType);
      setBlockedSlots(expandedBlocks);
    } catch (error) {
      console.error('Error fetching blocked slots:', error);
      setBlockedSlots([]);
      setIsStoreClosed(false);
    }
  };
  useEffect(() => {
    if (isGift) {
      setPaymentMethod('card');
    } else {
      setGiftRecipientName('');
      setGiftRecipientPhone('');
    }
  }, [isGift]);

  // Auto-clear selected time if it becomes past when date changes
  useEffect(() => {
    if (deliveryDate && deliveryTime) {
      const slots = generateTimeSlotsWithStatus(deliveryDate, maxPreparationTime, deliveryTimeMinutes, blockedSlots);
      const selectedSlot = slots.find(slot => slot.value === deliveryTime);

      // If the selected time slot is unavailable, clear it
      if (selectedSlot?.isPast) {
        setDeliveryTime('');
        let reason = language === 'ar' ? 'الفترة الزمنية المختارة لم تعد متاحة.' : 'Selected time slot is no longer available.';
        if (selectedSlot.unavailableReason === 'preparation') {
          reason = language === 'ar' ? 'الفترة الزمنية لا تسمح بوقت كافٍ للتحضير والتوصيل.' : 'Selected time slot doesn\'t allow enough preparation + delivery time.';
        } else if (selectedSlot.unavailableReason === 'blocked') {
          reason = language === 'ar' ? 'تم حظر الفترة الزمنية المختارة من قبل الإدارة.' : 'Selected time slot has been blocked by staff.';
        }
        toast.info(language === 'ar' ? `${reason} يرجى اختيار وقت آخر.` : `${reason} Please choose another time.`);
      }
    }
  }, [deliveryDate, deliveryTime, maxPreparationTime, deliveryTimeMinutes, blockedSlots, selectedAddress]);
  const fetchUserAddresses = async () => {
    if (!user) return;
    console.log('📍 [CheckoutModal] Fetching addresses for user:', user.id);
    try {
      const data = await retryWithBackoff(async () => {
      const {
          data,
          error
        } = await supabase
          .from('addresses')
          .select('*, delivery_zones(delivery_fee, delivery_time_minutes, min_order_value)')
          .eq('customer_id', user.id)
          .eq('country_id', COUNTRY_ID)
          .order('is_primary', { ascending: false });
        if (error) throw error;
        // Flatten delivery_time_minutes and min_order_value from joined table
        return data?.map(addr => ({
          ...addr,
          // Use delivery_fee from zones if available (more up-to-date), fallback to address value
          delivery_fee: addr.delivery_zones?.delivery_fee ?? addr.delivery_fee ?? 0,
          delivery_time_minutes: addr.delivery_zones?.delivery_time_minutes || 120,
          min_order_value: addr.delivery_zones?.min_order_value || 0
        })) || [];
      }, {
        operationName: 'fetchUserAddresses'
      });
      console.log('✅ [CheckoutModal] Fetched addresses:', data?.length || 0);
      setSavedAddresses(data || []);
      const primaryAddress = data?.find(addr => addr.is_primary);
      if (primaryAddress) {
        console.log('🏠 [CheckoutModal] Auto-selecting primary address:', primaryAddress.id);
        setSelectedAddress(primaryAddress.id);
      } else if (data && data.length > 0 && !selectedAddress) {
        console.log('📍 [CheckoutModal] Auto-selecting first address:', data[0].id);
        setSelectedAddress(data[0].id);
      }
    } catch (error) {
      console.error('❌ [CheckoutModal] Error fetching addresses:', error);
    }
  };
  const handleAddNewAddress = async () => {
    if (!user) return;

    // Comprehensive validation
    if (!newAddress.label?.trim()) {
      toast.error(t('checkout_provide_label'));
      return;
    }
    if (!newAddress.area?.trim()) {
      toast.error(t('checkout_provide_city'));
      return;
    }
    if (!newAddress.block?.trim()) {
      toast.error(t('checkout_provide_building'));
      return;
    }
    if (!newAddress.street?.trim()) {
      toast.error(t('checkout_provide_street'));
      return;
    }
    if (!newAddress.house?.trim()) {
      toast.error(t('checkout_provide_building'));
      return;
    }
    if (!newAddress.latitude || !newAddress.longitude) {
      toast.error(t('checkout_select_map'));
      return;
    }

    // Validate serviceability
    if (newAddress.is_serviceable === false) {
      toast.error(t('checkout_outside_area'));
      return;
    }
    console.log('➕ [CheckoutModal] Adding new address:', {
      label: newAddress.label,
      area: newAddress.area,
      has_coordinates: !!(newAddress.latitude && newAddress.longitude),
      is_serviceable: newAddress.is_serviceable
    });
    setIsAddingAddress(true);
    try {
      // Construct full street address from Kuwait fields
      const fullStreetAddress = `Block ${newAddress.block}, Street ${newAddress.street}, House ${newAddress.house}`;
      const data = await retryWithBackoff(async () => {
        const {
          data,
          error
        } = await supabase.from('addresses').insert({
          customer_id: user.id,
          label: newAddress.label || 'Home',
          street_address: fullStreetAddress,
          city: newAddress.area,
          country: newAddress.country,
          country_id: newAddress.country_id,
          landmarks: newAddress.landmarks,
          latitude: newAddress.latitude,
          longitude: newAddress.longitude,
          delivery_zone_id: newAddress.delivery_zone_id,
          delivery_fee: newAddress.delivery_fee,
          is_serviceable: newAddress.is_serviceable,
          is_primary: savedAddresses.length === 0
        }).select().single();
        if (error) throw error;
        return data;
      }, {
        operationName: 'addNewAddress'
      });
      console.log('✅ [CheckoutModal] Address added successfully:', data.id);

      // Refresh addresses from database
      await fetchUserAddresses();

      // Set the newly added address as selected
      setSelectedAddress(data.id);

      // Reset form
      setNewAddress({
        label: 'Home',
        area: '',
        block: '',
        street: '',
        house: '',
        country: COUNTRY_NAME,
        country_id: COUNTRY_ID,
        landmarks: '',
        latitude: null,
        longitude: null,
        delivery_zone_id: null,
        delivery_fee: null,
        min_order_value: null,
        is_serviceable: true
      });
      setShowNewAddressForm(false);
      toast.success(t('checkout_address_added'));
    } catch (error) {
      console.error('❌ [CheckoutModal] Error adding address:', error);
      toast.error(language === 'ar' ? 'فشل في إضافة العنوان. يرجى المحاولة مرة أخرى.' : 'Failed to add address. Please try again.');
    } finally {
      setIsAddingAddress(false);
    }
  };
  const validateAndApplyVoucher = async () => {
    if (!voucherCode.trim() || !user) return;
    setIsValidatingVoucher(true);
    try {
      // ONLY validate - do NOT record usage yet!
      // Usage is recorded only when order is successfully placed via tap-webhook
      const { data, error } = await supabase.functions.invoke('voucher-manager', {
        body: {
          action: 'validate',
          voucher_code: voucherCode.trim().toUpperCase(),
          customer_id: user.id,
          order_amount: subtotal, // Only item prices, not delivery fee
          country_id: COUNTRY_ID
        }
      });
      
      if (error) throw error;
      
      if (data.is_valid) {
        // Calculate discount - if voucher has applicable_products, only discount those items
        const applicableProducts: string[] | null = data.applicable_products && data.applicable_products.length > 0
          ? data.applicable_products
          : null;
        
        const discountBase = applicableProducts
          ? state.cart
              .filter(item => applicableProducts.includes(item.cake.id))
              .reduce((sum, item) => sum + item.price * item.quantity, 0)
          : subtotal;
        
        const discountAmt = data.discount_percentage > 0
          ? Math.round(discountBase * data.discount_percentage / 100 * 100) / 100
          : Math.min(data.discount_amount || 0, discountBase);
        
        setAppliedVoucher({
          code: voucherCode.trim().toUpperCase(),
          discount_amount: discountAmt,
          final_amount: subtotal - discountAmt,
          voucher_id: data.voucher_id,
          applicable_products: applicableProducts || undefined
        });
        
        if (discountAmt === 0 && applicableProducts && applicableProducts.length > 0) {
          toast.success(language === 'ar' ? 'تم تطبيق القسيمة — صالحة لمنتجات معينة فقط' : 'Voucher applied — valid for certain items only');
        } else {
          toast.success(t('checkout_voucher_applied').replace('{amount}', formatAmount(discountAmt)));
        }
      } else {
        toast.error(data.error_message || (language === 'ar' ? 'قسيمة غير صالحة' : 'Invalid voucher'));
        setAppliedVoucher(null);
      }
    } catch (error) {
      console.error('Error validating voucher:', error);
      toast.error(language === 'ar' ? 'فشل في التحقق من القسيمة' : 'Failed to validate voucher');
    } finally {
      setIsValidatingVoucher(false);
    }
  };
  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    toast.success(t('checkout_voucher_removed'));
  };
  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const selectedAddressData = savedAddresses.find(addr => addr.id === selectedAddress);
  const deliveryFee = fulfillmentType === 'delivery' 
    ? (selectedAddressData?.delivery_fee || newAddress.delivery_fee || 0) 
    : 0;
  const discount = appliedVoucher ? appliedVoucher.discount_amount : 0;
  const bakePointsDiscount = calculateDiscount(appliedBakePoints);
  
  // Calculate VAT on (subtotal - discounts) only if enabled
  const taxableAmount = subtotal - discount - bakePointsDiscount;
  const vatAmount = vatSettings.enabled ? (taxableAmount * vatSettings.percentage / 100) : 0;
  
  const total = subtotal + deliveryFee - discount - bakePointsDiscount + vatAmount;

  // Calculate maximum redeemable BakePoints
  const availablePoints = countryBakePoints;
  const pointsRate = getPointsRedemptionInfo().rate; // 500 for KW
  const maxRedeemablePoints = Math.floor(Math.min(availablePoints, (subtotal + deliveryFee - discount) * pointsRate) / pointsRate) * pointsRate;
  // BakePoints redemption is now UI-only until order is placed
  // Points are only deducted from database AFTER successful order/payment
  const handleRedeemBakePoints = () => {
    if (!user || !customerProfile || maxRedeemablePoints < pointsRate) return;
    
    // Just set local state - no database call yet!
    // Points will be deducted only after successful order placement
    const pointsToRedeem = maxRedeemablePoints;
    setAppliedBakePoints(pointsToRedeem);
    const discountAmount = calculateDiscount(pointsToRedeem);
    toast.success(language === 'ar' ? `سيتم تطبيق ${toArabicNumerals(String(pointsToRedeem))} نقطة BakePoints! ستوفر ${toArabicNumerals(formatAmount(discountAmount))} ${currencyLabel}` : `${pointsToRedeem} BakePoints will be applied! You'll save ${currencyLabel} ${formatAmount(discountAmount)}`);
  };

  const handleRemoveBakePoints = () => {
    // Just reset local state - no database call needed since we haven't deducted yet
    setAppliedBakePoints(0);
    toast.success(t('checkout_bakepoints_removed'));
  };
  // Get zone-specific minimum order value (only for delivery)
  const zoneMinOrderValue = fulfillmentType === 'delivery' 
    ? (selectedAddressData?.min_order_value || newAddress.min_order_value || 0)
    : 0;
  
  // Check if cart meets zone-specific minimum order value
  const meetsMinimumOrder = subtotal >= zoneMinOrderValue;

  const canProceedToNext = () => {
    // Block checkout if zone-specific minimum order not met (only for delivery)
    if (!meetsMinimumOrder && zoneMinOrderValue > 0 && fulfillmentType === 'delivery') {
      return false;
    }
    
    switch (currentStep) {
      case 'gift':
        return true;
      case 'address':
        if (isGift && (!giftRecipientName.trim() || !giftRecipientPhone.trim())) {
          return false;
        }
        if (fulfillmentType === 'pickup') return deliveryDate && deliveryTime;
        // For delivery: validate address is serviceable and belongs to current country
        if (selectedAddress) {
          const addr = savedAddresses.find(a => a.id === selectedAddress);
          if (addr && addr.is_serviceable === false) return false;
          if (addr && addr.country_id && addr.country_id !== COUNTRY_ID) return false;
        }
        return (selectedAddress || showNewAddressForm && newAddress.area && newAddress.block && newAddress.street && newAddress.house) && deliveryDate && deliveryTime;
      case 'payment':
        // If total is 0 and pickup, no payment method needed
        if (total <= 0 && fulfillmentType === 'pickup') return true;
        // Otherwise require payment method
        return paymentMethod;
      default:
        return false;
    }
  };
  const createPendingOrder = async () => {
    if (!user?.id) {
      throw new Error('User session not found. Please log in again.');
    }
    const orderData = {
      customer_id: user.id,
      country_id: COUNTRY_ID,
      payment_currency: DEFAULT_CURRENCY,
      total_amount: total,
      delivery_fee: deliveryFee,
      original_amount: subtotal, // Items subtotal only, delivery fee tracked separately
      bakepoints_discount_amount: bakePointsDiscount > 0 ? bakePointsDiscount : null, // Track BakePoints discount
      voucher_discount_amount: discount > 0 ? discount : null, // Track voucher discount
      status: 'pending_payment' as const,
      payment_method: paymentMethod,
      payment_status: 'pending',
      estimated_delivery_time: deliveryDate ? `${format(deliveryDate, 'yyyy-MM-dd')}T${deliveryTime.split('-')[0]}:00+03:00` : null,
      customer_notes: customerNotes,
      order_number: '',
      vat_percentage: vatSettings.enabled ? vatSettings.percentage : 0,
      vat_amount: vatAmount,
      fulfillment_type: fulfillmentType,
      cake_details: JSON.parse(JSON.stringify({
        items: state.cart,
        isGift,
        giftRecipient: isGift ? {
          name: giftRecipientName,
          phone: giftRecipientPhone
        } : null,
        fulfillmentType,
        deliveryAddress: fulfillmentType === 'delivery' ? selectedAddress ? savedAddresses.find(a => a.id === selectedAddress) : newAddress : null,
        delivery_time_slot: deliveryTime ? (generateTimeSlots().find(s => s.value === deliveryTime)?.label || deliveryTime) : null,
        delivery_time_value: deliveryTime || null,
        delivery_date: deliveryDate ? format(deliveryDate, 'yyyy-MM-dd') : null,
      })),
      delivery_address_id: fulfillmentType === 'delivery' && selectedAddress ? selectedAddress : null
    };
    
    const order = await retryWithBackoff(async () => {
      const { data, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();
      if (error) throw error;
      return data;
    }, { operationName: 'createPendingOrder' });
    
    // Insert order items with discount info
    const orderItems = state.cart.map(item => ({
      order_id: order.id,
      product_id: item.cake.id,
      product_name: item.cake.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      original_unit_price: item.originalPrice || item.price,
      item_discount_percentage: item.itemDiscount?.percentage || null,
      item_discount_amount: item.itemDiscount?.amount || null,
      customizations: item.customizations || {
        flavor: item.flavor,
        variant: item.variant,
        specialInstructions: item.specialInstructions
      }
    }));
    
    await retryWithBackoff(async () => {
      const { error } = await supabase.from('order_items').insert(orderItems);
      if (error) throw error;
    }, { operationName: 'insertOrderItems' });
    
    return order;
  };

  // Direct card payment - skip PaymentModal, call tap-create-charge and redirect
  const handleDirectCardPayment = async () => {
    if (isProcessing) return;
    if (!user?.id) {
      toast.error('User session not found. Please log in again.');
      return;
    }
    setIsProcessing(true);

    const paymentTimeout = setTimeout(() => {
      console.error('⏰ Payment request timed out after 30 seconds');
      setIsProcessing(false);
      toast.error('Payment request timed out. Please check your internet connection and try again.');
    }, 30000);

    try {
      const customerInfo = {
        firstName: customerProfile?.first_name || '',
        lastName: customerProfile?.last_name,
        email: user?.email,
        phone: customerProfile?.whatsapp_number || ''
      };

      const cardOrderData = {
        customerId: user.id,
        cartItems: state.cart.map(item => ({
          productId: item.cake.id,
          productName: item.cake.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          originalUnitPrice: item.originalPrice || item.price,
          itemDiscountPercentage: item.itemDiscount?.percentage || null,
          itemDiscountAmount: item.itemDiscount?.amount || null,
          customizations: item.customizations || {
            flavor: item.flavor,
            variant: item.variant,
            specialInstructions: item.specialInstructions
          }
        })),
        deliveryAddressId: fulfillmentType === 'delivery' && selectedAddress ? selectedAddress : null,
        fulfillmentType,
        deliveryDate: deliveryDate ? format(deliveryDate, 'yyyy-MM-dd') : '',
        deliveryTime: deliveryTime,
        customerNotes,
        isGift,
        giftRecipient: isGift ? { name: giftRecipientName, phone: giftRecipientPhone } : null,
        vatPercentage: vatSettings.enabled ? vatSettings.percentage : 0,
        vatAmount,
        deliveryFee: deliveryFee,
        totalAmount: total,
        countryId: COUNTRY_ID,
        cakeDetails: JSON.parse(JSON.stringify({
          items: state.cart.map(item => ({
            ...item,
            cake: {
              id: item.cake.id,
              name: item.cake.name,
              categoryId: item.cake.categoryId,
              description: item.cake.description,
              inches: item.cake.inches,
              layers: item.cake.layers,
              servingSize: item.cake.servingSize,
              preparationTime: item.cake.preparationTime,
              basePrice: item.cake.basePrice
            }
          })),
          isGift,
          giftRecipient: isGift ? { name: giftRecipientName, phone: giftRecipientPhone } : null,
          fulfillmentType,
          deliveryAddress: fulfillmentType === 'delivery' ? (selectedAddress ? savedAddresses.find(a => a.id === selectedAddress) : newAddress) : null,
          delivery_time_slot: deliveryTime ? (generateTimeSlots().find(s => s.value === deliveryTime)?.label || deliveryTime) : null,
          delivery_time_value: deliveryTime || null,
          delivery_date: deliveryDate ? format(deliveryDate, 'yyyy-MM-dd') : null,
        })),
        originalAmount: subtotal,
        voucherId: cartAppliedVoucher?.voucher_id || null,
        voucherDiscount: discount,
        bakePointsApplied: appliedBakePoints,
        bakePointsDiscount: bakePointsDiscount
      };

      console.log('Initiating Tap payment directly, Amount:', total);

      const { data, error } = await supabase.functions.invoke('tap-create-charge-kw', {
        body: {
          amount: total,
          customerInfo,
          orderData: cardOrderData
        }
      });

      clearTimeout(paymentTimeout);

      if (error) {
        console.error('Tap charge error:', error);
        toast.error(error.message || 'Failed to connect to payment gateway. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (!data) {
        console.error('No response from tap-create-charge');
        toast.error('No response from payment gateway. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (data.success && data.redirectUrl) {
        console.log('Redirecting to Tap payment page:', data.redirectUrl);
        window.location.href = data.redirectUrl;
        // Don't reset isProcessing - page is navigating away
      } else {
        console.error('Tap charge failed:', data);
        toast.error(data.error || 'Unable to initialize payment. Please try again.');
        setIsProcessing(false);
      }
    } catch (error) {
      clearTimeout(paymentTimeout);
      console.error('Payment error:', error);
      toast.error('An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 'gift') {
      setCurrentStep('address');
    } else if (currentStep === 'address') {
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
      // If total is 0 and pickup, skip payment modal and directly process order
      if (total <= 0 && fulfillmentType === 'pickup') {
        handlePaymentSuccess();
      } else if (paymentMethod === 'card' && total > 0) {
        // For card payments, skip PaymentModal and go directly to Tap
        await handleDirectCardPayment();
      } else {
        // For cash payments, show payment modal for confirmation
        setShowPaymentModal(true);
      }
    }
  };
  const handleBack = () => {
    if (currentStep === 'address') {
      setCurrentStep('gift');
    } else if (currentStep === 'payment') {
      setCurrentStep('address');
    }
  };
  const handlePaymentSuccess = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setShowPaymentModal(false);
    
    let orderNumber = '';
    let orderId = '';
    
    try {
      if (paymentMethod === 'card' && pendingOrderId) {
        // Card payment - order already exists, get order number for toast
        orderId = pendingOrderId;
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('order_number')
          .eq('id', pendingOrderId)
          .maybeSingle();
        orderNumber = existingOrder?.order_number || '';
      } else {
      // Cash payment or free order - create order now
        const order = await createPendingOrder();
        orderId = order.id;
        orderNumber = order.order_number;
        
      // Cash orders remain as 'pending' until staff confirms via dashboard

        // Redeem BakePoints AFTER order is successfully created (for cash orders)
        if (appliedBakePoints > 0) {
          try {
            const { error: bakePointsError } = await supabase.rpc('redeem_bakepoints', {
              p_customer_id: user.id,
              p_points_to_redeem: appliedBakePoints,
              p_order_id: order.id,
              p_country_id: COUNTRY_ID
            });
            if (bakePointsError) {
              console.error('Error redeeming BakePoints:', bakePointsError);
            }
          } catch (bpError) {
            console.error('Failed to redeem BakePoints:', bpError);
          }
        }

      }

      // Send order confirmation email for ALL order types (fire and forget, idempotent)
      if (orderId) {
        supabase.functions.invoke('send-order-email', {
          body: { orderId }
        }).catch(err => console.error('Failed to send order email:', err));
      }

      // Fire-and-forget: Refresh profile and clear cart DB in background
      // Don't block the success UI on these operations
      if (refreshCustomerProfile) {
        refreshCustomerProfile().catch(err => console.warn('Profile refresh failed:', err));
      }

      if (user?.id) {
        clearCartInDB(user.id).catch(err => console.warn('Cart DB clear failed:', err));
        clearCartFromLocalStorage(user.id);
      }

      // Clear local cart state
      dispatch({ type: 'CLEAR_CART' });
      onSuccess();
      onClose();

      // Format delivery/pickup date for toast
      const formattedDate = deliveryDate ? format(deliveryDate, 'MMM d, yyyy') : 'scheduled date';
      const fulfillmentText = fulfillmentType === 'pickup' 
        ? (language === 'ar' ? 'استلام من المتجر' : 'Store Pickup') 
        : (language === 'ar' ? 'توصيل' : 'Delivery');
      const formattedTotal = `${toArabicNumerals(formatAmount(total))} ${currencyLabel}`;

      // Enhanced success toast with order details
      toast.success(
        t('checkout_order_placed')
          .replace('{orderNumber}', orderNumber)
          .replace('{total}', formattedTotal)
          .replace('{method}', fulfillmentText)
          .replace('{date}', formattedDate),
        { 
          duration: 8000,
          position: 'bottom-right'
        }
      );
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(language === 'ar' ? 'فشل في تقديم الطلب. يرجى المحاولة مرة أخرى.' : 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  const renderGiftStep = () => <div className="space-y-4 sm:space-y-6">
      <div className="text-center">
        <h3 className="text-base sm:text-lg font-semibold mb-2">{t('checkout_who_order_for')}</h3>
        <p className="text-muted-foreground text-xs sm:text-sm">{t('checkout_helps_service')}</p>
      </div>
      
      <div className="space-y-3 sm:space-y-4">
        <Card className={`cursor-pointer border-2 transition-colors ${!isGift ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setIsGift(false)}>
          <CardContent className="p-4 sm:p-6 text-center">
            <div className="text-2xl mb-2">🎂</div>
            <h4 className="font-semibold text-sm sm:text-base">{t('checkout_for_myself')}</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('checkout_my_celebration')}</p>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer border-2 transition-colors ${isGift ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setIsGift(true)}>
          <CardContent className="p-4 sm:p-6 text-center">
            <div className="text-2xl mb-2">🎁</div>
            <h4 className="font-semibold text-sm sm:text-base">{t('checkout_its_gift')}</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('checkout_someone_special')}</p>
            {isGift && <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                {t('checkout_card_required_gifts')}
              </div>}
          </CardContent>
        </Card>
      </div>
    </div>;
  const renderAddressStep = () => <div className="space-y-2 sm:space-y-4">
      <div className="text-center">
        <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2">{t('checkout_delivery_details')}</h3>
        <p className="text-muted-foreground text-[10px] sm:text-sm">{t('checkout_where_when')}</p>
      </div>

      {/* Fulfillment Type */}
      <Card>
        <CardHeader className="p-2 sm:p-6">
          <CardTitle className="text-xs sm:text-base">{t('checkout_delivery_method')}</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          <RadioGroup value={fulfillmentType} onValueChange={(value: 'delivery' | 'pickup') => setFulfillmentType(value)} className="flex flex-row gap-4 sm:gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="delivery" id="delivery" />
              <Label htmlFor="delivery" className="flex items-center gap-1.5 text-[10px] sm:text-sm cursor-pointer">
                <Truck className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span>{t('checkout_delivery')}</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pickup" id="pickup" />
              <Label htmlFor="pickup" className="flex items-center gap-1.5 text-[10px] sm:text-sm cursor-pointer">
                <Store className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span>{t('checkout_store_pickup')}</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Gift Recipient Information */}
      {isGift && <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="p-2 sm:p-6">
            <CardTitle className="text-xs sm:text-base flex items-center gap-2">
              <Gift className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 text-amber-600" />
              <span>{t('checkout_gift_recipient')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0 space-y-2">
            <div>
              <Label htmlFor="recipientName" className="text-[10px] sm:text-sm">
                {t('checkout_recipient_name')} <span className="text-red-500">*</span>
              </Label>
              <Input id="recipientName" value={giftRecipientName} onChange={e => setGiftRecipientName(e.target.value)} placeholder={t('checkout_recipient_name')} className="text-xs sm:text-sm h-8 sm:h-10 mt-1" required />
            </div>
            <div>
              <Label htmlFor="recipientPhone" className="text-[10px] sm:text-sm">
                {t('checkout_recipient_phone')} <span className="text-red-500">*</span>
              </Label>
              <Input id="recipientPhone" type="tel" value={giftRecipientPhone} onChange={e => setGiftRecipientPhone(e.target.value)} placeholder="+974 XXXX XXXX" className="text-xs sm:text-sm h-8 sm:h-10 mt-1" required />
            </div>
            
          </CardContent>
        </Card>}

      {/* Address Selection for Delivery */}
      {fulfillmentType === 'delivery' && <Card>
          <CardHeader className="p-2 sm:p-6">
            <CardTitle className="text-xs sm:text-base flex items-center gap-2">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
              {t('checkout_delivery_address')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 space-y-2">
            {savedAddresses.length > 0 && !showNewAddressForm ? <>
                <Select value={selectedAddress} onValueChange={setSelectedAddress}>
                  <SelectTrigger className="h-8 sm:h-10">
                    <SelectValue placeholder={t('checkout_choose_saved')} />
                  </SelectTrigger>
                  <SelectContent className="w-full max-h-60">
                    {savedAddresses.map(addr => <SelectItem key={addr.id} value={addr.id}>
                        <div className="max-w-[250px] sm:max-w-none">
                          <div className="font-medium truncate text-xs sm:text-sm">
                            {addr.label || t('checkout_unnamed_address')}
                            {addr.is_primary && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                {t('checkout_primary')}
                              </span>}
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            {addr.street_address || t('checkout_no_street')}
                            {addr.city && `, ${addr.city}`}
                          </div>
                        </div>
                      </SelectItem>)}
                  </SelectContent>
                </Select>

                {/* Warning for non-serviceable addresses */}
                {selectedAddress && savedAddresses.find(a => a.id === selectedAddress)?.is_serviceable === false && (
                  <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                    <p className="text-sm text-destructive font-semibold">
                      {language === 'ar' ? 'هذا العنوان خارج نطاق التوصيل' : 'This address is outside our delivery area'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'يرجى اختيار عنوان آخر أو إضافة عنوان جديد داخل الكويت' : `Please select a different address or add a new one within ${COUNTRY_NAME}`}
                    </p>
                  </div>
                )}
                
                <div className="text-center pt-1 sm:pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowNewAddressForm(true)} className="text-[10px] sm:text-sm h-7 sm:h-9">
                    <Plus className="w-3 h-3 mr-1" />
                    {t('checkout_add_new_address')}
                  </Button>
                </div>
              </> : <>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="address-label" className="text-[10px] sm:text-sm">{t('checkout_address_label')}</Label>
                    <Input id="address-label" value={newAddress.label} onChange={e => setNewAddress({
                ...newAddress,
                label: e.target.value
              })} placeholder="e.g., My Home, My Office, Work" className="text-xs sm:text-sm h-8 sm:h-10 mt-1" required />
                  </div>

                  {/* Map Picker */}
                  <div>
                    <Label className="text-[10px] sm:text-sm">{t('checkout_choose_location')}</Label>
                    <DeliveryZoneMap showZoneBoundaries={true} onLocationSelect={locationData => {
                setNewAddress(prev => ({
                  ...prev,
                  latitude: locationData.latitude,
                  longitude: locationData.longitude,
                  delivery_zone_id: locationData.zone_id,
                  delivery_fee: locationData.delivery_fee,
                  min_order_value: locationData.min_order_value,
                  is_serviceable: locationData.is_serviceable
                }));
              }} className="mt-1 sm:mt-2" />
                    {newAddress.latitude && newAddress.is_serviceable === false && <div className="p-3 bg-destructive/10 border border-destructive rounded-lg mt-2 space-y-1">
                        <p className="text-xs sm:text-sm text-destructive font-semibold flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          {t('checkout_no_delivery_here')}
                        </p>
                        <p className="text-[10px] sm:text-xs text-destructive/80">
                          {t('checkout_pick_different')}
                        </p>
                      </div>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="area" className="text-[10px] sm:text-sm">{t('addr_area')}</Label>
                      <Input id="area" value={newAddress.area} onChange={e => setNewAddress({
                  ...newAddress,
                  area: e.target.value
                })} placeholder={t('addr_area_placeholder')} className="text-xs sm:text-sm h-8 sm:h-10 mt-1" required />
                    </div>
                    <div>
                      <Label htmlFor="block" className="text-[10px] sm:text-sm">{t('addr_block')}</Label>
                      <Input id="block" value={newAddress.block} onChange={e => setNewAddress({
                  ...newAddress,
                  block: e.target.value
                })} placeholder={t('addr_block_placeholder')} className="text-xs sm:text-sm h-8 sm:h-10 mt-1" required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="street" className="text-[10px] sm:text-sm">{t('addr_street')}</Label>
                    <Input id="street" value={newAddress.street} onChange={e => setNewAddress({
                ...newAddress,
                street: e.target.value
              })} placeholder={t('addr_street_placeholder')} className="text-xs sm:text-sm h-8 sm:h-10 mt-1" required />
                  </div>
                  <div>
                    <Label htmlFor="house" className="text-[10px] sm:text-sm">{t('addr_house')}</Label>
                    <Input id="house" value={newAddress.house} onChange={e => setNewAddress({
                ...newAddress,
                house: e.target.value
              })} placeholder={t('addr_house_placeholder')} className="text-xs sm:text-sm h-8 sm:h-10 mt-1" required />
                  </div>
                  <div>
                    <Label htmlFor="landmarks" className="text-[10px] sm:text-sm">{t('addr_landmarks')}</Label>
                    <Input id="landmarks" value={newAddress.landmarks} onChange={e => setNewAddress({
                ...newAddress,
                landmarks: e.target.value
              })} placeholder={t('addr_landmarks_placeholder')} className="text-xs sm:text-sm h-8 sm:h-10 mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="country" className="text-[10px] sm:text-sm">{t('addr_country')}</Label>
                    <Input id="country" value={COUNTRY_NAME} disabled className="bg-muted text-xs sm:text-sm h-8 sm:h-10 mt-1" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="default" size="sm" onClick={handleAddNewAddress} disabled={isAddingAddress || !newAddress.latitude || !newAddress.longitude || !newAddress.area || !newAddress.block || !newAddress.street || !newAddress.house || !newAddress.is_serviceable} className="text-[10px] sm:text-sm h-8 sm:h-9">
                    {isAddingAddress ? <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        {t('checkout_saving')}
                      </> : t('checkout_save_address')}
                  </Button>
                  {savedAddresses.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => setShowNewAddressForm(false)} className="text-[10px] sm:text-sm h-8 sm:h-9">
                      {t('checkout_cancel')}
                    </Button>}
                </div>
              </>}
          </CardContent>
        </Card>}

      {/* Date & Time */}
      <Card>
        <CardHeader className="p-2 sm:p-6">
          <CardTitle className="text-xs sm:text-base flex items-center gap-2">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
            <span>{fulfillmentType === 'delivery' ? t('checkout_delivery_time') : t('checkout_pickup_time')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          <div className="space-y-2">
            <div>
              <Label className="text-[10px] sm:text-sm mb-1 sm:mb-2 block">{t('checkout_date')}</Label>
              <DateSelector 
                selectedDate={deliveryDate} 
                onSelectDate={setDeliveryDate}
                preparationMinutes={maxPreparationTime}
                deliveryMinutes={deliveryTimeMinutes}
                blockedSlots={blockedSlots}
              />
            </div>
            
            <div>
              <Label htmlFor="time" className="text-[10px] sm:text-sm">{t('checkout_time')}</Label>
              <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10 mt-1">
                  <SelectValue placeholder={t('checkout_select_time')} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {generateTimeSlotsWithStatus(deliveryDate, maxPreparationTime, deliveryTimeMinutes, blockedSlots).map(slot => <SelectItem key={slot.value} value={slot.value} disabled={slot.isPast} className={cn("text-[10px] sm:text-sm", slot.isPast && "line-through opacity-50 cursor-not-allowed")}>
                      {slot.label}
                      {slot.unavailableReason === 'past' && ` (${t('checkout_past')})`}
                      {slot.unavailableReason === 'preparation' && ` (${t('date_unavailable')})`}
                      {slot.unavailableReason === 'blocked' && ` (${t('date_unavailable')})`}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              {deliveryDate && <p className="text-[10px] text-muted-foreground mt-1">
                  {t('checkout_current_doha_time')} {format(getCurrentDohaTime(), 'hh:mm a')}
                </p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Location Map for Pickup */}
      {fulfillmentType === 'pickup' && <CompactMap title={t('checkout_pickup_location')} height="h-[180px] sm:h-[220px]" className="mt-2 sm:mt-4" />}
    </div>;
  const renderPaymentStep = () => {
    // Determine if payment options should be shown
    const shouldShowPaymentOptions = total > 0 || total <= 0 && fulfillmentType === 'delivery';
    return <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">
            {total <= 0 && fulfillmentType === 'pickup' ? t('checkout_ready_confirm') : t('checkout_payment_method')}
          </h3>
          <p className="text-muted-foreground">
            {total <= 0 && fulfillmentType === 'pickup' ? t('checkout_no_payment_required') : t('checkout_how_to_pay')}
          </p>
        </div>

        {shouldShowPaymentOptions && <Card>
            <CardContent className="p-6">
              <RadioGroup value={paymentMethod} onValueChange={(value: 'card' | 'cash') => setPaymentMethod(value)} disabled={isGift}>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="card" id="card-payment" />
                  <Label htmlFor="card-payment" className="flex items-center gap-2 cursor-pointer">
                    <CreditCard className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{t('checkout_credit_card')}</div>
                      <div className="text-xs text-muted-foreground">{t('checkout_secure_payment')}</div>
                    </div>
                  </Label>
                </div>
                
                <div className={`flex items-center space-x-3 p-3 border rounded-lg ${isGift ? 'opacity-50' : ''}`}>
                  <RadioGroupItem value="cash" id="cash-payment" disabled={isGift} />
                  <Label htmlFor="cash-payment" className={`flex items-center gap-2 ${isGift ? '' : 'cursor-pointer'}`}>
                    <Banknote className="w-4 h-4" />
                    <div>
                      <div className="font-medium">
                        {fulfillmentType === 'delivery' ? t('checkout_cash_on_delivery') : t('checkout_cash_on_pickup')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isGift ? t('checkout_not_available_gifts') : t('checkout_pay_when_receive')}
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>}

        {total <= 0 && fulfillmentType === 'pickup' && <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-medium">{t('checkout_no_payment_required')}</p>
              <p className="text-sm text-green-700 mt-1">
                {t('checkout_voucher_covers')}
              </p>
            </CardContent>
          </Card>}

        {/* Voucher Code */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('checkout_voucher_code')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!appliedVoucher ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder={t('checkout_enter_voucher')} value={voucherCode} onChange={e => setVoucherCode(e.target.value)} disabled={isValidatingVoucher} />
                  <Button onClick={validateAndApplyVoucher} disabled={!voucherCode.trim() || isValidatingVoucher} size="sm">
                    {isValidatingVoucher ? t('checkout_applying') : t('checkout_apply')}
                  </Button>
                </div>
                
                {/* Available Vouchers Dropdown */}
                {availableVouchers.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ChevronDown className="w-4 h-4" />
                      {t('checkout_view_vouchers')} ({availableVouchers.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {availableVouchers.map((voucher) => (
                        <div 
                          key={voucher.voucher_code}
                          onClick={() => setVoucherCode(voucher.voucher_code)}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{voucher.voucher_code}</Badge>
                            <span className="text-sm font-medium text-green-600">
                              {voucher.discount_percentage 
                                ? `${language === 'ar' ? toArabicNumerals(String(voucher.discount_percentage)) : voucher.discount_percentage}${language === 'ar' ? '٪ خصم' : '% off'}` 
                                : `${language === 'ar' ? toArabicNumerals(String(voucher.discount_amount)) + ' ' + currencyLabel + ' خصم' : currencyLabel + ' ' + voucher.discount_amount + ' off'}`}
                            </span>
                          </div>
                          {((language === 'ar' && (voucher as any).description_ar) || voucher.description_en) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {(language === 'ar' && (voucher as any).description_ar) || voucher.description_en}
                            </p>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {appliedVoucher.code}
                  </Badge>
                  <span className="text-sm text-green-700">
                   {appliedVoucher.applicable_products && appliedVoucher.discount_amount === 0
                     ? (language === 'ar' ? 'هذه القسيمة تنطبق على منتجات معينة فقط' : 'This voucher applies to certain items only')
                     : `-${currencyLabel} ${formatAmount(appliedVoucher.discount_amount)}`}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={removeVoucher} className="text-red-600 hover:text-red-700">
                  {t('checkout_remove')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BakePoints Redemption */}
        {customerProfile && countryBakePoints >= 50 && <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                {t('checkout_use_bakepoints')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appliedBakePoints === 0 ? <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-amber-900">
                        {t('checkout_available')} {countryBakePoints} BakePoints
                      </div>
                      <div className="text-xs text-amber-700">
                        {maxRedeemablePoints} {t('checkout_can_use')} (= {currencyLabel} {formatAmount(calculateDiscount(maxRedeemablePoints))})
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleRedeemBakePoints} disabled={maxRedeemablePoints < 50 || isRedeemingPoints || total <= 0} variant="outline" className="w-full border-amber-300 hover:bg-amber-50" size="sm">
                    {isRedeemingPoints ? <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('checkout_applying')}
                      </> : <>
                        <Star className="w-4 h-4 mr-2 text-amber-500 fill-amber-500" />
                        {t('checkout_redeem')} {maxRedeemablePoints} BakePoints
                      </>}
                  </Button>
                  
                  {maxRedeemablePoints < 50 && countryBakePoints >= 50 && <p className="text-xs text-muted-foreground text-center">
                      {t('checkout_order_total_low')}
                    </p>}
                  {countryBakePoints < 50 && <p className="text-xs text-muted-foreground text-center">
                      {t('checkout_min_points')} ({countryBakePoints})
                    </p>}
                </div> : <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {appliedBakePoints} BakePoints
                    </Badge>
                    <span className="text-sm text-green-700">
                      -{currencyLabel} {formatAmount(calculateDiscount(appliedBakePoints))}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleRemoveBakePoints} className="text-red-600 hover:text-red-700">
                    {t('checkout_remove')}
                  </Button>
                </div>}
            </CardContent>
          </Card>}

        {/* Order Summary */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">{t('checkout_order_summary')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3">
            {state.cart.map(item => {
              // Build customization display string from custom_selections
              const customDetails: string[] = [];
              
              if (item.customizations?.custom_selections) {
                Object.entries(item.customizations.custom_selections).forEach(([title, data]) => {
                  const selData = data as { selected?: string | string[]; selected_ar?: string | string[]; title_ar?: string; price?: number };
                  const displayTitle = language === 'ar' && selData.title_ar ? selData.title_ar : translateVariant(title);
                  const selected = language === 'ar' && selData.selected_ar
                    ? (Array.isArray(selData.selected_ar) ? selData.selected_ar.join(', ') : selData.selected_ar)
                    : (Array.isArray(selData.selected) ? selData.selected.join(', ') : selData.selected);
                  if (selected && selected !== 'Default' && selected !== 'Standard') {
                    customDetails.push(`${displayTitle}: ${selected}`);
                  }
                });
              }
              
              // Fallback to legacy flavor/variant if no custom_selections
              if (customDetails.length === 0) {
                if (item.flavor && item.flavor !== 'Default') {
                  customDetails.push(item.flavor);
                }
                if (item.variant && item.variant !== 'Standard') {
                  customDetails.push(item.variant);
                }
              }
              
              const detailsString = customDetails.length > 0 
                ? `${item.quantity}x • ${customDetails.join(' • ')}` 
                : `${item.quantity}x`;
              
              return (
                <div key={item.id} className="flex justify-between gap-2 text-xs sm:text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium break-words">{(language === 'ar' && item.cake.name_ar) || item.cake.name}</div>
                    <div className="text-muted-foreground break-words">
                      {detailsString}
                    </div>
                  </div>
                  {/* Price display with discount support */}
                  {item.originalPrice && item.originalPrice > item.price ? (
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-muted-foreground line-through whitespace-nowrap">
                        {currencyLabel} {formatAmount(item.originalPrice * item.quantity)}
                      </span>
                      <span className="font-medium text-destructive whitespace-nowrap">
                        {currencyLabel} {formatAmount(item.price * item.quantity)}
                      </span>
                      {item.itemDiscount?.percentage && (
                        <span className="text-[10px] text-green-600">
                          {item.itemDiscount.percentage}{t('checkout_percent_off')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="font-medium whitespace-nowrap">
                      {currencyLabel} {formatAmount(item.price * item.quantity)}
                    </div>
                  )}
                </div>
              );
            })}
            
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-xs sm:text-sm">
                <span>{t('checkout_subtotal')}</span>
                <span className="whitespace-nowrap">{currencyLabel} {formatAmount(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                  <span>{t('checkout_delivery_fee')}</span>
                  <span className="whitespace-nowrap">{currencyLabel} {formatAmount(deliveryFee)}</span>
                </div>
              {appliedVoucher && appliedVoucher.discount_amount > 0 && <div className="flex justify-between text-xs sm:text-sm text-green-600">
                  <span className="break-words pr-2">{t('checkout_discount')} ({appliedVoucher.code})</span>
                  <span className="whitespace-nowrap">-{currencyLabel} {formatAmount(appliedVoucher.discount_amount)}</span>
                </div>}
              {appliedBakePoints > 0 && <div className="flex justify-between text-xs sm:text-sm text-amber-600">
                  <span className="whitespace-nowrap">BakePoints ({appliedBakePoints})</span>
                  <span className="whitespace-nowrap">-{currencyLabel} {formatAmount(calculateDiscount(appliedBakePoints))}</span>
                </div>}
              {vatSettings.enabled && vatAmount > 0 && <div className="flex justify-between text-xs sm:text-sm">
                  <span>{t('checkout_vat')} ({vatSettings.percentage}%)</span>
                  <span className="whitespace-nowrap">{currencyLabel} {formatAmount(vatAmount)}</span>
                </div>}
              <div className="flex justify-between font-semibold text-sm sm:text-base">
                <span>{t('checkout_total')}</span>
                <span className="text-primary whitespace-nowrap">{currencyLabel} {formatAmount(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Special Instructions */}
        <div>
          <Label htmlFor="notes">{t('checkout_special_instructions')}</Label>
          <Textarea id="notes" placeholder={t('checkout_special_placeholder')} value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} />
        </div>
      </div>;
  };
  return <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] sm:max-w-md md:max-w-2xl max-h-[90vh] sm:max-h-[92vh] overflow-hidden flex flex-col p-0 box-border">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 md:p-6">
            {/* Store Closed Alert */}
            {isStoreClosed && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-center">
                <Store className="w-8 h-8 mx-auto mb-2 text-destructive" />
                <h3 className="font-semibold text-destructive">{t('checkout_store_closed')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('checkout_store_closed_desc')}
                </p>
              </div>
            )}

            <DialogHeader>
              <DialogTitle className="text-center text-base sm:text-lg">
                {currentStep === 'gift' && t('checkout_order_type')}
                {currentStep === 'address' && t('checkout_delivery_details')}
                {currentStep === 'payment' && t('checkout_payment_summary')}
              </DialogTitle>
            </DialogHeader>

            {/* Progress indicator */}
            <div className="flex items-center justify-center mb-4 sm:mb-6 mt-2">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium ${currentStep === 'gift' ? 'bg-primary text-primary-foreground' : currentStep === 'address' || currentStep === 'payment' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  1
                </div>
                <div className={`w-6 sm:w-8 h-1 ${currentStep === 'address' || currentStep === 'payment' ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium ${currentStep === 'address' ? 'bg-primary text-primary-foreground' : currentStep === 'payment' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  2
                </div>
                <div className={`w-6 sm:w-8 h-1 ${currentStep === 'payment' ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium ${currentStep === 'payment' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  3
                </div>
              </div>
            </div>

            {/* Zone-specific minimum order warning */}
            {!meetsMinimumOrder && zoneMinOrderValue > 0 && fulfillmentType === 'delivery' && (
              <div className="mx-4 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium text-center">
                  {t('checkout_min_order_zone')} {toArabicNumerals(String(zoneMinOrderValue))} {currencyLabel}
                </p>
              </div>
            )}

            {/* Render appropriate step content */}
            <div className="w-full max-w-full overflow-hidden">
              {currentStep === 'gift' && renderGiftStep()}
              {currentStep === 'address' && renderAddressStep()}
              {currentStep === 'payment' && renderPaymentStep()}
            </div>
          </div>

          {/* Sticky Navigation - always visible at bottom */}
          <div className="sticky bottom-0 flex gap-2 sm:gap-3 p-2 sm:p-4 md:p-6 pt-3 sm:pt-4 border-t bg-background/80 backdrop-blur-sm">
            {currentStep !== 'gift' && <Button variant="outline" onClick={handleBack} className="flex-1 text-xs sm:text-sm">
                <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
                <span className="hidden sm:inline">{t('checkout_back')}</span>
                <span className="sm:hidden">{t('checkout_back')}</span>
              </Button>}
            <Button onClick={handleNext} disabled={!canProceedToNext() || isProcessing || isStoreClosed} className="flex-1 text-xs sm:text-sm">
              {isProcessing ? <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 shrink-0" />
                  <span className="truncate">{t('checkout_processing')}</span>
                </> : <>
                  <span className="truncate">
                    {currentStep === 'payment' ? total <= 0 && fulfillmentType === 'pickup' ? t('checkout_confirm_order') : t('checkout_place_order') : t('checkout_continue')}
                  </span>
                  {currentStep !== 'payment' && <ArrowRight className="w-4 h-4 ml-1 sm:ml-2 shrink-0" />}
                </>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
        onSuccess={handlePaymentSuccess} 
        cartItems={state.cart} 
        totalAmount={total} 
        isGift={isGift} 
        paymentMethod={paymentMethod}
        customerInfo={{
          firstName: customerProfile?.first_name || '',
          lastName: customerProfile?.last_name,
          email: user?.email,
          phone: customerProfile?.whatsapp_number || ''
        }}
        vatEnabled={vatSettings.enabled}
        vatPercentage={vatSettings.percentage}
        vatAmount={vatAmount}
        deliveryFee={deliveryFee}
        fulfillmentType={fulfillmentType}
        voucherDiscount={discount > 0 ? discount : undefined}
        voucherCode={appliedVoucher?.code}
        bakePointsDiscount={bakePointsDiscount > 0 ? bakePointsDiscount : undefined}
        bakePointsApplied={appliedBakePoints > 0 ? appliedBakePoints : undefined}
        orderData={paymentMethod === 'card' ? {
          customerId: user?.id || '',
          cartItems: state.cart.map(item => ({
            productId: item.cake.id,
            productName: item.cake.name,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
            originalUnitPrice: item.originalPrice || item.price,
            itemDiscountPercentage: item.itemDiscount?.percentage || null,
            itemDiscountAmount: item.itemDiscount?.amount || null,
            customizations: item.customizations || {
              flavor: item.flavor,
              variant: item.variant,
              specialInstructions: item.specialInstructions
            }
          })),
          deliveryAddressId: fulfillmentType === 'delivery' && selectedAddress ? selectedAddress : null,
          fulfillmentType,
          deliveryDate: deliveryDate ? format(deliveryDate, 'yyyy-MM-dd') : '',
          deliveryTime: deliveryTime,
          customerNotes,
          isGift,
          giftRecipient: isGift ? { name: giftRecipientName, phone: giftRecipientPhone } : null,
          vatPercentage: vatSettings.enabled ? vatSettings.percentage : 0,
          vatAmount,
          deliveryFee: deliveryFee,
          totalAmount: total,
          countryId: COUNTRY_ID,
          cakeDetails: JSON.parse(JSON.stringify({
            items: state.cart.map(item => ({
              ...item,
              cake: {
                id: item.cake.id,
                name: item.cake.name,
                categoryId: item.cake.categoryId,
                description: item.cake.description,
                inches: item.cake.inches,
                layers: item.cake.layers,
                servingSize: item.cake.servingSize,
                preparationTime: item.cake.preparationTime,
                basePrice: item.cake.basePrice
                // Explicitly exclude 'image' to reduce payload size
              }
            })),
            isGift,
            giftRecipient: isGift ? { name: giftRecipientName, phone: giftRecipientPhone } : null,
            fulfillmentType,
            deliveryAddress: fulfillmentType === 'delivery' ? (selectedAddress ? savedAddresses.find(a => a.id === selectedAddress) : newAddress) : null
          })),
          // Voucher and BakePoints data for webhook to process
          originalAmount: subtotal, // Items subtotal only, delivery fee tracked separately
          voucherId: cartAppliedVoucher?.voucher_id || null,
          voucherDiscount: discount,
          bakePointsApplied: appliedBakePoints,
          bakePointsDiscount: bakePointsDiscount
        } : undefined}
      />
    </>;
}