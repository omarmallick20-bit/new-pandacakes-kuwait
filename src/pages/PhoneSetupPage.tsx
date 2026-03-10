import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { COUNTRY_ID } from '@/config/country';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PhoneNumberInput } from '@/components/PhoneNumberInput';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { Loader2, Phone, ArrowLeft, CheckCircle2 } from 'lucide-react';

const OTP_TIMEOUT_MS = 8000; // 8 second fail-fast timeout
const RESEND_COOLDOWN_SECONDS = 60;

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
    
    // Race between invoke and timeout
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

export default function PhoneSetupPage() {
  const { user, updateCustomerProfile, refreshCustomerProfile, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Form states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  // Flow states
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const mountedRef = useRef(true);
  const verifyingRef = useRef(false);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendOtpRequestIdRef = useRef(0); // Stale response guard
  const verifyOtpRequestIdRef = useRef(0); // Stale response guard

  // Auto-trigger OTP if coming from signup
  const shouldAutoVerify = searchParams.get('verify') === 'true';

  // CRITICAL: Reset loading state on mount
  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(false);
    
    return () => {
      mountedRef.current = false;
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, []);

  // Start resend cooldown timer
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

  useEffect(() => {
    // Wait for auth to be ready
    if (!isAuthReady) return;

    const checkPhoneAndAuth = async () => {
      // Check if user is logged in
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if phone already exists and is verified
      try {
        const { data, error } = await supabase
          .from('Customers')
          .select('whatsapp_number, phone_verified')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // If phone exists and is verified, redirect away
        if (data?.whatsapp_number && data.whatsapp_number.trim() !== '' && data?.phone_verified) {
          navigate('/address-setup');
          return;
        }

        // If phone exists but not verified, pre-fill and go to OTP step
        if (data?.whatsapp_number && data.whatsapp_number.trim() !== '' && !data?.phone_verified) {
          setPhoneNumber(data.whatsapp_number);
          if (shouldAutoVerify) {
            setStep('otp');
            // Auto-send OTP
            await sendOtp(data.whatsapp_number);
          }
        }
      } catch (error) {
        console.error('Error checking phone number:', error);
      } finally {
        if (mountedRef.current) {
          setIsChecking(false);
        }
      }
    };

    checkPhoneAndAuth();
  }, [user, navigate, isAuthReady, shouldAutoVerify]);

  // Block browser back button
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = () => {
      window.history.pushState(null, '', window.location.href);
    };
    
    return () => {
      window.onpopstate = null;
    };
  }, []);

  const sendOtp = async (phone?: string) => {
    const phoneToSend = phone || phoneNumber;
    
    if (!phoneToSend || phoneToSend.length < 8) {
      toast.error('Please enter a valid phone number');
      return false;
    }

    if (!user) {
      toast.error('Please log in to continue');
      return false;
    }

    // Increment request ID and capture for stale check
    const requestId = ++sendOtpRequestIdRef.current;
    setIsSendingOtp(true);

    try {
      console.log('📱 [PhoneSetup] Sending OTP to:', phoneToSend);
      
      const { data, error, timedOut } = await invokeWithTimeout<{ success?: boolean; error?: string }>(
        'send-otp',
        { phone_number: phoneToSend, user_id: user.id, country_id: COUNTRY_ID }
      );

      // Ignore stale responses
      if (requestId !== sendOtpRequestIdRef.current) {
        console.log('⏭️ [PhoneSetup] Ignoring stale send-otp response');
        return false;
      }

      if (timedOut) {
        console.warn('⏱️ [PhoneSetup] OTP send timed out');
        toast.error('SMS provider is slow. Please try again.');
        return false;
      }

      if (error) {
        console.error('❌ [PhoneSetup] OTP send error:', error);
        toast.error(error.message || 'Failed to send verification code');
        return false;
      }

      if (data?.error) {
        toast.error(data.error);
        return false;
      }

      console.log('✅ [PhoneSetup] OTP sent successfully');
      toast.success('Verification code sent to your phone');
      setStep('otp');
      startCooldown();
      return true;
    } catch (error: any) {
      console.error('❌ [PhoneSetup] OTP send exception:', error);
      toast.error('Failed to send verification code. Please try again.');
      return false;
    } finally {
      // Only update state if this is still the latest request
      if (requestId === sendOtpRequestIdRef.current && mountedRef.current) {
        setIsSendingOtp(false);
      }
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSendingOtp) return;
    
    // Send OTP first - don't let profile update block it
    const otpSent = await sendOtp();
    
    // Fire-and-forget: update profile in background after OTP is sent
    if (otpSent) {
      const phoneMatch = phoneNumber.match(/^(\+\d+)\s*(.+)$/);
      const countryCode = phoneMatch?.[1] || '+974';
      
      updateCustomerProfile({
        whatsapp_number: phoneNumber,
        phone_country_code: countryCode
      }).catch(err => console.warn('Profile update failed (non-blocking):', err));
    }
  };

