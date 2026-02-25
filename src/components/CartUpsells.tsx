import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, ShoppingCart, Sparkles, Settings2 } from 'lucide-react';
import { CartItem } from '@/types';
import { toast } from 'sonner';
import { retryWithBackoff } from '@/utils/retryWithBackoff';
import { UpsellQuickAddModal } from '@/components/UpsellQuickAddModal';
import { useTranslation } from '@/hooks/useTranslation';
import { COUNTRY_ID } from '@/config/country';

const hasVariants = (product: any): boolean => {
  return (
    (Array.isArray(product.flavors) && product.flavors.length > 0) ||
    (Array.isArray(product.sizes) && product.sizes.length > 0) ||
    (Array.isArray(product.custom_sections) && product.custom_sections.length > 0)
  );
};

interface CartUpsellsProps {
  cartItems: CartItem[];
}

export function CartUpsells({ cartItems }: CartUpsellsProps) {
  const { dispatch } = useAppContext();
  const { language, currencyLabel } = useTranslation();
  const [addedUpsells, setAddedUpsells] = useState<Set<string>>(new Set());
  const [upsellProducts, setUpsellProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [shouldFetch, setShouldFetch] = useState(false);
  
  // Delay upsell fetch to prioritize main cart rendering
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldFetch(true);
    }, 2000); // 2 second delay
    
    return () => clearTimeout(timer);
  }, []);

  // Only fetch when shouldFetch is true
  useEffect(() => {
    if (shouldFetch && cartItems.length > 0) {
      fetchUpsellProducts();
    }
  }, [shouldFetch, cartItems.length]);
  const fetchUpsellProducts = async () => {
    setIsLoading(true);
    try {
      // 1. Analyze cart to find dominant category
      const categoryCount = cartItems.reduce((acc, item) => {
        const catId = item.cake.categoryId;
        acc[catId] = (acc[catId] || 0) + item.quantity;
        return acc;
      }, {} as Record<string, number>);
      const dominantCategoryId = Object.entries(categoryCount).sort(([, a], [, b]) => b - a)[0]?.[0];

      // 2. Find "Candles & Toppers" category ID
      const categories = await retryWithBackoff(async () => {
        const {
          data,
          error
        } = await supabase.from('categories').select('id, name').ilike('name', '%candles%').limit(1);
        if (error) throw error;
        return data;
      }, {
        operationName: 'fetchCandlesCategory'
      });
      const candlesId = categories?.[0]?.id || null;

      // 3. Get cart product IDs to exclude
      const cartProductIds = cartItems.map(item => item.cake.id);

      // 4. Fetch 3 products from dominant category
      let dominantCategoryProducts: any[] = [];
      if (dominantCategoryId) {
        dominantCategoryProducts = await retryWithBackoff(async () => {
          const query = supabase.from('menu_items').select('*').eq('category_id', dominantCategoryId).eq('is_active', true).eq('country_id', COUNTRY_ID).limit(3);
          if (cartProductIds.length > 0) {
            query.not('id', 'in', `(${cartProductIds.join(',')})`);
          }
          const {
            data,
            error
          } = await query;
          if (error) throw error;
          return data || [];
        }, {
          operationName: 'fetchDominantCategoryProducts'
        });
      }

      // 5. Fetch 3 products from Candles & Toppers
      let candlesProducts: any[] = [];
      if (candlesId) {
        candlesProducts = await retryWithBackoff(async () => {
          const query = supabase.from('menu_items').select('*').eq('category_id', candlesId).eq('is_active', true).eq('country_id', COUNTRY_ID).limit(3);
          if (cartProductIds.length > 0) {
            query.not('id', 'in', `(${cartProductIds.join(',')})`);
          }
          const {
            data,
            error
          } = await query;
          if (error) throw error;
          return data || [];
        }, {
          operationName: 'fetchCandlesProducts'
        });
      }

      // 6. Combine both sets
      setUpsellProducts([...dominantCategoryProducts, ...candlesProducts]);
    } catch (error) {
      console.error('Error fetching upsell products:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleAddUpsell = (product: any) => {
    // Check if product requires variant selection - open modal
    if (hasVariants(product)) {
      setSelectedProduct(product);
      return;
    }

    // No variants - add directly to cart
    const upsellItem: CartItem = {
      id: `upsell-${product.id}-${Date.now()}`,
      cake: {
        id: product.id,
        name: product.name,
        categoryId: product.category_id,
        image: product.image_url || '/placeholder.svg',
        description: product.description || '',
        inches: ['Standard'],
        layers: 1,
        servingSize: '1 person',
        preparationTime: product.preparation_time?.toString() || '24 hours',
        basePrice: product.price
      },
      flavor: 'Default',
      variant: 'Standard',
      quantity: 1,
      price: product.price
    };
    dispatch({ type: 'ADD_TO_CART', payload: upsellItem });
    setAddedUpsells(prev => new Set([...prev, product.id]));
    toast.success(`Added ${product.name} to cart!`);
  };

  const handleModalClose = () => {
    setSelectedProduct(null);
  };

  const handleModalAddSuccess = (product: any) => {
    setAddedUpsells(prev => new Set([...prev, product.id]));
    setSelectedProduct(null);
  };
  if (upsellProducts.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Complete Your Order
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {upsellProducts.slice(0, 6).map((product) => {
            const isAdded = addedUpsells.has(product.id);
            const productHasVariants = hasVariants(product);
            return (
              <div
                key={product.id}
                className="relative bg-card rounded-lg border overflow-hidden"
              >
                <img
                  src={product.image_url || '/placeholder.svg'}
                  alt={product.name}
                  className="w-full h-20 sm:h-24 object-cover"
                />
                <div className="p-2">
                  <p className="text-xs font-medium line-clamp-1">{product.name}</p>
                  <p className="text-xs text-primary font-semibold">
                    {product.price} {currencyLabel}
                  </p>
                  <Button
                    size="sm"
                    variant={isAdded ? "secondary" : "default"}
                    className="w-full mt-1 h-7 text-xs"
                    onClick={() => handleAddUpsell(product)}
                    disabled={isAdded}
                  >
                    {isAdded ? (
                      <>
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Added
                      </>
                    ) : productHasVariants ? (
                      <>
                        <Settings2 className="w-3 h-3 mr-1" />
                        Options
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Add Modal for Variant Products */}
        <UpsellQuickAddModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={handleModalClose}
          onAddSuccess={handleModalAddSuccess}
        />
      </CardContent>
    </Card>
  );
}