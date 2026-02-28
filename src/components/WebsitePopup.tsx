import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { X, Gift, Sparkles, Copy, Check } from 'lucide-react';
import { PopupPhoneInput } from './PopupPhoneInput';
import { COUNTRY_ID } from '@/config/country';

interface WebsitePopupData {
  id: string;
  popup_type: string;
  heading: string | null;
  description: string | null;
  voucher_code: string | null;
  signup_title: string | null;
  signup_subtitle: string | null;
  signup_image_url: string | null;
  background_color: string | null;
  text_color: string | null;
  accent_color: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  country_id: string;
  signup_voucher_code: string | null;
  signup_voucher_description: string | null;
}

const hasSeenPopup = (popupId: string): boolean => {
  return localStorage.getItem(`panda_popup_seen_${popupId}`) !== null;
};

const markPopupAsSeen = (popupId: string): void => {
  localStorage.setItem(`panda_popup_seen_${popupId}`, Date.now().toString());
};

export function WebsitePopup() {
  const { user } = useAuth();
  const [activePopup, setActivePopup] = useState<WebsitePopupData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [signupVoucherCopied, setSignupVoucherCopied] = useState(false);

  useEffect(() => {
    const fetchPopups = async () => {
      try {
        const now = new Date().toISOString();
        
        const { data: popups, error } = await supabase
          .from('website_popups')
          .select('*')
          .eq('is_active', true)
          .eq('country_id', COUNTRY_ID)
          .or(`valid_from.is.null,valid_from.lte.${now}`)
          .or(`valid_until.is.null,valid_until.gte.${now}`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching popups:', error);
          return;
        }

        if (!popups || popups.length === 0) return;

        // Filter popups based on conditions
        const eligiblePopups = popups.filter(popup => {
          // Check if already seen
          if (hasSeenPopup(popup.id)) return false;

          // Check date validity
          const now = new Date();
          if (popup.valid_from && new Date(popup.valid_from) > now) return false;
          if (popup.valid_until && new Date(popup.valid_until) < now) return false;

          // For signup popups: only show to non-authenticated users
          if (popup.popup_type === 'signup' && user) return false;

          return true;
        });

        if (eligiblePopups.length === 0) return;

        // Prioritize signup popups for non-authenticated users, otherwise show offer
        const signupPopup = eligiblePopups.find(p => p.popup_type === 'signup');
        const offerPopup = eligiblePopups.find(p => p.popup_type === 'offer');

        // Show signup popup if user is not logged in and it exists
        const popupToShow = !user && signupPopup ? signupPopup : offerPopup || eligiblePopups[0];

        if (popupToShow) {
          // Small delay before showing popup for better UX
          setTimeout(() => {
            setActivePopup(popupToShow);
            setIsOpen(true);
          }, 1500);
        }
      } catch (err) {
        console.error('Error in popup fetch:', err);
      }
    };

    // Wait for auth state to be determined before fetching popups
    const timer = setTimeout(fetchPopups, 500);
    return () => clearTimeout(timer);
  }, [user]);

  const handleClose = () => {
    if (activePopup) {
      markPopupAsSeen(activePopup.id);
    }
    setIsOpen(false);
    setActivePopup(null);
  };

  const handleSignup = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (!activePopup) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('popup_signups').insert({
        phone_number: phoneNumber,
        popup_id: activePopup.id,
        country_id: activePopup.country_id || COUNTRY_ID,
        customer_type: 'new_visitor'
      });

      if (error) {
        console.error('Signup error:', error);
        toast.error('Something went wrong. Please try again.');
        return;
      }

      // Show success with voucher if available
      if (activePopup.signup_voucher_code) {
        setSignupComplete(true);
        toast.success('Welcome! Here\'s your exclusive voucher code.');
      } else {
        toast.success('Welcome! You\'ll receive our best offers soon.');
        handleClose();
      }
    } catch (err) {
      console.error('Signup error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySignupVoucher = async () => {
    if (!activePopup?.signup_voucher_code) return;
    
    try {
      await navigator.clipboard.writeText(activePopup.signup_voucher_code);
      setSignupVoucherCopied(true);
      toast.success('Voucher code copied!');
      setTimeout(() => setSignupVoucherCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const handleCopyCode = async () => {
    if (!activePopup?.voucher_code) return;
    
    try {
      await navigator.clipboard.writeText(activePopup.voucher_code);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  if (!activePopup || !isOpen) return null;

  const isSignup = activePopup.popup_type === 'signup';
  const bgColor = activePopup.background_color || '#000000';
  const textColor = activePopup.text_color || '#FFFFFF';
  const accentColor = activePopup.accent_color || '#FF6B6B';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="p-0 gap-0 border-0 overflow-hidden max-w-md"
        style={{ 
          backgroundColor: bgColor,
          color: textColor 
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1 transition-opacity hover:opacity-70"
          style={{ backgroundColor: `${textColor}20`, color: textColor }}
        >
          <X className="h-4 w-4" />
        </button>

        {isSignup ? (
          /* Signup Popup Design */
          <div className="flex flex-col">
            {/* Image section */}
            {activePopup.signup_image_url && (
              <div className="relative h-48 w-full overflow-hidden">
                <img 
                  src={activePopup.signup_image_url} 
                  alt="Signup offer"
                  className="w-full h-full object-cover"
                />
                <div 
                  className="absolute inset-0"
                  style={{ 
                    background: `linear-gradient(to bottom, transparent 50%, ${bgColor})` 
                  }}
                />
              </div>
            )}

            {/* Content section */}
            <div className="p-6 pt-4 flex flex-col items-center text-center">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: accentColor }}
              >
                <Sparkles className="h-6 w-6" style={{ color: textColor }} />
              </div>

              <h2 
                className="text-2xl font-bold mb-2"
                style={{ color: accentColor }}
              >
                {activePopup.signup_title || 'SIGN UP!'}
              </h2>

              <p className="text-sm opacity-80 mb-6">
                {activePopup.signup_subtitle || 'Get exciting updates and discounts on your first order!'}
              </p>

              {/* Phone input */}
              <div className="w-full mb-4">
                <PopupPhoneInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  backgroundColor={bgColor}
                  textColor={textColor}
                  accentColor={accentColor}
                />
              </div>

              {!signupComplete ? (
                <>
                  <Button
                    onClick={handleSignup}
                    disabled={isSubmitting}
                    className="w-full font-semibold py-6"
                    style={{ 
                      backgroundColor: accentColor,
                      color: bgColor
                    }}
                  >
                    {isSubmitting ? 'Signing up...' : 'Sign Up'}
                  </Button>

                  <button
                    onClick={handleClose}
                    className="mt-4 text-sm opacity-60 hover:opacity-100 transition-opacity"
                  >
                    Maybe Later
                  </button>
                </>
              ) : (
                /* Show voucher after successful signup */
                <div className="w-full">
                  <div 
                    className="p-4 rounded-lg mb-4"
                    style={{ backgroundColor: `${textColor}10`, border: `1px solid ${accentColor}40` }}
                  >
                    <p className="text-xs opacity-60 mb-2">🎉 Your welcome voucher:</p>
                    <div className="flex items-center justify-between gap-2">
                      <span 
                        className="text-xl font-bold tracking-wider"
                        style={{ color: accentColor }}
                      >
                        {activePopup.signup_voucher_code}
                      </span>
                      <button
                        onClick={handleCopySignupVoucher}
                        className="p-2 rounded-md transition-colors hover:opacity-70"
                        style={{ backgroundColor: `${textColor}20` }}
                      >
                        {signupVoucherCopied ? (
                          <Check className="h-4 w-4" style={{ color: accentColor }} />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs opacity-60 mt-2">
                      {activePopup.signup_voucher_description || 'One-time use for new accounts'}
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleClose}
                    className="w-full font-semibold py-6"
                    style={{ 
                      backgroundColor: accentColor,
                      color: bgColor
                    }}
                  >
                    Start Shopping
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Offer/Promotional Popup Design */
          <div className="p-8 flex flex-col items-center text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: accentColor }}
            >
              <Gift className="h-8 w-8" style={{ color: textColor }} />
            </div>

            <h2 
              className="text-2xl font-bold mb-2"
              style={{ color: accentColor }}
            >
              {activePopup.heading || 'Special Offer!'}
            </h2>

            {activePopup.description && (
              <p className="text-sm opacity-80 mb-6">
                {activePopup.description}
              </p>
            )}

            {activePopup.voucher_code && (
              <div className="w-full mb-6">
                <p className="text-xs opacity-60 mb-2">Use code:</p>
                <div 
                  className="flex items-center justify-center gap-3 py-3 px-4 rounded-lg"
                  style={{ backgroundColor: `${textColor}15` }}
                >
                  <span 
                    className="text-xl font-bold tracking-wider"
                    style={{ color: accentColor }}
                  >
                    {activePopup.voucher_code}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-md transition-colors hover:opacity-70"
                    style={{ backgroundColor: `${textColor}20` }}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" style={{ color: accentColor }} />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <Button
              onClick={handleClose}
              className="w-full font-semibold py-6"
              style={{ 
                backgroundColor: accentColor,
                color: bgColor
              }}
            >
              Shop Now
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
