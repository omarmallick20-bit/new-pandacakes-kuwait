import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { clearCartInDB } from "@/utils/cartSync";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, CreditCard, Banknote, Gift, Truck, Store, Plus, Map as MapIcon } from "lucide-react";
import { DeliveryZoneMap } from '@/components/DeliveryZoneMap';
import { toast } from "sonner";
import { UpsellModal } from "@/components/UpsellModal";
import { PaymentModal } from "@/components/PaymentModal";
import { COUNTRY_ID, COUNTRY_NAME, DEFAULT_CURRENCY } from '@/config/country';
import { formatAmount } from '@/utils/currencyHelpers';
export default function CheckoutPage() {
  const {
    state,
    dispatch
  } = useAppContext();
  const {
    user,
    customerProfile
  } = useAuth();
  const navigate = useNavigate();

  // Redirect to cart - checkout should happen via modal only
  useEffect(() => {
    console.log('🔀 [CheckoutPage] Redirecting to cart - checkout uses modal');
    navigate('/cart', { replace: true });
  }, [navigate]);
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('cash');
  const [isGift, setIsGift] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<Array<{
    id: string;
    label: string;
    street_address: string;
    city: string;
    country: string;
    is_primary: boolean;
    landmarks?: string;
    delivery_zone_id?: string;
    delivery_fee?: number;
    is_serviceable?: boolean;
  }>>([]);
  const [newAddress, setNewAddress] = useState({
    label: '',
    area: '',
    block: '',
    street: '',
    house: '',
    country: COUNTRY_NAME,
    landmarks: '',
    latitude: null as number | null,
    longitude: null as number | null,
    delivery_zone_id: null as string | null,
    delivery_fee: null as number | null,
    is_serviceable: true
  });
  const [showMap, setShowMap] = useState(false);
  const [giftDetails, setGiftDetails] = useState({
    recipientName: '',
    recipientPhone: '',
    message: ''
  });
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [showAddAddressDialog, setShowAddAddressDialog] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  useEffect(() => {
    if (user) {
      fetchUserAddresses();
      checkUserAddress();
    }
  }, [user]);

  const checkUserAddress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('id')
        .eq('customer_id', user.id)
        .eq('country_id', COUNTRY_ID)
        .limit(1);

      if (error) throw error;

      // If no address, redirect to address setup with return URL
      if (!data || data.length === 0) {
        sessionStorage.setItem('checkout_return_url', location.pathname);
        navigate('/address-setup');
      }
    } catch (error) {
      console.error('Error checking address:', error);
    }
  };
  const fetchUserAddresses = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('addresses').select('*').eq('customer_id', user.id).eq('country_id', COUNTRY_ID).order('is_primary', {
        ascending: false
      });
      if (error) throw error;
      setSavedAddresses(data || []);

      // Auto-select primary address
      const primaryAddress = data?.find(addr => addr.is_primary);
      if (primaryAddress) {
        setSelectedAddress(primaryAddress.id);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };
  const handleAddNewAddress = async () => {
    if (!user) return;
    
    if (newAddress.is_serviceable === false) {
      toast.error('This location is outside our delivery area. Please choose a different address.');
      return;
    }

    setIsAddingAddress(true);
    try {
      const fullStreetAddress = `Block ${newAddress.block}, Street ${newAddress.street}, House ${newAddress.house}`;

      const {
        data,
        error
      } = await supabase.from('addresses').insert({
        customer_id: user.id,
        label: newAddress.label,
        street_address: fullStreetAddress,
        city: newAddress.area,
        country: COUNTRY_NAME,
        country_id: COUNTRY_ID,
        landmarks: newAddress.landmarks,
        latitude: newAddress.latitude,
        longitude: newAddress.longitude,
        is_primary: savedAddresses.length === 0,
        delivery_zone_id: newAddress.delivery_zone_id,
        delivery_fee: newAddress.delivery_fee,
        is_serviceable: newAddress.is_serviceable
      }).select().single();
      if (error) throw error;
      setSavedAddresses(prev => [...prev, data]);
      setSelectedAddress(data.id);
      setShowAddAddressDialog(false);
      setNewAddress({
        label: '',
        area: '',
        block: '',
        street: '',
        house: '',
        country: COUNTRY_NAME,
        landmarks: '',
        latitude: null,
        longitude: null,
        delivery_zone_id: null,
        delivery_fee: null,
        is_serviceable: true
      });
      setShowMap(false);
      toast.success('Address added successfully');
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to add address');
    } finally {
      setIsAddingAddress(false);
    }
  };
  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const selectedAddressData = savedAddresses.find(addr => addr.id === selectedAddress);
  const deliveryFee = fulfillmentType === 'delivery' ? (selectedAddressData?.delivery_fee || newAddress.delivery_fee || 0) : 0;
  const total = subtotal + deliveryFee;
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const handleCompleteOrder = () => {
    if (state.cart.length === 0) {
      toast.error("Cart is empty - Please add items to your cart before checkout.");
      return;
    }
    if (isGift && paymentMethod === 'cash') {
      toast.error("Payment required for gifts - Gift orders require online card payment.");
      return;
    }

    // Validate delivery address
    if (fulfillmentType === 'delivery') {
      const hasSelectedSavedAddress = selectedAddress && savedAddresses.some(addr => addr.id === selectedAddress);
      const hasNewAddressData = newAddress.street_address && newAddress.city;
      
      if (!hasSelectedSavedAddress && !hasNewAddressData) {
        toast.error("Please select a delivery address or add a new one");
        return;
      }
    }

    // Show upsell modal first
    setShowUpsellModal(true);
  };
  const handleUpsellContinue = () => {
    setShowUpsellModal(false);
    setShowPaymentModal(true);
  };
  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);

    // Generate order number
    const orderNumber = `PC${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // Create order
    const order = {
      id: Math.random().toString(36).substr(2, 9),
      orderNumber,
      items: state.cart,
      customerInfo: {
        phone: customerProfile?.whatsapp_number || user?.phone || "+974 5555 0123",
        name: customerProfile ? `${customerProfile.first_name || ''} ${customerProfile.last_name || ''}`.trim() || 'Customer' : user?.email?.split('@')[0] || 'Customer',
        email: user?.email || "customer@example.com"
      },
      total,
      status: 'confirmed' as const,
      isGift,
      paymentMethod,
      fulfillmentType,
      scheduledTime: `${deliveryDate} ${deliveryTime}`,
      deliveryAddress: fulfillmentType === 'delivery' ? selectedAddress ? (() => {
        const addr = savedAddresses.find(a => a.id === selectedAddress);
        return addr ? `${addr.street_address}, ${addr.city}, ${addr.country}` : '';
      })() : `${newAddress.street_address}, ${newAddress.city}, ${newAddress.country}` : undefined,
      placedAt: new Date()
    };

    // Clear cart from database FIRST
    if (user?.id) {
      try {
        console.log('🗑️ Clearing cart from database...');
        await clearCartInDB(user.id);
        console.log('✅ Cart cleared from database');
      } catch (error) {
        console.error('❌ Failed to clear cart from database:', error);
        toast.error('Warning: Cart may not have been cleared properly');
      }
    }

    // Then clear local state and add order
    dispatch({
      type: 'ADD_ORDER',
      payload: order
    });
    dispatch({
      type: 'CLEAR_CART'
    });

    // Navigate to success page with order data
    navigate('/payment-success', {
      state: {
        orderData: order
      }
    });
  };
  if (state.cart.length === 0) {
    return <main className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-8">Add some delicious cakes to get started!</p>
            <Button onClick={() => navigate('/')} variant="hero">
              Browse Menu
            </Button>
          </div>
        </div>
      </main>;
  }
  if (!user) {
    return <main className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Please sign in</h1>
            <p className="text-muted-foreground mb-8">You need to be signed in to checkout</p>
            <Button onClick={() => navigate('/login')} variant="hero">
              Sign In
            </Button>
          </div>
        </div>
      </main>;
  }
  return <main className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Checkout Form */}
          <div className="space-y-6">
            {/* Fulfillment Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Delivery Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={fulfillmentType} onValueChange={(value: 'delivery' | 'pickup') => setFulfillmentType(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <Label htmlFor="delivery" className="flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Delivery (Free)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      Store Pickup (Free)
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            {fulfillmentType === 'delivery' && <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Delivery Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {savedAddresses.length > 0 ? <div>
                      <Label>Saved Addresses</Label>
                      <Select value={selectedAddress} onValueChange={setSelectedAddress}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a saved address" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedAddresses.map(addr => <SelectItem key={addr.id} value={addr.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{addr.label}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {addr.street_address}, {addr.city}
                                </span>
                              </div>
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                      
                      <div className="mt-4">
                        <Button type="button" variant="outline" onClick={() => setShowAddAddressDialog(true)} className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Add New Address
                        </Button>
                      </div>
                    </div> : <div className="text-center py-6">
                      <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No saved addresses</h3>
                      <p className="text-muted-foreground mb-4">Add your first delivery address</p>
                      <Button onClick={() => setShowAddAddressDialog(true)} variant="hero">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Address
                      </Button>
                    </div>}
                </CardContent>
              </Card>}

            {/* Delivery Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'} Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deliveryDate">Date</Label>
                    <Input id="deliveryDate" type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <Label htmlFor="deliveryTime">Time</Label>
                    <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="11:00">11:00 AM</SelectItem>
                        <SelectItem value="14:00">2:00 PM</SelectItem>
                        <SelectItem value="16:00">4:00 PM</SelectItem>
                        <SelectItem value="18:00">6:00 PM</SelectItem>
                        <SelectItem value="20:00">8:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gift Option */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Gift Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="isGift" checked={isGift} onCheckedChange={checked => setIsGift(!!checked)} />
                  <Label htmlFor="isGift">This is a gift (requires online payment)</Label>
                </div>
                
                {isGift && <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="recipientName">Recipient Name</Label>
                        <Input id="recipientName" placeholder="Gift recipient name" value={giftDetails.recipientName} onChange={e => setGiftDetails({
                      ...giftDetails,
                      recipientName: e.target.value
                    })} />
                      </div>
                      <div>
                        <Label htmlFor="recipientPhone">Recipient Phone</Label>
                        <Input id="recipientPhone" placeholder="+974 5555 0000" value={giftDetails.recipientPhone} onChange={e => setGiftDetails({
                      ...giftDetails,
                      recipientPhone: e.target.value
                    })} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="giftMessage">Gift Message</Label>
                      <Textarea id="giftMessage" placeholder="Add a personal message for the recipient" value={giftDetails.message} onChange={e => setGiftDetails({
                    ...giftDetails,
                    message: e.target.value
                  })} />
                    </div>
                  </div>}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(value: 'card' | 'cash') => setPaymentMethod(value)} disabled={isGift}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Credit/Debit Card
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" disabled={isGift} />
                    <Label htmlFor="cash" className={`flex items-center gap-2 ${isGift ? 'opacity-50' : ''}`}>
                      <Banknote className="w-4 h-4" />
                      Cash on {fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}
                      {isGift && ' (Not available for gifts)'}
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Special Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea placeholder="Any special instructions for your order..." value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                {state.cart.map(item => <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.cake.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.flavor} • {item.variant} • Qty: {item.quantity}
                      </p>
                      {item.specialInstructions && <p className="text-xs text-muted-foreground">
                          Note: {item.specialInstructions}
                        </p>}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.price * item.quantity} {DEFAULT_CURRENCY}</p>
                    </div>
                  </div>)}

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{subtotal} {DEFAULT_CURRENCY}</span>
                  </div>
                  
                  {fulfillmentType === 'delivery' && <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>{deliveryFee} {DEFAULT_CURRENCY}</span>
                    </div>}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{total} {DEFAULT_CURRENCY}</span>
                  </div>
                </div>

                <Button className="w-full" variant="hero" size="lg" onClick={handleCompleteOrder}>
                  Complete Order - {formatAmount(total)} {DEFAULT_CURRENCY}
                </Button>

                
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Add Address Dialog */}
        <Dialog open={showAddAddressDialog} onOpenChange={setShowAddAddressDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Address</DialogTitle>
              <DialogDescription>
                Add a new delivery address for this order
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label htmlFor="label">Address Label</Label>
                <Input id="label" placeholder="Home, Office, etc." value={newAddress.label} onChange={e => setNewAddress({
                ...newAddress,
                label: e.target.value
              })} />
              </div>

              {/* Map Picker */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMap(!showMap)}
                  className="w-full"
                >
                  <MapIcon className="mr-2 h-4 w-4" />
                  {showMap ? 'Hide Map' : 'Choose Location on Map 📍'}
                </Button>
                
                {showMap && (
                  <DeliveryZoneMap
                    showZoneBoundaries={true}
                    onLocationSelect={(locationData) => {
                      setNewAddress(prev => ({
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
                )}

                {showMap && newAddress.latitude && newAddress.is_serviceable === false && (
                  <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ This location is outside our delivery area
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="building_flat">Block and Building Details *</Label>
                <Input 
                  id="building_flat" 
                  placeholder="e.g., Block 3, Building 45"
                  value={newAddress.building_flat}
                  onChange={e => setNewAddress({
                    ...newAddress,
                    building_flat: e.target.value
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="street_address">
                  Street Address *
                  {newAddress.latitude && newAddress.longitude && (
                    <span className="ml-2 text-xs bg-tiffany/10 text-tiffany px-2 py-0.5 rounded">
                      📍 From Map
                    </span>
                  )}
                </Label>
                <Textarea id="street_address" placeholder="Street, Area" value={newAddress.street_address} onChange={e => setNewAddress({
                ...newAddress,
                street_address: e.target.value
              })} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Area</Label>
                  <Input id="city" value={newAddress.city} onChange={e => setNewAddress({
                  ...newAddress,
                  city: e.target.value
                })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landmarks">Near Landmarks (Optional)</Label>
                  <Input id="landmarks" value={newAddress.landmarks || ''} onChange={e => setNewAddress({
                  ...newAddress,
                  landmarks: e.target.value
                })} placeholder="e.g., Near City Centre Mall" />
                </div>
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
                <Button type="button" variant="outline" onClick={() => setShowAddAddressDialog(false)} disabled={isAddingAddress}>
                  Cancel
                </Button>
                <Button onClick={handleAddNewAddress} disabled={isAddingAddress || !newAddress.label || !newAddress.building_flat || !newAddress.street_address || !newAddress.city}>
                  {isAddingAddress ? 'Adding...' : 'Add Address'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>

        {/* Upsell Modal */}
        <UpsellModal isOpen={showUpsellModal} onClose={() => setShowUpsellModal(false)} onContinue={handleUpsellContinue} cartItems={state.cart} />

        {/* Payment Modal */}
        <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onSuccess={handlePaymentSuccess} cartItems={state.cart} totalAmount={total} isGift={isGift} paymentMethod={paymentMethod} />
      </main>;
}