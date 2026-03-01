import { useState, useEffect, useRef } from "react";
import { User, MapPin, ShoppingBag, Loader2, RefreshCw, HelpCircle, Trash2, Mail, Plus, Phone, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { ProfileAvatar } from "./ProfileAvatar";
import AddressManager from "./AddressManager";
import { getPointsLabel, getCurrencyForOrder } from '@/utils/pointsDisplay';
import { BakePointsInfoModal } from "./BakePointsInfoModal";
import { PaymentDetailsModal } from "./PaymentDetailsModal";
import { PhoneNumberInput } from "./PhoneNumberInput";
import { formatPhoneWithCode } from "@/utils/phoneFormatting";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRY_ID } from "@/config/country";
import { useTranslation } from "@/hooks/useTranslation";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
}

const OTP_TIMEOUT_MS = 10000;
const RESEND_COOLDOWN_SECONDS = 60;

// Helper function for Supabase calls with timeout
async function invokeWithTimeout<T>(
  fnName: string,
  body: Record<string, unknown>,
  timeoutMs: number = OTP_TIMEOUT_MS
): Promise<{ data: T | null; error: Error | null; timedOut: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { data, error } = await supabase.functions.invoke<T>(fnName, {
      body,
    });
    clearTimeout(timeout);
    if (error) return { data: null, error: new Error(error.message || String(error)), timedOut: false };
    return { data, error: null, timedOut: false };
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { data: null, error: new Error('Request timed out'), timedOut: false };
    }
    return { data: null, error: err, timedOut: false };
  }
}

