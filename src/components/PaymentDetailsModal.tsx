import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Banknote, CheckCircle2, XCircle, Clock, MapPin, Truck } from 'lucide-react';
import { formatQAR } from '@/utils/currencyHelpers';
import { formatOrderItemCustomizations, getSpecialInstructions } from '@/utils/orderHelpers';
import { format } from 'date-fns';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    order_number: string;
    payment_method: string;
    payment_status?: string;
    payment_amount?: number;
    payment_currency?: string;
    total_amount: number;
    original_amount?: number;
    voucher_discount_amount?: number;
    bakepoints_discount_amount?: number;
    delivery_fee?: number;
    created_at: string;
    order_placed_at?: string;
    status: string;
    country_id?: string;
    estimated_delivery_time?: string;
    fulfillment_type?: string;
    addresses?: {
      street_address: string;
      city: string;
      landmarks?: string;
      label?: string;
    } | null;
    order_items?: Array<{
      id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      original_unit_price?: number;
      item_discount_percentage?: number;
      item_discount_amount?: number;
      customizations?: any;
    }>;
  };
}

export function PaymentDetailsModal({ isOpen, onClose, order }: PaymentDetailsModalProps) {
  const getPaymentStatusBadge = () => {
    const status = order.payment_status?.toLowerCase() || 'pending';
    
    if (status === 'captured' || status === 'paid') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />Paid</Badge>;
    }
    if (status === 'failed') {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    }
    if (status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const isCardPayment = order.payment_method?.toLowerCase() === 'card';
  const subtotal = order.original_amount || order.total_amount;
  const voucherDiscount = order.voucher_discount_amount || 0;
  const bakePointsDiscount = order.bakepoints_discount_amount || 0;
  const deliveryFee = order.delivery_fee || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isCardPayment ? (
                    <CreditCard className="w-5 h-5 text-primary" />
                  ) : (
                    <Banknote className="w-5 h-5 text-primary" />
                  )}
                  <span className="font-medium">
                    {isCardPayment ? 'Card Payment' : 'Cash on Delivery'}
                  </span>
                </div>
                {getPaymentStatusBadge()}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Number</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Date</span>
                  <span>{format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items Section */}
          {order.order_items && order.order_items.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Order Items</h3>
                <div className="space-y-3">
                  {order.order_items.map((item, index) => {
                    const customizationDetails = formatOrderItemCustomizations(item.customizations);
                    const specialInstructions = getSpecialInstructions(item.customizations);
                      return (
                        <div key={item.id}>
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.product_name}</p>
                              {customizationDetails.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {customizationDetails.join(' • ')}
                                </p>
                              )}
                              {specialInstructions && (
                                <p className="text-xs text-muted-foreground italic mt-0.5">
                                  Note: {specialInstructions}
                                </p>
                              )}
                            </div>
                            {/* Price display with discount support */}
                            <div className="text-right flex-shrink-0">
                              {item.original_unit_price && item.original_unit_price > item.unit_price ? (
                                <div className="space-y-0.5">
                                  <p className="text-xs text-muted-foreground line-through">
                                    {item.quantity} × {formatQAR(item.original_unit_price)}
                                  </p>
                                  <p className="text-sm font-medium text-destructive">
                                    {item.quantity} × {formatQAR(item.unit_price)}
                                  </p>
                                  {item.item_discount_percentage && (
                                    <p className="text-xs text-green-600">
                                      {item.item_discount_percentage}% off
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    = {formatQAR(item.total_price)}
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm font-medium">
                                    {item.quantity} × {formatQAR(item.unit_price)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    = {formatQAR(item.total_price)}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                          {index < order.order_items!.length - 1 && (
                            <Separator className="mt-3" />
                          )}
                        </div>
                      );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Amount Breakdown */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Amount Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatQAR(subtotal)}</span>
                </div>

                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>{formatQAR(deliveryFee)}</span>
                  </div>
                )}

                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Voucher Discount</span>
                    <span>-{formatQAR(voucherDiscount)}</span>
                  </div>
                )}

                {bakePointsDiscount > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>BakePoints Discount</span>
                    <span>-{formatQAR(bakePointsDiscount)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatQAR(order.payment_amount || order.total_amount)}</span>
                </div>

                <div className="text-xs text-muted-foreground">
                  Currency: {order.payment_currency || 'QAR'} (Qatari Riyal)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Delivery Details</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fulfillment</span>
                  <span>{order.fulfillment_type === 'delivery' ? 'Delivery' : 'Store Pickup'}</span>
                </div>
                
                {order.estimated_delivery_time && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date & Time</span>
                    <span>{format(new Date(order.estimated_delivery_time), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}
                
                {order.fulfillment_type === 'delivery' && order.addresses && (
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Address
                    </span>
                    <span className="text-right max-w-[200px]">
                      {order.addresses.label && <span className="font-medium">{order.addresses.label}: </span>}
                      {order.addresses.street_address}, {order.addresses.city}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Text */}
          {isCardPayment && (
            <p className="text-xs text-muted-foreground text-center">
              Your payment was processed securely through Tap Payments with bank-level encryption.
            </p>
          )}

          {/* Action Button */}
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
