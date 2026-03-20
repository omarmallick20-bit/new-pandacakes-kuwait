import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin } from 'lucide-react';
import { DeliveryZoneMap } from '@/components/DeliveryZoneMap';
import { LocationPrompt } from '@/components/LocationPrompt';
import { retryWithBackoff } from '@/utils/retryWithBackoff';
import { COUNTRY_ID, COUNTRY_NAME } from '@/config/country';
import { useTranslation } from '@/hooks/useTranslation';

const OPERATION_TIMEOUT_MS = 15000;

export default function AddressSetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAddress, setIsCheckingAddress] = useState(true);
  const [formData, setFormData] = useState({
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
    is_serviceable: true
  });
  const [locationStep, setLocationStep] = useState<'prompt' | 'form'>('prompt');
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(false);
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = () => {
      window.history.pushState(null, '', window.location.href);
    };
    return () => { window.onpopstate = null; };
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) { navigate('/login'); return; }
    checkExistingAddress();
  }, [user, navigate, isAuthReady]);

  const checkExistingAddress = async () => {
    if (!user || !isAuthReady) return;
    try {
      setIsCheckingAddress(true);
      const data = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase
            .from('addresses')
            .select('*')
            .eq('customer_id', user.id)
            .eq('country_id', COUNTRY_ID)
            .limit(1);
          if (error) throw error;
          return data;
        },
        { operationName: 'checkExistingAddress', maxRetries: 2 }
      );
      if (data && data.length > 0) { navigate('/'); return; }
    } catch (error) {
      console.error('Error checking existing address:', error);
    } finally {
      if (mountedRef.current) setIsCheckingAddress(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please log in first'); return; }
    if (isLoading) return;
    if (!formData.latitude || !formData.longitude) {
      toast.error('Please select a location on the map to continue');
      return;
    }
    if (formData.is_serviceable === false) {
      toast.error('This location is outside our delivery area. Please choose a different address.');
      return;
    }

    setIsLoading(true);
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setIsLoading(false);
        toast.error('Request timed out. Please try again.');
      }
    }, OPERATION_TIMEOUT_MS);
    
    try {
      const addressData = {
        customer_id: user.id,
        label: formData.label,
        street_address: `Block ${formData.block}, ${formData.street}, ${formData.house}`,
        city: formData.area,
        country: COUNTRY_NAME,
        country_id: COUNTRY_ID,
        landmarks: formData.landmarks,
        latitude: formData.latitude,
        longitude: formData.longitude,
        is_primary: true,
        delivery_zone_id: formData.delivery_zone_id,
        delivery_fee: formData.delivery_fee,
        is_serviceable: formData.is_serviceable
      };

      await retryWithBackoff(
        async () => {
          const { error } = await supabase.from('addresses').insert(addressData);
          if (error) throw error;
        },
        { operationName: 'insertAddress' }
      );

      toast.success('Address saved successfully!');
      const returnUrl = sessionStorage.getItem('checkout_return_url');
      sessionStorage.removeItem('checkout_return_url');
      navigate(returnUrl || '/');
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address. Please try again.');
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (mountedRef.current) setIsLoading(false);
    }
  };

  if (isCheckingAddress) {
    return (
      <main className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-tiffany" />
          <p className="text-muted-foreground">{t('common_loading')}</p>
        </div>
      </main>
    );
  }

  if (locationStep === 'prompt') {
    return (
      <main className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{t('addr_setup_title')}</CardTitle>
            <CardDescription>{t('addr_setup_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <LocationPrompt
              onLocationObtained={(lat, lng) => {
                setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                setLocationStep('form');
              }}
              onSkip={() => setLocationStep('form')}
            />
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('address_setup_skipped', 'true');
                  toast.info(t('addr_skip_msg'));
                  navigate('/');
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                {t('addr_skip')}
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-tiffany/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-6 h-6 text-tiffany" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('addr_setup_title')}</CardTitle>
          <CardDescription>{t('addr_setup_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">{t('addr_label')}</Label>
              <Input
                id="label"
                placeholder={t('addr_label_placeholder')}
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                required
                disabled={isLoading}
              />
            </div>

            {/* Map Picker */}
            <div className="space-y-2">
              <Label>
                {t('addr_map_label')} <span className="text-destructive">*</span>
              </Label>
              <DeliveryZoneMap
                showZoneBoundaries={true}
                onLocationSelect={(locationData) => {
                  setFormData(prev => ({
                    ...prev,
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    delivery_zone_id: locationData.zone_id,
                    delivery_fee: locationData.delivery_fee,
                    is_serviceable: locationData.is_serviceable
                  }));
                }}
              />

              {formData.latitude && formData.longitude && formData.is_serviceable !== false && (
                <div className="flex items-center gap-2 p-2 bg-tiffany/10 border border-tiffany/30 rounded-lg">
                  <span className="text-tiffany text-sm font-medium">✓ {t('addr_location_selected')}</span>
                  <span className="text-xs text-muted-foreground">
                    ({formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)})
                  </span>
                </div>
              )}

              {!formData.latitude && !formData.longitude && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ {t('addr_map_warning')}
                  </p>
                </div>
              )}

              {formData.latitude && formData.is_serviceable === false && (
                <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ {t('addr_outside_zone')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('addr_outside_zone_desc')}
                  </p>
                </div>
              )}
            </div>

            {/* Area and Block side-by-side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">{t('addr_area')} *</Label>
                <Input
                  id="area"
                  placeholder={t('addr_area_placeholder')}
                  value={formData.area}
                  onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="block">{t('addr_block')} *</Label>
                <Input
                  id="block"
                  placeholder={t('addr_block_placeholder')}
                  value={formData.block}
                  onChange={(e) => setFormData(prev => ({ ...prev, block: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">{t('addr_street')} *</Label>
              <Input
                id="street"
                placeholder={t('addr_street_placeholder')}
                value={formData.street}
                onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="house">{t('addr_house')} *</Label>
              <Input
                id="house"
                placeholder={t('addr_house_placeholder')}
                value={formData.house}
                onChange={(e) => setFormData(prev => ({ ...prev, house: e.target.value }))}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="landmarks">{t('addr_landmarks')}</Label>
              <Input
                id="landmarks"
                placeholder={t('addr_landmarks_placeholder')}
                value={formData.landmarks}
                onChange={(e) => setFormData(prev => ({ ...prev, landmarks: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {t('addr_landmarks_hint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">{t('addr_country')}</Label>
              <Input
                id="country"
                value="Kuwait"
                disabled
                className="bg-muted"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !formData.latitude || !formData.longitude || formData.is_serviceable === false}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!formData.latitude || !formData.longitude 
                ? t('addr_select_location_first')
                : t('addr_save_continue')}
            </Button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('address_setup_skipped', 'true');
                  toast.info(t('addr_skip_msg'));
                  navigate('/');
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                {t('addr_skip')}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}