import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { COUNTRY_ID } from '@/config/country';

export type CategoryDiscountsMap = Map<string, number>;

/**
 * Hook that resolves which categories have active discounts
 * by cross-referencing item_discounts → menu_items.category_id.
 * Returns a Map<categoryId, maxDiscountPercentage>.
 */
export function useCategoryDiscounts() {
  const [categoryDiscounts, setCategoryDiscounts] = useState<CategoryDiscountsMap>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Get active discounts for this country
        const { data: discounts, error: dErr } = await supabase
          .from('item_discounts')
          .select('discount_percentage, applicable_products')
          .eq('is_active', true)
          .eq('country_id', COUNTRY_ID)
          .lte('valid_from', today)
          .gte('valid_until', today);

        if (dErr || !discounts?.length) {
          setCategoryDiscounts(new Map());
          return;
        }

        // 2. Collect all product IDs with their discount %
        const productDiscountMap = new Map<string, number>();
        discounts.forEach(d => {
          if (Array.isArray(d.applicable_products)) {
            d.applicable_products.forEach((pid: string) => {
              const existing = productDiscountMap.get(pid) || 0;
              if (d.discount_percentage > existing) {
                productDiscountMap.set(pid, d.discount_percentage);
              }
            });
          }
        });

        const productIds = Array.from(productDiscountMap.keys());
        if (!productIds.length) {
          setCategoryDiscounts(new Map());
          return;
        }

        // 3. Get category_id for those products
        const { data: items, error: iErr } = await supabase
          .from('menu_items')
          .select('id, category_id')
          .in('id', productIds);

        if (iErr || !items) {
          setCategoryDiscounts(new Map());
          return;
        }

        // 4. Build category → max discount map
        const result = new Map<string, number>();
        items.forEach(item => {
          if (!item.category_id) return;
          const pct = productDiscountMap.get(item.id) || 0;
          const existing = result.get(item.category_id) || 0;
          if (pct > existing) {
            result.set(item.category_id, pct);
          }
        });

        setCategoryDiscounts(result);
      } catch (err) {
        console.error('Error in useCategoryDiscounts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, []);

  return { categoryDiscounts, isLoading };
}
