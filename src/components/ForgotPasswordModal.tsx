import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhoneNumberInput } from "@/components/PhoneNumberInput";
import { PasswordInput } from "@/components/ui/password-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const OTP_TIMEOUT_MS = 10000; // 10 second fail-fast timeout

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

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'phone' | 'otp' | 'password' | 'success';

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const sendOtpRequestIdRef = useRef(0);
  const verifyOtpRequestIdRef = useRef(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('phone');
      setPhoneNumber('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswords(false);
      setResendCooldown(0);
    }
  }, [open]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-verify when 4 digits entered
  useEffect(() => {
    if (otpCode.length === 4 && step === 'otp' && !isLoading) {
      handleVerifyOtp();
    }
  }, [otpCode]);

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast.error('Please enter a valid phone number');
      return;
    }

    const requestId = ++sendOtpRequestIdRef.current;
    setIsLoading(true);
    
    try {
      const { data, error, timedOut } = await invokeWithTimeout<{ success?: boolean; error?: string; error_code?: string }>(
        'send-otp',
        { phone_number: phoneNumber, purpose: 'password_reset' }
      );

      // Ignore stale responses
      if (requestId !== sendOtpRequestIdRef.current) return;

      if (timedOut) {
        toast.error('SMS provider is slow. Please try again.');
        return;
      }

      if (error) throw error;

      if (data?.success === false || data?.error) {
        // Handle specific error codes with actionable messages
        if (data?.error_code === 'ACCOUNT_NOT_FOUND') {
          toast.error('No account found with this phone number', {
            description: 'Please sign up first to create an account.',
            duration: 5000
          });
        } else {
          toast.error(data.error || 'Failed to send verification code');
        }
        return;
      }

      toast.success('Verification code sent!');
      setStep('otp');
      setResendCooldown(60);
    } catch (error: any) {
      console.error('Send OTP error:', error);
      toast.error(error.message || 'Failed to send code');
    } finally {
      if (requestId === sendOtpRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 4) {
      toast.error('Please enter the 4-digit code');
      return;
    }

    const requestId = ++verifyOtpRequestIdRef.current;
    setIsLoading(true);
    
    try {
      const { data, error, timedOut } = await invokeWithTimeout<{ success?: boolean; error?: string; remaining_attempts?: number }>(
        'verify-otp',
        { phone_number: phoneNumber, otp_code: otpCode, purpose: 'password_reset' }
      );

      // Ignore stale responses
      if (requestId !== verifyOtpRequestIdRef.current) return;

      if (timedOut) {
        toast.error('Verification is slow. Please try again.');
        setOtpCode('');
        return;
      }

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        if (data.remaining_attempts !== undefined) {
          toast.info(`${data.remaining_attempts} attempts remaining`);
        }
        setOtpCode('');
        return;
      }

      toast.success('Phone verified!');
      setStep('password');
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      toast.error(error.message || 'Verification failed');
    } finally {
      if (requestId === verifyOtpRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { 
          phone_number: phoneNumber,
          new_password: newPassword
        }
      });

      if (error) throw error;

      if (data?.error) {
        // Handle specific error codes
        if (data.error_code === 'NO_AUTH_ACCOUNT') {
          toast.error('No account found for this phone number.', {
            description: 'Please sign up first to create an account.',
            duration: 5000
          });
          // Reset to phone step after short delay
          setTimeout(() => {
            onOpenChange(false);
          }, 2000);
          return;
        }
        toast.error(data.error);
        return;
      }

      setStep('success');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    await handleSendOtp();
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtpCode('');
    } else if (step === 'password') {
      setStep('otp');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(step === 'otp' || step === 'password') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 'phone' && 'Forgot Password'}
            {step === 'otp' && 'Enter Verification Code'}
            {step === 'password' && 'Set New Password'}
            {step === 'success' && 'Password Reset'}
          </DialogTitle>
          <DialogDescription>
            {step === 'phone' && 'Enter your phone number to receive a verification code'}
            {step === 'otp' && `We sent a code to ${phoneNumber}`}
            {step === 'password' && 'Create a new password for your account'}
            {step === 'success' && 'Your password has been reset successfully'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'phone' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reset-phone">Phone Number</Label>
                <PhoneNumberInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  placeholder="55555555"
                  disabled={isLoading}
                />
              </div>
              <Button
                className="w-full bg-tiffany hover:bg-tiffany/90 text-background"
                onClick={handleSendOtp}
                disabled={isLoading || !phoneNumber}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Verification Code
              </Button>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="flex flex-col items-center gap-4">
                <InputOTP
                  value={otpCode}
                  onChange={setOtpCode}
                  maxLength={4}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
                
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Verifying...</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-sm text-tiffany hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {resendCooldown > 0 
                    ? `Resend code in ${resendCooldown}s` 
                    : 'Resend code'}
                </button>
              </div>
            </>
          )}

          {step === 'password' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput
                  id="new-password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  showPassword={showPasswords}
                  onVisibilityChange={setShowPasswords}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <PasswordInput
                  id="confirm-password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  showPassword={showPasswords}
                  onVisibilityChange={setShowPasswords}
                />
              </div>
              <Button
                className="w-full bg-tiffany hover:bg-tiffany/90 text-background"
                onClick={handleResetPassword}
                disabled={isLoading || !newPassword || !confirmPassword}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <p className="text-muted-foreground">
                You can now sign in with your new password
              </p>
              <Button
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Back to Login
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