const handleVerifyOtp = async () => {
    if (isVerifying || otpCode.length !== 4) return;

    if (!user) {
      toast.error('Please log in to continue');
      return;
    }

    // Increment request ID and capture for stale check
    const requestId = ++verifyOtpRequestIdRef.current;
    setIsVerifying(true);

    try {
      console.log('🔐 [PhoneSetup] Verifying OTP:', otpCode);
      
      const { data, error, timedOut } = await invokeWithTimeout<{ success?: boolean; error?: string; remaining_attempts?: number }>(
        'verify-otp',
        { phone_number: phoneNumber, otp_code: otpCode, user_id: user.id }
      );

      // Ignore stale responses
      if (requestId !== verifyOtpRequestIdRef.current) {
        console.log('⏭️ [PhoneSetup] Ignoring stale verify-otp response');
        return;
      }

      if (timedOut) {
        console.warn('⏱️ [PhoneSetup] OTP verify timed out');
        toast.error('Verification is slow. Please try again.');
        setOtpCode('');
        return;
      }

      if (error) {
        console.error('❌ [PhoneSetup] OTP verify error:', error);
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

      console.log('✅ [PhoneSetup] Phone verified successfully');
      toast.success('Phone number verified successfully!');
      
      // Clear skip flag since user is now verified
      localStorage.removeItem('phone_setup_skipped');
      
      // Navigate immediately - don't block on profile refresh
      navigate('/address-setup');
      
      // Refresh profile in background (non-blocking)
      refreshCustomerProfile().catch(err => {
        console.warn('⚠️ [PhoneSetup] Background profile refresh failed:', err);
      });
    } catch (error: any) {
      console.error('❌ [PhoneSetup] OTP verify exception:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      // Only update state if this is still the latest request
      if (requestId === verifyOtpRequestIdRef.current && mountedRef.current) {
        setIsVerifying(false);
      }
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    await sendOtp();
  };

  // Auto-verify when 4 digits entered
  useEffect(() => {
    if (otpCode.length === 4 && !verifyingRef.current && !isVerifying) {
      verifyingRef.current = true;
      handleVerifyOtp();
    }
  }, [otpCode]);

  // Reset verifyingRef when verification completes
  useEffect(() => {
    if (!isVerifying) {
      verifyingRef.current = false;
    }
  }, [isVerifying]);

  const handleBackToPhone = () => {
    setStep('phone');
    setOtpCode('');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            {step === 'otp' ? (
              <CheckCircle2 className="w-6 h-6 text-primary" />
            ) : (
              <Phone className="w-6 h-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {step === 'phone' ? 'Verify Your Phone' : 'Enter Verification Code'}
          </CardTitle>
          <CardDescription>
            {step === 'phone' 
              ? 'We need to verify your phone number for order updates'
              : `Enter the 4-digit code sent to ${phoneNumber}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <PhoneNumberInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  required
                  disabled={isSendingOtp}
                  placeholder="Enter your phone number"
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
                    Sending Code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>

              {/* Just browse option */}
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('phone_setup_skipped', 'true');
                  navigate('/');
                  toast.info('You can browse the menu. Verify your phone to place an order.');
                }}
                className="w-full text-sm text-muted-foreground hover:text-primary mt-4 py-2"
              >
                Skip for now and just browse
              </button>
            </form>
          ) : (
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
                      Resend code in {resendCooldown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="text-sm text-primary hover:underline"
                      disabled={isSendingOtp}
                    >
                      {isSendingOtp ? 'Sending...' : 'Resend Code'}
                    </button>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBackToPhone}
                disabled={isVerifying}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Change Phone Number
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
