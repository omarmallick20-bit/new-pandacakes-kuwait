import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft, Phone, CheckCircle2 } from "lucide-react";
import { PhoneNumberInput } from "@/components/PhoneNumberInput";
import { COUNTRY_ID, PHONE_COUNTRY_CODE } from "@/config/country";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Validation schema for the details step (no phone - already verified)
const detailsSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email format').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  birthdate: z.string().optional()
});

const OPERATION_TIMEOUT_MS = 7000;
const OTP_TIMEOUT_MS = 8000;
const RESEND_COOLDOWN_SECONDS = 60;

type SignupStep = 'phone' | 'otp' | 'details';

interface PhoneCheckResult {
  exists: boolean;
  isClaimable: boolean;
  customerId?: string;
}

// Fail-fast wrapper for Supabase function invocations
async function invokeWithTimeout<T>(
  fnName: string,
  body: Record<string, unknown>,
  timeoutMs: number = OTP_TIMEOUT_MS
): Promise<{ data: T | null; error: Error | null; timedOut: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const invokePromise = supabase.functions.invoke(fnName, { body });
    const result = await Promise.race([
      invokePromise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('TIMEOUT'));
        });
      })
    ]);
    clearTimeout(timeoutId);
    return { data: result.data as T, error: result.error, timedOut: false };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.message === 'TIMEOUT') {
      return { data: null, error: new Error('Request timed out'), timedOut: true };
    }
    return { data: null, error: err, timedOut: false };
  }
}

