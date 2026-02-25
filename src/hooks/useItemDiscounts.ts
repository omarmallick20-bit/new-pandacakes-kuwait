import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { COUNTRY_ID } from '@/config/country';

export interface ItemDiscountData {
  discount_percentage: number;
  show_badge: boolean;
  badge_text: string | null;
}

export type ItemDiscountsMap = Map<string, ItemDiscountData>;

/**
 * Hook to fetch active item discounts from the item_discounts table.
 * Returns a Map keyed by product ID with discount info.
 */
export function useItemDiscounts() {
  const [discountsMap, setDiscountsMap] = useState<ItemDiscountsMap>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('item_discounts')
          .select('*')
          .eq('is_active', true)
          .eq('country_id', COUNTRY_ID)
          .lte('valid_from', today)
          .gte('valid_until', today);

        if (error) {
          console.error('Error fetching item discounts:', error);
          return;
        }

        const newMap = new Map<string, ItemDiscountData>();
        
        data?.forEach(discount => {
          if (discount.applicable_products && Array.isArray(discount.applicable_products)) {
            discount.applicable_products.forEach((productId: string) => {
              // If product already has a discount, keep the higher one
              const existing = newMap.get(productId);
              if (!existing || existing.discount_percentage < discount.discount_percentage) {
                newMap.set(productId, {
                  discount_percentage: discount.discount_percentage,
                  show_badge: discount.show_badge ?? true,
                  badge_text: discount.badge_text
                });
              }
            });
          }
        });

        setDiscountsMap(newMap);
        console.log(`✅ [useItemDiscounts] Loaded ${newMap.size} product discounts from ${data?.length || 0} active campaigns`);
      } catch (err) {
        console.error('Error in useItemDiscounts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscounts();
  }, []);

  return { discountsMap, isLoading };
}

/**
 * Helper function to apply discounts from item_discounts table to a menu item.
 * This enriches the item with discount data before passing to calculateDiscount().
 */
export function applyItemDiscount<T extends { id: string; price: number }>(
  item: T,
  discountsMap: ItemDiscountsMap
): T & { discount_percentage?: number; show_discount_badge?: boolean } {
  const discountData = discountsMap.get(item.id);
  
  if (discountData) {
    return {
      ...item,
      discount_percentage: discountData.discount_percentage,
      show_discount_badge: discountData.show_badge
    };
  }
  
  return item;
}
