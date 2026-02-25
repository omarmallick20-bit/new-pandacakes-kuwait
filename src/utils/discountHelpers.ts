/**
 * Discount calculation utilities for product pricing
 */

export interface DiscountInfo {
  hasDiscount: boolean;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number | null;
  discountAmount: number | null;
  showBadge: boolean;
}

export interface DiscountableItem {
  price: number;
  discount_percentage?: number | null;
  discount_amount?: number | null;
  discount_valid_from?: string | null;
  discount_valid_until?: string | null;
  show_discount_badge?: boolean;
}

/**
 * Calculate discount information for a product
 */
export function calculateDiscount(item: DiscountableItem): DiscountInfo {
  const {
    price,
    discount_percentage,
    discount_amount,
    discount_valid_from,
    discount_valid_until,
    show_discount_badge = false
  } = item;

  const now = new Date();
  
  // Check if discount is within valid date range
  const isWithinDateRange = 
    (!discount_valid_from || new Date(discount_valid_from) <= now) &&
    (!discount_valid_until || new Date(discount_valid_until) >= now);

  // No discount if outside date range or no discount values set
  if (!isWithinDateRange || (!discount_percentage && !discount_amount)) {
    return {
      hasDiscount: false,
      originalPrice: price,
      discountedPrice: price,
      discountPercentage: null,
      discountAmount: null,
      showBadge: false
    };
  }

  let discountedPrice = price;
  
  // Apply percentage discount first, then fixed amount
  if (discount_percentage && discount_percentage > 0) {
    discountedPrice = price * (1 - discount_percentage / 100);
  } else if (discount_amount && discount_amount > 0) {
    discountedPrice = Math.max(0, price - discount_amount);
  }

  const hasDiscount = discountedPrice < price;
  
  return {
    hasDiscount,
    originalPrice: price,
    discountedPrice: Math.round(discountedPrice * 10) / 10, // Round to 1 decimal
    discountPercentage: hasDiscount ? discount_percentage || null : null,
    discountAmount: hasDiscount ? discount_amount || null : null,
    showBadge: hasDiscount && show_discount_badge
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = 'QAR'): string {
  return `${currency} ${price.toFixed(price % 1 === 0 ? 0 : 1)}`;
}
