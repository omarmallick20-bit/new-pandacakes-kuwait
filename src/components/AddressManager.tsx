import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, MapPin, Loader2, XCircle } from "lucide-react";
import { DeliveryZoneMap } from '@/components/DeliveryZoneMap';
import { LocationPrompt } from '@/components/LocationPrompt';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { retryWithBackoff } from "@/utils/retryWithBackoff";
import { useTranslation } from "@/hooks/useTranslation";
import { COUNTRY_ID, COUNTRY_NAME } from '@/config/country';

interface Address {
  id: string;
  label: string;
  street_address: string;
  city: string;
  country: string;
  is_primary: boolean;
  landmarks?: string;
}

export default function AddressManager() {
  const { user, isAuthReady } = useAuth();
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    area: '',
    block: '',
    street: '',
    house: '',
    country: 'Kuwait',
    landmarks: '',
    latitude: null as number | null,
    longitude: null as number | null,
    delivery_zone_id: null as string | null,
    delivery_fee: null as number | null,
    is_serviceable: true
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [locationStep, setLocationStep] = useState<'prompt' | 'form'>('prompt');

  const OPERATION_TIMEOUT_MS = 15000; // 15 second timeout

  // CRITICAL: Reset state on mount
  useEffect(() => {
    mountedRef.current = true;
    setIsSaving(false);
    
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    fetchUserAddresses();
  }, [user, isAuthReady]);

  const fetchUserAddresses = async () => {
    if (!user?.id) {
      console.warn('[AddressManager] No user ID');
      setAddresses([]);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const data = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase
            .from('addresses')
            .select('*')
            .eq('customer_id', user.id)
            .eq('country_id', COUNTRY_ID)
            .order('created_at', { ascending: false });

          if (error) throw error;
          return data;
        },
        { operationName: 'fetchUserAddresses' }
      );

      setAddresses(data || []);
    } catch (error) {
      console.error('[AddressManager] Fatal error:', error);
      toast.error('Failed to load addresses');
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      area: '',
      block: '',
      street: '',
      house: '',
      country: 'Kuwait',
      landmarks: '',
      latitude: null,
      longitude: null,
      delivery_zone_id: null,
      delivery_fee: null,
      is_serviceable: true
    });
    setEditingAddress(null);
    setLocationStep('prompt');
  };

  const handleAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = async (address: Address) => {
    setLocationStep('form'); // Skip prompt when editing
    try {
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', address.id)
        .single();

      if (data) {
        // Parse stored street_address: "Block X, Street Y, House Z"
        const parts = data.street_address.split(',').map((s: string) => s.trim());
        const blockPart = parts[0]?.replace(/^Block\s*/i, '') || '';
        const streetPart = parts.length > 2 ? parts[1] : '';
        const housePart = parts.length > 2 ? parts.slice(2).join(', ') : parts.length > 1 ? parts[1] : '';

        setFormData({
          label: data.label,
          area: data.city,
          block: blockPart,
          street: streetPart,
          house: housePart,
          country: data.country,
          landmarks: data.landmarks || '',
          latitude: data.latitude,
          longitude: data.longitude,
          delivery_zone_id: data.delivery_zone_id,
          delivery_fee: data.delivery_fee,
          is_serviceable: data.is_serviceable ?? true
        });
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      const parts = address.street_address.split(',').map(s => s.trim());
      const blockPart = parts[0]?.replace(/^Block\s*/i, '') || '';
      const streetPart = parts.length > 2 ? parts[1] : '';
      const housePart = parts.length > 2 ? parts.slice(2).join(', ') : parts.length > 1 ? parts[1] : '';

      setFormData({
        label: address.label,
        area: address.city,
        block: blockPart,
        street: streetPart,
        house: housePart,
        country: address.country,
        landmarks: address.landmarks || '',
        latitude: null,
        longitude: null,
        delivery_zone_id: null,
        delivery_fee: null,
        is_serviceable: true
      });
    }
    setEditingAddress(address);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to manage addresses');
      return;
    }

    if (isSaving) return;

    // Validate coordinates are selected
    if (!formData.latitude || !formData.longitude) {
      toast.error('Please select a location on the map to save your address');
      return;
    }

    // Validate serviceability
    if (formData.is_serviceable === false) {
      toast.error('This location is outside our delivery area. Please choose a different address.');
      return;
    }
    
    if (addresses.length >= 10 && !editingAddress) {
      toast.error('You can only have up to 10 addresses');
      return;
    }

    setIsSaving(true);

    // Set timeout to auto-reset loading state
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('⚠️ [AddressManager] Operation timeout - resetting state');
        setIsSaving(false);
        toast.error('Request timed out. Please try again.');
      }
    }, OPERATION_TIMEOUT_MS);

    try {
      const fullStreetAddress = `${formData.building_flat ? formData.building_flat + ', ' : ''}${formData.street_address}`;

      if (editingAddress) {
        await retryWithBackoff(
          async () => {
            const { error } = await supabase
              .from('addresses')
              .update({
                label: formData.label,
                street_address: fullStreetAddress,
                city: formData.city,
                country: 'Kuwait',
                landmarks: formData.landmarks,
                latitude: formData.latitude,
                longitude: formData.longitude,
                delivery_zone_id: formData.delivery_zone_id,
                delivery_fee: formData.delivery_fee,
                is_serviceable: formData.is_serviceable
              })
              .eq('id', editingAddress.id)
              .eq('customer_id', user.id);

            if (error) throw error;
          },
          { operationName: 'updateAddress' }
        );
        toast.success('Address updated successfully');
      } else {
        await retryWithBackoff(
          async () => {
            const { error } = await supabase
              .from('addresses')
              .insert({
                customer_id: user.id,
                label: formData.label,
                street_address: fullStreetAddress,
                city: formData.city,
                country: 'Kuwait',
                country_id: COUNTRY_ID,
                landmarks: formData.landmarks,
                latitude: formData.latitude,
                longitude: formData.longitude,
                delivery_zone_id: formData.delivery_zone_id,
                delivery_fee: formData.delivery_fee,
                is_serviceable: formData.is_serviceable,
                is_primary: addresses.length === 0
              });

            if (error) throw error;
          },
          { operationName: 'insertAddress' }
        );
      toast.success('Address added successfully');
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchUserAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address');
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const openDeleteDialog = (address: Address) => {
    setAddressToDelete(address);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!user || !addressToDelete) return;

    setIsDeleting(true);

    try {
      // If deleting primary address and there are other addresses, set another as primary
      if (addressToDelete.is_primary && addresses.length > 1) {
        const otherAddress = addresses.find(addr => addr.id !== addressToDelete.id);
        if (otherAddress) {
          await retryWithBackoff(
            async () => {
              const { error } = await supabase
                .from('addresses')
                .update({ is_primary: true })
                .eq('id', otherAddress.id)
                .eq('customer_id', user.id);
              if (error) throw error;
            },
            { operationName: 'setPrimaryBeforeDelete' }
          );
        }
      }

      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressToDelete.id)
        .eq('customer_id', user.id);

      if (error) {
        // Check for foreign key violation (shouldn't happen now with ON DELETE SET NULL)
        if (error.code === '23503') {
          toast.error('Cannot delete this address right now. Please try again later.');
          console.error('FK violation on address delete:', error);
        } else {
          throw error;
        }
        return;
      }
      
      toast.success('Address deleted successfully');
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
      fetchUserAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    if (!user) return;

    try {
      // First, unset all addresses as primary
      await retryWithBackoff(
        async () => {
          const { error } = await supabase
            .from('addresses')
            .update({ is_primary: false })
            .eq('customer_id', user.id);
          if (error) throw error;
        },
        { operationName: 'unsetPrimaryAddresses' }
      );

      // Then set the selected address as primary
      await retryWithBackoff(
        async () => {
          const { error } = await supabase
            .from('addresses')
            .update({ is_primary: true })
            .eq('id', id)
            .eq('customer_id', user.id);

          if (error) throw error;
        },
        { operationName: 'setPrimaryAddress' }
      );
      
      toast.success('Primary address updated');
      fetchUserAddresses();
    } catch (error) {
      console.error('Error setting primary address:', error);
      toast.error('Failed to update primary address');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('addr_my_addresses')}</h2>
          <p className="text-muted-foreground">
            {t('addr_manage')} ({addresses.length}/10)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} disabled={addresses.length >= 10}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addr_add')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            {locationStep === 'prompt' && !editingAddress ? (
              <>
                <DialogHeader>
                  <DialogTitle>{t('addr_add_title')}</DialogTitle>
                  <DialogDescription>{t('addr_add_desc')}</DialogDescription>
                </DialogHeader>
                <LocationPrompt
                  onLocationObtained={(lat, lng) => {
                    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                    setLocationStep('form');
                  }}
                  onSkip={() => setLocationStep('form')}
                />
              </>
            ) : (
            <>
            <DialogHeader>
              <DialogTitle>
                {editingAddress ? t('addr_edit_title') : t('addr_add_title')}
              </DialogTitle>
              <DialogDescription>
                {editingAddress 
                  ? t('addr_edit_desc')
                  : t('addr_add_desc')
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label htmlFor="label">Address Label</Label>
                <Input
                  id="label"
                  placeholder="e.g., My Home, My Office, Work"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  required
                />
              </div>

              {/* Map Picker */}
              <div className="space-y-2">
                <Label>
                  Choose Location on Map <span className="text-destructive">*</span>
                </Label>
                <DeliveryZoneMap
                  showZoneBoundaries={true}
                  initialPosition={formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : undefined}
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
                  <div className="p-3 bg-destructive/10 border border-destructive rounded-lg space-y-1">
                    <p className="text-sm text-destructive font-semibold flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      No delivery to this location
                    </p>
                    <p className="text-xs text-destructive/80">
                      Please pick a different location on the map within our delivery zones
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
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="street">
                  Street Address *
                  {formData.latitude && formData.longitude && (
                    <span className="ml-2 text-xs bg-tiffany/10 text-tiffany px-2 py-0.5 rounded">
                      📍 From Map
                    </span>
                  )}
                </Label>
                <Textarea
                  id="street"
                  placeholder="Street, Area"
                  value={formData.street_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                  required
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="landmarks">Additional Details / Near Landmarks (Optional)</Label>
                <Input
                  id="landmarks"
                  placeholder="e.g., Near City Centre Mall, beside the park"
                  value={formData.landmarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, landmarks: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={COUNTRY_NAME}
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={!formData.latitude || !formData.longitude || formData.is_serviceable === false}
                >
                  {!formData.latitude || !formData.longitude 
                    ? t('addr_select_map') 
                    : editingAddress ? t('addr_update') : t('addr_add')}
                </Button>
              </div>
            </form>
            </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-6 w-24" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : addresses.length > 0 ? (
          addresses.map((address) => (
            <Card key={address.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-lg">{address.label}</CardTitle>
                    {address.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        {t('addr_primary')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(address)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(address)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p>{address.street_address}</p>
                    <p>{address.city}</p>
                    {address.landmarks && <p className="text-xs italic">{t('addr_near')} {address.landmarks}</p>}
                    <p>{address.country}</p>
                  </div>
                </div>
                
                {!address.is_primary && addresses.length > 1 && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(address.id)}
                    >
                      {t('addr_set_primary')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="py-12">
            <CardContent className="text-center">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('addr_no_addresses')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('addr_no_addresses_desc')}
              </p>
              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                {t('addr_add')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!isDeleting) {
          setDeleteDialogOpen(open);
          if (!open) setAddressToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('addr_delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('addr_delete_desc').replace('{label}', addressToDelete?.label || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAddressToDelete(null)} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}