export default function SignupPage() {
  const [step, setStep] = useState<SignupStep>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [showDuplicatePhoneDialog, setShowDuplicatePhoneDialog] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);

  // Phone & OTP state
  const [phoneNumber, setPhoneNumber] = useState(PHONE_COUNTRY_CODE + ' ');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // Details form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    birthdate: '',
    password: ''
  });

  const [claimableCustomerId, setClaimableCustomerId] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verifyingRef = useRef(false);
  const sendOtpRequestIdRef = useRef(0);
  const verifyOtpRequestIdRef = useRef(0);

  const { signUp, user, isAuthReady, refreshCustomerProfile, updatePassword, updateCustomerProfile } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(false);
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isAuthReady && user && !isLoading && !isCompletingProfile) {
      navigate('/', { replace: true });
    }
  }, [user, isLoading, navigate, isAuthReady, isCompletingProfile]);

  // Auto-verify OTP when 4 digits entered
  useEffect(() => {
    if (otpCode.length === 4 && !verifyingRef.current && !isVerifying) {
      verifyingRef.current = true;
      handleVerifyOtp();
    }
  }, [otpCode]);

  useEffect(() => {
    if (!isVerifying) {
      verifyingRef.current = false;
    }
  }, [isVerifying]);

  // --- Phone check (duplicate detection) ---
  const checkPhoneExists = async (phoneNumber: string): Promise<PhoneCheckResult> => {
    if (!isAuthReady) return { exists: false, isClaimable: false };

    const digitsOnly = phoneNumber.replace(/\D/g, '');
    const withPlus = `+${digitsOnly}`;
    const withoutPlus = digitsOnly;
    const withSpace = phoneNumber.trim();

    try {
      const { data: customer, error } = await supabase
        .from('Customers')
        .select('id, created_via_dashboard')
        .or(`whatsapp_number.eq.${withPlus},whatsapp_number.eq.${withoutPlus},whatsapp_number.eq.${withSpace}`)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking phone:', error);
        return { exists: false, isClaimable: false };
      }

      if (!customer) return { exists: false, isClaimable: false };

      console.log('📱 [Signup] Found existing customer with phone:', customer.id);

      if (customer.created_via_dashboard === true) {
        const { data: authCheck, error: authError } = await supabase.functions.invoke('check-customer-auth', {
          body: { customerId: customer.id }
        });
        if (authError) {
          console.error('Error checking auth status:', authError);
          return { exists: true, isClaimable: false };
        }
        if (!authCheck?.hasAuthAccount) {
          console.log('✅ [Signup] Customer is claimable (dashboard-created)');
          return { exists: true, isClaimable: true, customerId: customer.id };
        }
      }

      console.log('🔒 [Signup] Customer has auth account - should login');
      return { exists: true, isClaimable: false };
    } catch (error) {
      console.error('Error checking phone:', error);
      return { exists: false, isClaimable: false };
    }
  };

  // --- Cooldown timer ---
  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownIntervalRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // --- Send OTP ---
  const sendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast.error('Please enter a valid phone number');
      return false;
    }

    const requestId = ++sendOtpRequestIdRef.current;
    setIsSendingOtp(true);

    try {
      // Check for duplicate phone first
      const phoneCheck = await checkPhoneExists(phoneNumber);

      if (phoneCheck.exists && !phoneCheck.isClaimable) {
        if (mountedRef.current) {
          setIsSendingOtp(false);
          setShowDuplicatePhoneDialog(true);
        }
        return false;
      }

      if (phoneCheck.isClaimable && phoneCheck.customerId) {
        setClaimableCustomerId(phoneCheck.customerId);
      }

      console.log('📱 [Signup] Sending OTP to:', phoneNumber);
      const { data, error, timedOut } = await invokeWithTimeout<{ success?: boolean; error?: string }>(
        'send-otp',
        { phone_number: phoneNumber, purpose: 'signup_verification', country_id: COUNTRY_ID }
      );

      if (requestId !== sendOtpRequestIdRef.current) return false;

      if (timedOut) {
        toast.error('SMS provider is slow. Please try again.');
        return false;
      }
      if (error) {
        toast.error(error.message || 'Failed to send verification code');
        return false;
      }
      if (data?.error) {
        toast.error(data.error);
        return false;
      }

      console.log('✅ [Signup] OTP sent successfully');
      toast.success('Verification code sent to your phone');
      setStep('otp');
      startCooldown();
      return true;
    } catch (error: any) {
      console.error('❌ [Signup] OTP send exception:', error);
      toast.error('Failed to send verification code. Please try again.');
      return false;
    } finally {
      if (requestId === sendOtpRequestIdRef.current && mountedRef.current) {
        setIsSendingOtp(false);
      }
    }
  };

  // --- Verify OTP ---
  const handleVerifyOtp = async () => {
    if (isVerifying || otpCode.length !== 4) return;

    const requestId = ++verifyOtpRequestIdRef.current;
    setIsVerifying(true);

    try {
      console.log('🔐 [Signup] Verifying OTP:', otpCode);
      const { data, error, timedOut } = await invokeWithTimeout<{ success?: boolean; error?: string; remaining_attempts?: number }>(
        'verify-otp',
        { phone_number: phoneNumber, otp_code: otpCode, purpose: 'signup_verification' }
      );

      if (requestId !== verifyOtpRequestIdRef.current) return;

      if (timedOut) {
        toast.error('Verification is slow. Please try again.');
        setOtpCode('');
        return;
      }
      if (error) {
        toast.error(error.message || 'Verification failed');
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        if (data.remaining_attempts !== undefined) {
          toast.info(`${data.remaining_attempts} attempts remaining`);
        }
        setOtpCode('');
        return;
      }

      console.log('✅ [Signup] Phone verified successfully');
      toast.success('Phone verified!');
      setIsPhoneVerified(true);
      setIsCompletingProfile(true);

      // Create account immediately with temp credentials
      const tempPassword = crypto.randomUUID();
      const tempEmail = `${phoneNumber.replace(/\s/g, '')}@temp.pandacakes.qa`;

      const { error: signUpError } = await signUp(tempEmail, tempPassword, {
        firstName: '',
        lastName: '',
        phoneNumber,
        existingCustomerId: claimableCustomerId || undefined
      });

      if (signUpError) {
        if (signUpError.message?.includes('User already registered') || signUpError.message?.includes('already exists')) {
          console.log('🔄 [Signup] Orphaned auth detected, calling cleanup-orphaned-auth...');
          
          const { data: cleanupResult } = await supabase.functions.invoke('cleanup-orphaned-auth', {
            body: { temp_email: tempEmail }
          });

          if (cleanupResult?.cleaned) {
            console.log('✅ [Signup] Ghost cleaned, retrying signUp...');
            const { error: retryError } = await signUp(tempEmail, tempPassword, {
              firstName: '',
              lastName: '',
              phoneNumber,
              existingCustomerId: claimableCustomerId || undefined
            });
            if (retryError) {
              console.error('❌ [Signup] Retry failed:', retryError.message);
              toast.error('Failed to create account. Please try again.');
              setIsCompletingProfile(false);
              return;
            }
          } else {
            console.warn('⚠️ [Signup] Not orphaned (reason:', cleanupResult?.reason, ')');
            toast.error('An account already exists with this phone. Please try logging in.');
            setIsCompletingProfile(false);
            return;
          }
        } else {
          console.error('❌ [Signup] Account creation failed:', signUpError.message);
          toast.error(signUpError.message || 'Failed to create account. Please try again.');
          setIsCompletingProfile(false);
          return;
        }
      }

      // IMMEDIATELY show details form -- no polling, no waiting
      setStep('details');

      // Fire-and-forget: refresh profile in background
      refreshCustomerProfile().catch(() => {});
    } catch (error: any) {
      console.error('❌ [Signup] OTP verify exception:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      if (requestId === verifyOtpRequestIdRef.current && mountedRef.current) {
        setIsVerifying(false);
      }
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setOtpCode('');
    await sendOtp();
  };

  // --- Save profile details (account already created at OTP step) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    try {
      detailsSchema.parse(formData);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        toast.error(validationError.errors[0].message);
        return;
      }
    }

    if (!termsAccepted) {
      toast.error('Please accept the Terms & Conditions to continue');
      return;
    }

    setIsLoading(true);
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && isLoading) {
        setIsLoading(false);
        toast.error('Request timed out. Please try again.');
      }
    }, OPERATION_TIMEOUT_MS);

    try {
      const nameParts = formData.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // 1. Set the user's real password
      const { error: pwError } = await updatePassword(formData.password);
      if (pwError) {
        console.error('❌ [Signup] Password update failed:', pwError);
        toast.error('Failed to set password. Please try again.');
        return;
      }

      // 2. Update profile details in Customers table
      const isRealEmail = formData.email.trim() && !formData.email.includes('@temp.pandacakes.qa');
      const { error: profileError } = await updateCustomerProfile({
        first_name: firstName,
        last_name: lastName,
        email: isRealEmail ? formData.email.trim() : null,
        birthdate: formData.birthdate || null,
        has_completed_initial_setup: true,
        country_id: COUNTRY_ID,
        preferred_country: COUNTRY_ID,
        whatsapp_number: phoneNumber.replace(/\s/g, ''),
        phone_verified: true,
        phone_country_code: PHONE_COUNTRY_CODE,
      } as any);

      if (profileError) {
        console.error('❌ [Signup] Profile update failed:', profileError);
        toast.error('Failed to save profile. Please try again.');
        return;
      }

      // 3. If real email provided, update auth email too (fire-and-forget, non-blocking)
      if (isRealEmail) {
        supabase.functions.invoke('update-email', {
          body: {
            user_id: user?.id,
            new_email: formData.email.trim()
          }
        }).then(({ error: emailError }) => {
          if (emailError) {
            console.warn('Email auth update failed (non-blocking):', emailError);
          } else {
            supabase.auth.refreshSession();
          }
        }).catch(err => console.warn('Email update exception (non-blocking):', err));
      }

      toast.success('Profile saved successfully!');

      sessionStorage.setItem('auth_return_url', sessionStorage.getItem('return_after_login') || '/');
      sessionStorage.removeItem('return_after_login');
      // Refresh profile in context before navigating to prevent PhoneGuard stale state redirect
      await refreshCustomerProfile();
      // Navigate FIRST — component unmounts, so isCompletingProfile becomes irrelevant
      navigate('/address-setup');
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (mountedRef.current) setIsLoading(false);
    }
  };

  // --- Render helpers ---

  const renderPhoneStep = () => (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 bg-tiffany/10 rounded-full flex items-center justify-center mb-2">
          <Phone className="w-7 h-7 text-tiffany" />
        </div>
        <CardTitle className="text-2xl font-bold">{t('signup_title')}</CardTitle>
        <CardDescription>{t('signup_subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); sendOtp(); }} className="space-y-4">
          <div className="space-y-2">
            <PhoneNumberInput
              value={phoneNumber}
              onChange={setPhoneNumber}
              required
              disabled={isSendingOtp}
              placeholder="55555555"
            />
            <p className="text-xs text-muted-foreground">
              You will receive a verification code via SMS
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isSendingOtp || !phoneNumber || phoneNumber.length < 8}
          >
            {isSendingOtp ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('signup_sending_code')}
              </>
            ) : (
              t('signup_send_code')
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => navigate('/')}
            disabled={isSendingOtp}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common_back')}
          </Button>
          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground">
              {t('signup_have_account')}
              <Link to="/login" className="ml-1 text-tiffany hover:underline font-medium">
                {t('signup_login_link')}
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderOtpStep = () => (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <CheckCircle2 className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('signup_enter_code')}</CardTitle>
        <CardDescription>
          {t('signup_enter_code_desc')} {phoneNumber}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <InputOTP
              maxLength={4}
              value={otpCode}
              onChange={setOtpCode}
              disabled={isVerifying}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>

            {isVerifying && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Verifying...</span>
              </div>
            )}

            <div className="text-center">
              {resendCooldown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('signup_resend_in')} {resendCooldown}s
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-sm text-tiffany hover:underline"
                  disabled={isSendingOtp}
                >
                  {isSendingOtp ? t('signup_sending_code') : t('signup_resend_code')}
                </button>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => { setStep('phone'); setOtpCode(''); }}
            disabled={isVerifying}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('signup_change_number')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderDetailsStep = () => (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t('signup_complete_profile')}</CardTitle>
        <CardDescription>{t('signup_complete_profile_desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Verified phone badge */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-tiffany/10 border border-tiffany/20">
          <CheckCircle2 className="h-5 w-5 text-tiffany flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{phoneNumber}</p>
          </div>
          <span className="text-xs font-medium text-tiffany bg-tiffany/10 px-2 py-0.5 rounded-full">
            {t('signup_phone_verified')}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('signup_fullname')} *</Label>
            <Input
              id="fullName"
              placeholder={t('signup_name_placeholder')}
              value={formData.fullName}
              onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('signup_email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('signup_email_placeholder')}
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthdate">{t('signup_birthdate')}</Label>
            <Input
              id="birthdate"
              type="date"
              className="w-full appearance-none"
              max="9999-12-31"
              value={formData.birthdate}
              onChange={e => setFormData(prev => ({ ...prev, birthdate: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('signup_password')} *</Label>
            <PasswordInput
              id="password"
              placeholder={t('signup_password_placeholder')}
              value={formData.password}
              onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">{t('signup_password_hint')}</p>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              disabled={isLoading}
              className="mt-0.5"
            />
            <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
              {t('signup_terms_agree')}{' '}
              <Link
                to="/terms"
                target="_blank"
                className="text-tiffany hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {t('signup_terms_link')}
              </Link>
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !termsAccepted || formData.fullName.trim().length === 0 || formData.password.length < 6}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('signup_save_profile')}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t('signup_have_account')}
            <Link to="/login" className="ml-1 text-tiffany hover:underline font-medium">
              {t('signup_login_link')}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <main className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative">
      <button
        onClick={() => {
          if (step === 'phone') navigate('/');
          else if (step === 'otp') { setStep('phone'); setOtpCode(''); }
          else if (step === 'details') setStep('otp');
        }}
        className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors z-10"
        aria-label="Go back"
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="hidden md:inline text-sm font-medium">
          {step === 'phone' ? t('login_continue_guest') : t('common_back')}
        </span>
      </button>

      {step === 'phone' && renderPhoneStep()}
      {step === 'otp' && renderOtpStep()}
      {step === 'details' && renderDetailsStep()}

      {/* Duplicate Phone Number Dialog */}
      <AlertDialog open={showDuplicatePhoneDialog} onOpenChange={setShowDuplicatePhoneDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('signup_phone_already_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {t('signup_phone_already_desc')}{' '}
              <span
                className="text-tiffany font-semibold cursor-pointer hover:underline"
                onClick={() => {
                  setShowDuplicatePhoneDialog(false);
                  navigate('/login');
                }}
              >
                {t('signup_phone_already_login')}
              </span>
              {language === 'ar' ? '؟' : ' instead?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('signup_try_different')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate('/login')}
              className="bg-tiffany hover:bg-tiffany/90"
            >
              {t('signup_go_to_login')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
