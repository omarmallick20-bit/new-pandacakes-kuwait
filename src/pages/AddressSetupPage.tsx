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

const OPERATION_TIMEOUT_MS = 15000; // 15 second timeout

export default function AddressSetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAddress, setIsCheckingAddress] = useState(true);
  const [formData, setFormData] = useState({
    label: 'Home',
    building_flat: '',
    street_address: '',
    city: '',
    country: COUNTRY_NAME,
    country_id: COUNTRY_ID,
    landmarks: '',
    latitude: null as number | null,
    longitude: null as number | null,
    delivery_zone_id: null as string | null,
    delivery_fee: null as number | null,
    is_serviceable: true
  });
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();

  // CRITICAL: Reset loading state on mount
  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(false);
    
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Block browser back button - prevent skipping address setup
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = () => {
      window.history.pushState(null, '', window.location.href);
    };
    
    return () => {
      window.onpopstate = null;
    };
  }, []);

  useEffect(() => {
    // Wait for auth to be ready before checking
    if (!isAuthReady) return;

    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user already has an address
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

      // If user already has an address, redirect to home
      if (data && data.length > 0) {
        navigate('/');
        return;
      }
    } catch (error) {
      console.error('Error checking existing address:', error);
    } finally {
      if (mountedRef.current) {
        setIsCheckingAddress(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in first');
      return;
    }

    if (isLoading) return;

    // Validate coordinates are selected
    if (!formData.latitude || !formData.longitude) {
      toast.error('Please select a location on the map to continue');
      return;
    }

    if (formData.is_serviceable === false) {
      toast.error('This location is outside our delivery area. Please choose a different address.');
      return;
    }

    setIsLoading(true);

    // Set timeout to auto-reset loading state
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('⚠️ [AddressSetup] Operation timeout - resetting state');
        setIsLoading(false);
        toast.error('Request timed out. Please try again.');
      }
    }, OPERATION_TIMEOUT_MS);
    
    try {
      const addressData = {
        customer_id: user.id,
        label: formData.label,
        street_address: `${formData.building_flat ? formData.building_flat + ', ' : ''}${formData.street_address}`,
        city: formData.city,
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
          const { error } = await supabase
            .from('addresses')
            .insert(addressData);

          if (error) throw error;
        },
        { operationName: 'insertAddress' }
      );

      toast.success('Address saved successfully!');
      
      // Check if there's a return URL
      const returnUrl = sessionStorage.getItem('checkout_return_url');
      sessionStorage.removeItem('checkout_return_url');
      
      navigate(returnUrl || '/');
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address. Please try again.');
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Show loading while checking for existing address
  if (isCheckingAddress) {
    return (
      <main className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-tiffany" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
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
          <CardTitle className="text-2xl font-bold">
            Add Your Address
          </CardTitle>
          <CardDescription>
            We need your delivery address to complete your account setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Address Label</Label>
              <Input
                id="label"
                placeholder="e.g., My Home, My Office, Work"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                required
                disabled={isLoading}
              />
            </div>

            {/* Map Picker */}
            <div className="space-y-2">
              <Label>
                Choose Location on Map <span className="text-destructive">*</span>
              </Label>
              <DeliveryZoneMap
                showZoneBoundaries={true}
                onLocationSelect={(locationData) => {
                  setFormData(prev => ({
                    ...prev,
                    street_address: locationData.street || prev.street_address,
                    city: locationData.city || prev.city,
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    delivery_zone_id: locationData.zone_id,
                    delivery_fee: locationData.delivery_fee,
                    is_serviceable: locationData.is_serviceable
                  }));
                }}
              />

              {/* Location selected indicator */}
              {formData.latitude && formData.longitude && formData.is_serviceable !== false && (
                <div className="flex items-center gap-2 p-2 bg-tiffany/10 border border-tiffany/30 rounded-lg">
                  <span className="text-tiffany text-sm font-medium">✓ Location Selected</span>
                  <span className="text-xs text-muted-foreground">
                    ({formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)})
                  </span>
                </div>
              )}

              {/* Warning when no location selected */}
              {!formData.latitude && !formData.longitude && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ Please tap on the map or use "Use My Location" to set delivery coordinates
                  </p>
                </div>
              )}

              {formData.latitude && formData.is_serviceable === false && (
                <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ This location is outside our delivery area
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please select a different location or contact us for assistance
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="building_flat">Block and Building Details *</Label>
              <Input
                id="building_flat"
                placeholder="e.g., Block 3, Building 45"
                value={formData.building_flat}
                onChange={(e) => setFormData(prev => ({ ...prev, building_flat: e.target.value }))}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="street_address">
                Street Address *
                {formData.latitude && formData.longitude && (
                  <span className="ml-2 text-xs bg-tiffany/10 text-tiffany px-2 py-0.5 rounded">
                    📍 From Map
                  </span>
                )}
              </Label>
              <Input
                id="street_address"
                placeholder="Street, Area"
                value={formData.street_address}
                onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Area</Label>
              <Input
                id="city"
                placeholder="e.g., Salmiya, Hawalli"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="landmarks">Additional Details / Near Landmarks (Optional)</Label>
              <Input
                id="landmarks"
                placeholder="e.g., Near City Centre Mall, beside the park"
                value={formData.landmarks}
                onChange={(e) => setFormData(prev => ({ ...prev, landmarks: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Help us find you easier by adding nearby landmarks
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
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
                ? 'Select Location on Map First' 
                : 'Save Address & Continue'}
            </Button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('address_setup_skipped', 'true');
                  toast.info('You can add your address later before placing an order');
                  navigate('/');
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Skip for now
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
