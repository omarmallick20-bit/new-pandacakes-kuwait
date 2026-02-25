export interface Category {
  id: string;
  name: string;
  image: string;
}

export interface Cake {
  id: string;
  name: string;
  name_ar?: string;
  categoryId: string;
  image: string;
  description: string;
  inches: string[];
  layers: number;
  servingSize: string;
  preparationTime: string;
  basePrice: number;
}

export interface CartItem {
  id: string;
  cake: Cake;
  flavor: string;
  variant: string;
  specialInstructions?: string;
  quantity: number;
  price: number;  // Final discounted price per unit
  originalPrice?: number;  // Original price before discount
  itemDiscount?: {
    percentage: number;
    amount: number;
    campaignName?: string;
  };
  customizations?: {
    custom_selections: Record<string, {
      selected: string | string[];
      price: number;
    }>;
    total_variant_price: number;
    specialInstructions?: string;
  };
}

export interface Order {
  id: string;
  orderNumber?: string;
  items: CartItem[];
  customerInfo: {
    phone: string;
    name: string;
    email?: string;
  };
  total: number;
  status: 'confirmed' | 'preparing' | 'ready' | 'delivered';
  isGift: boolean;
  paymentMethod: 'card' | 'cash';
  fulfillmentType: 'pickup' | 'delivery';
  scheduledTime?: string;
  deliveryAddress?: string;
  voucherCode?: string;
  discount?: number;
  placedAt: Date;
}

export interface WishlistItem {
  id: string;
  cake: Cake;
  addedAt: Date;
}