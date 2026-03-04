import { useState, useEffect, useRef } from 'react';
import { DEFAULT_CURRENCY } from '@/config/country';
import { formatAmount } from '@/utils/currencyHelpers';
import { formatOrderItemCustomizations } from '@/utils/orderHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AddressManager from '@/components/AddressManager';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { useOrders } from '@/hooks/useOrders';
import { User, MapPin, Calendar, Phone, Mail, Loader2, Package, RefreshCw, AlertCircle, Coins, Plus, ArrowLeft } from "lucide-react";
import { getPointsLabel, getPointsRedemptionInfo } from '@/utils/pointsDisplay';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PhoneNumberInput } from '@/components/PhoneNumberInput';
import { formatPhoneWithCode } from '@/utils/phoneFormatting';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { COUNTRY_ID } from '@/config/country';

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
      return { data: null, error: new Error('Request timed out'), timedOut: true };
    }
    return { data: null, error: err, timedOut: false };
  }
}

export default function ProfilePage() {
  const { user, customerProfile, updateCustomerProfile, refreshCustomerProfile } = useAuth();
  const { orders, loading: ordersLoading, error: ordersError, retryFetch } = useOrders();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  // Check if user has a real email (not temp) - fall back to database email
  const hasTempEmail = user?.email?.includes('@temp.pandacakes');
  const dbEmail = customerProfile?.email;
  const displayEmail = (!hasTempEmail && user?.email) || dbEmail || null;
  const hasRealEmail = !!displayEmail;

  useEffect(() => {
    if (customerProfile) {
      setEditData({
        first_name: customerProfile.first_name || '',
        email: displayEmail || '',
        birthdate: customerProfile.birthdate || ''
      });
    }
  }, [customerProfile, hasRealEmail, user?.email]);

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

  if (!user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your profile.</p>
      </main>
    );
  }

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
      toast.success('Email updated successfully!');
    }

    setIsSaving(false);

    if (!error) {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      await refreshCustomerProfile();
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-black font-display text-foreground mb-8">My Profile</h1>
        
        <Tabs value={activeTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Addresses</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Orders</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Personal Information</span>
                </CardTitle>
                <CardDescription>
                  Your account details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center mb-6">
                  <ProfileAvatar size="lg" />
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
                        {phoneChangeStep === 'edit' ? 'Change Phone Number' : 'Verify New Number'}
                      </h3>
                    </div>
                    
                    {phoneChangeStep === 'edit' ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Enter your new phone number. We'll send a verification code to confirm.
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
                              Sending...
                            </>
                          ) : 'Send Verification Code'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Enter the 4-digit code sent to {formatPhoneWithCode(newPhoneNumber)}
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
                            Verifying...
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
                              ? `Resend code in ${resendCooldown}s` 
                              : 'Resend code'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {phoneChangeStep === 'view' && (
                  <>
                    {isEditing ? (
                      // EDIT MODE
                      <>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">First Name *</label>
                            <Input
                              value={editData.first_name}
                              onChange={(e) => setEditData(prev => ({ ...prev, first_name: e.target.value }))}
                              placeholder="Enter first name"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">Email (Optional)</label>
                            <Input
                              type="email"
                              value={editData.email}
                              onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Enter email for order confirmations"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Order confirmations will be sent via email
                            </p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">Birth Date (Optional)</label>
                            <Input
                              type="date"
                              value={editData.birthdate}
                              onChange={(e) => setEditData(prev => ({ ...prev, birthdate: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="flex-1"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Changes'
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setIsEditing(false);
                              setEditData({
                                first_name: customerProfile?.first_name || '',
                email: displayEmail || '',
                birthdate: customerProfile?.birthdate || ''
              });
            }}
            disabled={isSaving}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      // VIEW MODE
                      <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Name</label>
                          <p className="text-foreground font-semibold">{getDisplayName()}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>Email</span>
                          </label>
                          {!hasRealEmail ? (
                             <div className="space-y-1">
                               <Button
                                 variant="outline"
                                 size="sm"
                                 className="h-8 px-3"
                                 onClick={() => setIsEditing(true)}
                               >
                                 <Plus className="h-4 w-4 mr-1" />
                                 Add email, for a better ordering experience
                               </Button>
                               <p className="text-xs text-muted-foreground">
                                 Order confirmations will be sent via email*
                               </p>
                             </div>
                           ) : (
                             <div className="flex items-center gap-2">
                               <p className="text-foreground">{displayEmail}</p>
                               <Badge variant="default">Verified</Badge>
                             </div>
                           )}
                        </div>
                        
                        {customerProfile?.whatsapp_number && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>Phone</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <p className="text-foreground">{formatPhoneWithCode(customerProfile.whatsapp_number)}</p>
                              <Badge variant="default">Verified</Badge>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setPhoneChangeStep('edit')}
                              >
                                Change
                              </Button>
                            </div>
                          </div>
                        )}

                        {customerProfile?.birthdate && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Birth Date</label>
                            <p className="text-foreground">{new Date(customerProfile.birthdate).toLocaleDateString()}</p>
                          </div>
                        )}
                        
                        {customerProfile?.loyalty_points !== undefined && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Coins className="h-4 w-4 text-tiffany" />
                              <label className="text-sm font-medium text-muted-foreground">
                                {getPointsLabel(customerProfile?.country_id)}
                              </label>
                            </div>
                            <p className="text-foreground font-semibold text-2xl text-tiffany">
                              {customerProfile.loyalty_points} Points
                            </p>
                            <div className="text-xs text-muted-foreground space-y-1 mt-2">
                              <p className="font-medium">• 500 BakePoints = 1 {DEFAULT_CURRENCY} discount</p>
                              <p className="font-medium">• Valid for 12 months from earning</p>
                              <p className="font-medium">• Redeem at checkout</p>
                            </div>
                          </div>
                        )}

                        <Button 
                          onClick={() => setIsEditing(true)}
                          variant="outline"
                          className="w-full"
                        >
                          Edit Profile
                        </Button>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="addresses">
            <AddressManager />
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>
                  Track your past orders and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ordersLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Loading orders...</p>
                    </div>
                  ) : ordersError ? (
                    <div className="text-center py-8">
                      <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2 text-destructive">Failed to load orders</h3>
                      <p className="text-muted-foreground mb-4">{ordersError}</p>
                      <Button onClick={retryFetch} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders placed yet.</p>
                    </div>
                  ) : (
                    orders.map((order) => {
                      const orderCurrency = order.payment_currency || DEFAULT_CURRENCY;
                      const orderDecimals = orderCurrency === 'KWD' ? 3 : 2;
                      const fmt = (amount: number) => `${amount.toFixed(orderDecimals)} ${orderCurrency}`;
                      return (
                      <Card key={order.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-medium">Order #{order.order_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.order_items?.length || 0} item{(order.order_items?.length || 0) !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="text-right">
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
                              <p className="text-sm font-medium mt-1">
                                {fmt(order.total_amount)}
                              </p>
                            </div>
                          </div>

                          {/* Order Progress Tracker */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                              <span>Order Progress</span>
                              <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className={`bg-gradient-to-r from-tiffany to-primary h-2 rounded-full transition-all duration-500 ${
                                  order.status === 'pending' ? 'w-1/8' :
                                  order.status === 'confirmed' ? 'w-1/4' :
                                  order.status === 'preparing' ? 'w-1/2' :
                                  order.status === 'ready' ? 'w-3/4' :
                                  order.status === 'delivered' ? 'w-full' : 
                                  order.status === 'cancelled' ? 'w-0' : 'w-1/8'
                                }`}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Pending</span>
                              <span>Confirmed</span>
                              <span>Preparing</span>
                              <span>Ready</span>
                              <span>Delivered</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {order.order_items?.map((item: any, index: number) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>
                                  {item.quantity}x {item.product_name || item.menu_item?.name || 'Item'}
                                  {item.customizations && (
                                    <span className="text-muted-foreground ml-1">
                                      ({formatOrderItemCustomizations(item.customizations)})
                                    </span>
                                  )}
                                </span>
                                <span>{fmt((item.total_price || item.unit_price) ?? 0)}</span>
                              </div>
                            ))}
                          </div>
                          
                          {/* Order Breakdown - only show if there are discounts or fees */}
                          {((order.original_amount && order.original_amount !== order.total_amount) || 
                            (order.delivery_fee && order.delivery_fee > 0) || 
                            (order.voucher_discount_amount && order.voucher_discount_amount > 0) || 
                            (order.bakepoints_discount_amount && order.bakepoints_discount_amount > 0)) && (
                            <div className="border-t pt-2 mt-2 space-y-1 text-xs">
                              {order.original_amount && order.original_amount !== order.total_amount && (
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Subtotal</span>
                                  <span>{fmt(order.original_amount)}</span>
                                </div>
                              )}
                              
                              {order.delivery_fee && order.delivery_fee > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Delivery Fee</span>
                                  <span>{fmt(order.delivery_fee)}</span>
                                </div>
                              )}
                              
                              {order.voucher_discount_amount && order.voucher_discount_amount > 0 && (
                                <div className="flex justify-between text-green-600">
                                  <span>Voucher Discount</span>
                                  <span>-{fmt(order.voucher_discount_amount)}</span>
                                </div>
                              )}
                              
                              {order.bakepoints_discount_amount && order.bakepoints_discount_amount > 0 && (
                                <div className="flex justify-between text-amber-600">
                                  <span>BakePoints Discount</span>
                                  <span>-{fmt(order.bakepoints_discount_amount)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    );
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
