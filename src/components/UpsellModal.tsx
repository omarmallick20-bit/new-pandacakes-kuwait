import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, ShoppingCart, ArrowRight, Loader2, Settings2 } from 'lucide-react';
import { CartItem } from '@/types';
import { toast } from 'sonner';
import { retryWithBackoff } from '@/utils/retryWithBackoff';
import { useTranslation } from '@/hooks/useTranslation';
import { COUNTRY_ID } from '@/config/country';

const hasVariants = (product: any): boolean => {
  return (
    (Array.isArray(product.flavors) && product.flavors.length > 0) ||
    (Array.isArray(product.sizes) && product.sizes.length > 0) ||
    (Array.isArray(product.custom_sections) && product.custom_sections.length > 0)
  );
};

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  cartItems: CartItem[];
}

export function UpsellModal({ isOpen, onClose, onContinue, cartItems }: UpsellModalProps) {
  const navigate = useNavigate();
  const { dispatch } = useAppContext();
  const { t, language, toArabicNumerals, currencyLabel } = useTranslation();
  const [addedUpsells, setAddedUpsells] = useState<Set<string>>(new Set());
  const [candlesProducts, setCandlesProducts] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchUpsellProducts();
    }
  }, [isOpen, cartItems]);

  const fetchUpsellProducts = async () => {
    setIsLoading(true);
    try {
      // Get cart product IDs to exclude
      const cartProductIds = cartItems.map(item => item.cake.id);
      
      // Find "Candles & Toppers" category
      const categories = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .ilike('name', '%candles%')
            .limit(1);
          if (error) throw error;
          return data;
        },
        { operationName: 'fetchCandlesCategory' }
      );
      
      const candlesId = categories?.[0]?.id;
      
      // Fetch 3 Candles & Toppers products
      if (candlesId) {
        const candlesData = await retryWithBackoff(
          async () => {
            const query = supabase
              .from('menu_items')
              .select('*')
              .eq('category_id', candlesId)
              .eq('is_active', true)
              .eq('country_id', COUNTRY_ID)
              .limit(3);
            
            if (cartProductIds.length > 0) {
              query.not('id', 'in', `(${cartProductIds.join(',')})`);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            return data;
          },
          { operationName: 'fetchCandlesProducts' }
        );
        
        setCandlesProducts(candlesData || []);
      }
      
    } catch (error) {
      console.error('Error fetching upsell products:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUpsell = (product: any) => {
    // Check if product requires variant selection
    if (hasVariants(product)) {
      onClose();
      navigate(`/cake/${product.id}`);
      toast.info(language === 'ar' ? `يرجى اختيار خياراتك لـ ${(product as any).name_ar || product.name}` : `Please select your options for ${product.name}`);
      return;
    }

    // No variants - add directly to cart
    const upsellItem: CartItem = {
      id: `upsell-${product.id}-${Date.now()}`,
      cake: {
        id: product.id,
        name: product.name,
        name_ar: (product as any).name_ar || undefined,
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
    toast.success(language === 'ar' ? `تمت إضافة ${(product as any).name_ar || product.name} للسلة!` : `${product.name} added to cart!`);
  };

  const totalAddedUpsells = addedUpsells.size;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-center">
            {t('upsell_title')}
          </DialogTitle>
          <p className="text-center text-muted-foreground text-xs sm:text-sm">
            {t('upsell_subtitle')}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary" />
            <span className="ml-2 sm:ml-3 text-muted-foreground text-sm sm:text-base">{t('upsell_loading')}</span>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Candles & Toppers Section - ALWAYS 3 items */}
            {candlesProducts.length > 0 && (
              <div>
                <h3 className="text-sm sm:text-lg font-semibold mb-2 sm:mb-3 flex flex-wrap items-center gap-2">
                  🕯️ <span className="break-words">{t('upsell_finishing_touches')}</span>
                  <Badge variant="secondary" className="text-xs">{t('upsell_popular')}</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  {candlesProducts.map((product) => (
                    <Card key={product.id} className="group hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <img
                          src={product.image_url || '/placeholder.svg'}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-28 sm:h-32 object-cover rounded-md mb-2 sm:mb-3"
                        />
                        <h4 className="font-medium text-xs sm:text-sm mb-1 line-clamp-2 break-words">{(language === 'ar' && (product as any).name_ar) || product.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {(language === 'ar' && (product as any).description_ar) || product.description || t('upsell_perfect_addition')}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-primary text-xs sm:text-sm whitespace-nowrap">{currencyLabel} {toArabicNumerals(String(product.price))}</span>
                          <Button
                            size="sm"
                            variant={addedUpsells.has(product.id) ? "secondary" : "hero"}
                            onClick={() => handleAddUpsell(product)}
                            disabled={addedUpsells.has(product.id)}
                            className="text-xs h-7 px-2"
                          >
                            {addedUpsells.has(product.id) ? (
                              <>{t('upsell_added')} <ShoppingCart className="w-3 h-3 ml-1" /></>
                            ) : hasVariants(product) ? (
                              <>{t('upsell_options')} <Settings2 className="w-3 h-3 ml-1" /></>
                            ) : (
                              <>{t('upsell_add')} <Plus className="w-3 h-3 ml-1" /></>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Footer Actions */}
        <div className="flex pt-4 border-t">
          <Button
            onClick={onContinue}
            className="w-full text-sm bg-black hover:bg-black/90 text-white"
          >
            <span className="truncate">{t('upsell_continue_payment')}</span>
            {totalAddedUpsells > 0 && (
              <Badge variant="secondary" className="ml-2 shrink-0 text-xs">
                +{totalAddedUpsells}
              </Badge>
            )}
            <ArrowRight className="w-4 h-4 ml-1 sm:ml-2 shrink-0" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}