export function ProfileModal({
  isOpen,
  onClose,
  defaultTab = "profile"
}: ProfileModalProps) {
  const {
    user,
    customerProfile,
    updateCustomerProfile,
    refreshCustomerProfile,
    isAuthReady,
    deleteAccount
  } = useAuth();
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    retryFetch,
    hasMore,
    loadMore,
    refetch
  } = useOrders(10);
  const { t, currencyLabel } = useTranslation();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showBakePointsInfo, setShowBakePointsInfo] = useState(false);
  const [countryBakePoints, setCountryBakePoints] = useState<number>(0);
  const [selectedOrderForPaymentDetails, setSelectedOrderForPaymentDetails] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editData, setEditData] = useState({
    first_name: '',
    email: '',
    birthdate: ''
  });
  
  // Phone change OTP state
  const [phoneChangeStep, setPhoneChangeStep] = useState<'view' | 'edit' | 'otp'>('view');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRequestIdRef = useRef(0);
  const hasAutoVerifiedRef = useRef(false);
  
  // Check if user has a real email (not temp), fall back to database email
  const hasTempEmail = user?.email?.includes('@temp.pandacakes.qa');
  const dbEmail = customerProfile?.email;
  const displayEmail = (!hasTempEmail && user?.email) || dbEmail || null;
  const hasRealEmail = !!displayEmail;
  
  // Refetch orders when modal opens on orders tab to ensure fresh data
  useEffect(() => {
    if (isOpen && activeTab === 'orders' && isAuthReady) {
      refetch();
    }
  }, [isOpen, activeTab, isAuthReady]);

  // Fetch country-specific BakePoints balance
  useEffect(() => {
    if (isOpen && user && isAuthReady) {
      const fetchPoints = async () => {
        try {
          const { data, error } = await supabase.rpc('get_available_bakepoints', {
            p_customer_id: user.id,
            p_country_id: COUNTRY_ID
          });
          if (!error) setCountryBakePoints(data || 0);
        } catch (err) {
          console.error('Error fetching country BakePoints:', err);
        }
      };
      fetchPoints();
    }
  }, [isOpen, user, isAuthReady]);

  // Initialize edit data when modal opens or customerProfile changes
  useEffect(() => {
    if (isOpen && customerProfile) {
      setEditData({
        first_name: customerProfile.first_name || '',
        email: displayEmail || '',
        birthdate: customerProfile.birthdate || ''
      });
    }
  }, [isOpen, customerProfile, hasRealEmail, displayEmail]);

  // Reset phone change state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPhoneChangeStep('view');
      setNewPhoneNumber('');
      setOtpCode('');
      setResendCooldown(0);
      hasAutoVerifiedRef.current = false;
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-verify when 4 digits are entered
  useEffect(() => {
    if (otpCode.length === 4 && !hasAutoVerifiedRef.current && !isVerifyingOtp) {
      hasAutoVerifiedRef.current = true;
      handleVerifyOtp();
    }
  }, [otpCode]);

  if (!user) return null;

  const getDisplayName = () => {
    if (customerProfile?.first_name) return customerProfile.first_name;
    // Never expose temp email or phone number as display name
    const email = user?.email;
    if (!email || email.includes('@temp.pandacakes.qa')) {
      return 'User';
    }
    return email.split('@')[0];
  };

  const handleSendOtp = async (phone?: string) => {
    const phoneToUse = phone || newPhoneNumber;
    if (!phoneToUse?.trim()) {
      toast.error('Please enter a phone number');
      return false;
    }

    setIsSendingOtp(true);
    const currentRequestId = ++otpRequestIdRef.current;

    const { error, timedOut } = await invokeWithTimeout('send-otp', {
      phone_number: phoneToUse,
      user_id: user?.id,
      purpose: 'phone_change',
      country_id: COUNTRY_ID
    });

    // Stale response guard
    if (currentRequestId !== otpRequestIdRef.current) return false;

    setIsSendingOtp(false);

    if (timedOut) {
      toast.error('Request timed out. Please try again.');
      return false;
    }

    if (error) {
      toast.error(error.message || 'Failed to send verification code');
      return false;
    }

    toast.success('Verification code sent!');
    setPhoneChangeStep('otp');
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    return true;
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 4) {
      toast.error('Please enter the 4-digit code');
      return;
    }

    setIsVerifyingOtp(true);
    const currentRequestId = otpRequestIdRef.current;

    const { error, timedOut } = await invokeWithTimeout('verify-otp', {
      phone_number: newPhoneNumber,
      otp_code: otpCode,
      user_id: user?.id,
      purpose: 'phone_change'
    });

    // Stale response guard
    if (currentRequestId !== otpRequestIdRef.current) {
      setIsVerifyingOtp(false);
      return;
    }

    setIsVerifyingOtp(false);

    if (timedOut) {
      toast.error('Verification timed out. Please try again.');
      hasAutoVerifiedRef.current = false;
      return;
    }

    if (error) {
      toast.error(error.message || 'Invalid verification code');
      hasAutoVerifiedRef.current = false;
      setOtpCode('');
      return;
    }

    // OTP verified, now update the phone number
    const { error: updateError } = await updateCustomerProfile({
      whatsapp_number: newPhoneNumber.trim()
    });

    if (updateError) {
      toast.error('Failed to update phone number');
      return;
    }

    toast.success('Phone number updated successfully!');
    await refreshCustomerProfile();
    setPhoneChangeStep('view');
    setNewPhoneNumber('');
    setOtpCode('');
    hasAutoVerifiedRef.current = false;
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    hasAutoVerifiedRef.current = false;
    setOtpCode('');
    await handleSendOtp(newPhoneNumber);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!editData.first_name?.trim()) {
      toast.error('First name is required');
      return;
    }
    
    setIsSaving(true);
    
    // Update customer profile (first name, birthdate)
    const { error } = await updateCustomerProfile({
      first_name: editData.first_name.trim(),
      birthdate: editData.birthdate || null
    });
    
    // Handle email update if changed - use edge function for direct update
    if (editData.email?.trim() && editData.email !== user?.email) {
      const { error: emailError } = await supabase.functions.invoke('update-email', {
        body: { 
          user_id: user.id,
          new_email: editData.email.trim() 
        }
      });
      
      if (emailError) {
        setIsSaving(false);
        toast.error('Failed to update email. Please try again.');
        return;
      }
      
      // CRITICAL: Refresh the auth session to get the updated email from auth.users
      // Without this, the UI will show the stale cached email from the session
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Failed to refresh session after email update:', refreshError);
      }
      
      toast.success('Email updated successfully!');
    }
    
    setIsSaving(false);
    if (!error) {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      await refreshCustomerProfile();
    }
  };

  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] sm:max-w-lg md:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-2 sm:p-4 md:p-6 box-border">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-2xl font-bold">{t('profile_title')}</DialogTitle>
          
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">{t('profile_tab')}</span>
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">{t('profile_addresses_tab')}</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">{t('profile_orders_tab')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">{t('profile_personal_info')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex flex-col items-center mb-4 sm:mb-6">
                  <div className="h-16 w-16 sm:h-20 sm:w-20">
                    <ProfileAvatar size="lg" />
                  </div>
                </div>
                
                {/* Phone Change OTP Flow */}
                {phoneChangeStep !== 'view' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setPhoneChangeStep('view');
                          setNewPhoneNumber('');
                          setOtpCode('');
                          hasAutoVerifiedRef.current = false;
                        }}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <h3 className="font-semibold">
                        {phoneChangeStep === 'edit' ? t('profile_change_phone') : t('profile_verify_number')}
                      </h3>
                    </div>
                    
                    {phoneChangeStep === 'edit' ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {t('profile_enter_new_phone')}
                        </p>
                        <PhoneNumberInput
                          value={newPhoneNumber}
                          onChange={setNewPhoneNumber}
                          required
                        />
                        <Button 
                          onClick={() => handleSendOtp()} 
                          disabled={isSendingOtp || !newPhoneNumber}
                          className="w-full"
                        >
                          {isSendingOtp ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('profile_sending')}
                            </>
                          ) : t('profile_send_code')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {t('profile_enter_code')} {formatPhoneWithCode(newPhoneNumber)}
                        </p>
                        <div className="flex justify-center">
                          <InputOTP 
                            maxLength={4} 
                            value={otpCode} 
                            onChange={setOtpCode}
                            disabled={isVerifyingOtp}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        {isVerifyingOtp && (
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('profile_verifying')}
                          </div>
                        )}
                        <div className="text-center">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={handleResendOtp}
                            disabled={resendCooldown > 0 || isSendingOtp}
                          >
                            {resendCooldown > 0 
                              ? `${t('profile_resend_in')} ${resendCooldown}s` 
                              : t('profile_resend')}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {phoneChangeStep === 'view' && (
                  <>
                    {isEditing ?
                  // EDIT MODE
                  <>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">{t('profile_first_name')}</label>
                            <Input value={editData.first_name} onChange={e => setEditData(prev => ({
                          ...prev,
                          first_name: e.target.value
                        }))} placeholder={t('profile_enter_first_name')} required />
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">{t('profile_email_optional')}</label>
                            <Input 
                              type="email"
                              value={editData.email} 
                              onChange={e => setEditData(prev => ({
                                ...prev,
                                email: e.target.value
                              }))} 
                              placeholder={t('profile_enter_email')} 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('profile_email_confirm')}
                            </p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">{t('profile_birthdate_optional')}</label>
                            <Input type="date" value={editData.birthdate} onChange={e => setEditData(prev => ({
                          ...prev,
                          birthdate: e.target.value
                        }))} />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                            {isSaving ? <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('profile_saving')}
                              </> : t('profile_save')}
                          </Button>
                          <Button variant="outline" onClick={() => {
                        setIsEditing(false);
                        setEditData({
                          first_name: customerProfile?.first_name || '',
                          email: displayEmail || '',
                          birthdate: customerProfile?.birthdate || ''
                        });
                      }} disabled={isSaving}>
                            {t('profile_cancel')}
                          </Button>
                        </div>
                      </> :
                  // VIEW MODE
                  <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">{t('profile_name')}</label>
                          <p className="text-lg font-medium">{getDisplayName()}</p>
                        </div>
                        
                        {/* Email section - show add prompt for temp users, real email for others */}
                        <div>
                          <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Email
                          </label>
                          {hasRealEmail ? (
                            <div className="flex items-center gap-2">
                              <p className="text-lg">{displayEmail}</p>
                              {user.email_confirmed_at && <Badge variant="default">{t('profile_verified')}</Badge>}
                            </div>
                          ) : (
                            <div className="space-y-1 mt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3"
                                onClick={() => setIsEditing(true)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                {t('profile_add_email_prompt')}
                              </Button>
                              <p className="text-xs text-muted-foreground">
                                {t('profile_email_confirm_star')}
                              </p>
                            </div>
                          )}
                        </div>

                        {customerProfile?.whatsapp_number && <div>
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {t('profile_phone_number')}
                            </label>
                            <div className="flex items-center gap-2">
                              <p className="text-lg">{formatPhoneWithCode(customerProfile.whatsapp_number)}</p>
                              <Badge variant="default">{t('profile_verified')}</Badge>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setPhoneChangeStep('edit')}
                              >
                                {t('profile_change')}
                              </Button>
                            </div>
                          </div>}

                        {customerProfile?.birthdate && <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('profile_birth_date')}</label>
                            <p className="text-lg">{new Date(customerProfile.birthdate).toLocaleDateString()}</p>
                          </div>}

                        {customerProfile && <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium text-muted-foreground">
                                {getPointsLabel(customerProfile?.country_id)}
                              </label>
                              <button type="button" onClick={() => setShowBakePointsInfo(true)} className="inline-flex items-center justify-center h-4 w-4 rounded-full 
                                         bg-muted hover:bg-muted/80 transition-colors group" aria-label="Learn about BakePoints">
                                <HelpCircle className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </button>
                            </div>
                            <p className="text-2xl font-bold text-primary">{countryBakePoints}</p>
                            <p className="text-xs text-muted-foreground mt-1">500 BakePoints = 1 {currencyLabel}</p>
                          </div>}

                        <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full">
                          {t('profile_edit')}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full mt-4 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('profile_delete_account')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('profile_delete_confirm_title')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('profile_delete_confirm_desc')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('profile_delete_no')}</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={async () => {
                                  setIsDeleting(true);
                                  const { error } = await deleteAccount();
                                  setIsDeleting(false);
                                  
                                  if (error) {
                                    toast.error('Failed to delete account: ' + error.message);
                                    return;
                                  }
                                  
                                  toast.success('Account deleted successfully');
                                  onClose();
                                  window.location.href = '/login';
                                }}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {isDeleting ? t('profile_deleting') : t('profile_delete_yes')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>}
                  </>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="addresses" className="space-y-4 sm:space-y-6">
            <AddressManager />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">{t('profile_order_history')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-4">
                  {ordersLoading ? <div className="text-center py-8">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t('profile_loading_orders')}</p>
                    </div> : ordersError ? <div className="text-center py-8">
                      <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2 text-destructive">{t('profile_failed_orders')}</h3>
                      <p className="text-muted-foreground mb-4">{ordersError}</p>
                      <Button onClick={retryFetch} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('profile_try_again')}
                      </Button>
                    </div> : orders.length === 0 ? <div className="text-center py-8">
                      <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t('profile_no_orders')}</h3>
                      <p className="text-muted-foreground">
                        {t('profile_no_orders_desc')}
                      </p>
                  </div> : orders.map(order => (
                    <div 
                      key={order.id} 
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                      onClick={() => setSelectedOrderForPaymentDetails(order)}
                    >
                      {/* Order info - stacks vertically on mobile, horizontal on desktop */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <Badge 
                            className={`text-xs ${
                              order.status === 'completed' || order.status === 'confirmed'
                                ? 'bg-green-500 text-white hover:bg-green-500/90 border-transparent' 
                                : order.status === 'cancelled' 
                                ? 'bg-red-500 text-white hover:bg-red-500/90 border-transparent' 
                                : order.status === 'rescheduled' 
                                ? 'bg-yellow-500 text-white hover:bg-yellow-500/90 border-transparent' 
                                : 'bg-gray-100 text-gray-800 border border-gray-300'
                            }`}
                          >
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate text-sm sm:text-base">
                            {t('profile_order_number')}{order.order_number}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {order.order_items?.length || 0} {(order.order_items?.length || 0) !== 1 ? t('profile_items') : t('profile_item')}
                          </p>
                        </div>
                      </div>

                      {/* Date and amount - side by side on mobile, stacked on desktop */}
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 sm:gap-0 text-right">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                        <span className="font-semibold text-sm sm:text-base">
                          {getCurrencyForOrder(order.country_id)} {order.total_amount?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Load More Button */}
                  {hasMore && !ordersLoading && orders.length > 0 && (
                    <div className="text-center pt-4">
                      <Button onClick={loadMore} variant="outline" size="sm">
                        {t('profile_load_more')}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      <BakePointsInfoModal 
        isOpen={showBakePointsInfo} 
        onClose={() => setShowBakePointsInfo(false)} 
      />
      
      {selectedOrderForPaymentDetails && (
        <PaymentDetailsModal
          isOpen={!!selectedOrderForPaymentDetails}
          onClose={() => setSelectedOrderForPaymentDetails(null)}
          order={selectedOrderForPaymentDetails}
        />
      )}
    </Dialog>;
}
