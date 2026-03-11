import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { retryWithBackoff } from '@/utils/retryWithBackoff';
import { calculateDiscount, DiscountableItem } from '@/utils/discountHelpers';
import { DiscountBadge } from '@/components/DiscountBadge';
import { useTranslation } from '@/hooks/useTranslation';
import { COUNTRY_ID } from '@/config/country';

interface MenuItem extends DiscountableItem {
  id: string;
  name: string;
  description: string;
  category_id: string;
  category: string;
  image_url: string;
  country_id: string;
  is_active: boolean;
  preparation_time: number;
}

interface Category {
  id: string;
  name: string;
  name_ar?: string;
  image_url: string;
  is_active: boolean;
}

interface SearchResults {
  cakes: MenuItem[];
  categories: Category[];
}

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const { t, translateCategory, language, toArabicNumerals, currencyLabel } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>({
    cakes: [],
    categories: []
  });
  const [isSearching, setIsSearching] = useState(false);

  const search = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ cakes: [], categories: [] });
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      
      const [cakes, categories] = await Promise.all([
        retryWithBackoff(
          async () => {
            const { data, error } = await supabase
              .from('menu_items')
              .select('*')
              .eq('country_id', COUNTRY_ID)
              .eq('is_active', true)
              .or(`name.ilike.%${query}%,name_ar.ilike.%${query}%`)
              .order('name');
            
            if (error) throw error;
            return data;
          },
          { operationName: 'searchMenuItems' }
        ),
        retryWithBackoff(
          async () => {
            const { data, error } = await supabase
              .from('categories')
              .select('*')
              .eq('is_active', true)
              .ilike('name', `%${query}%`)
              .order('name');
            
            if (error) throw error;
            return data;
          },
          { operationName: 'searchCategories' }
        )
      ]);

      const queryLower = query.toLowerCase();
      const sortedCakes = (cakes || []).sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStartsWith = aName.startsWith(queryLower);
        const bStartsWith = bName.startsWith(queryLower);
        const aExact = aName === queryLower;
        const bExact = bName === queryLower;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return aName.localeCompare(bName);
      });

      const sortedCategories = (categories || []).sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStartsWith = aName.startsWith(queryLower);
        const bStartsWith = bName.startsWith(queryLower);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return aName.localeCompare(bName);
      });

      setSearchResults({
        cakes: sortedCakes,
        categories: sortedCategories
      });
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults({ cakes: [], categories: [] });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim()) {
        search(searchQuery);
      } else {
        setSearchResults({ cakes: [], categories: [] });
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleCakeClick = (cakeId: string) => {
    navigate(`/cake/${cakeId}`);
    onOpenChange(false);
    setSearchQuery('');
    setSearchResults({ cakes: [], categories: [] });
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/category/${categoryId}`);
    onOpenChange(false);
    setSearchQuery('');
    setSearchResults({ cakes: [], categories: [] });
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults({ cakes: [], categories: [] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('search_title')}</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-12 h-12 text-base"
            autoFocus
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={handleClear}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiffany"></div>
            </div>
          ) : searchQuery && searchResults.cakes.length === 0 && searchResults.categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">{t('search_no_results')}</p>
              <p className="text-sm text-muted-foreground">{t('search_try_different')}</p>
            </div>
          ) : searchResults.cakes.length > 0 || searchResults.categories.length > 0 ? (
            <div>
              {searchResults.categories.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                    {t('order_categories')} ({searchResults.categories.length})
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {searchResults.categories.map((category) => (
                      <div
                        key={category.id}
                        onClick={() => handleCategoryClick(category.id)}
                        className="rounded-lg overflow-hidden cursor-pointer group relative aspect-square"
                      >
                        <img
                          src={category.image_url || '/placeholder.svg'}
                          alt={category.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end">
                          <span className="w-full p-1.5 text-white text-[10px] sm:text-xs font-medium text-center line-clamp-2">
                            {(language === 'ar' && category.name_ar) || category.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.cakes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                    {t('order_cakes')} ({searchResults.cakes.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults.cakes.map((cake) => {
                      const discountInfo = calculateDiscount(cake);
                      
                      return (
                      <div
                        key={cake.id}
                        onClick={() => handleCakeClick(cake.id)}
                        className="flex items-start gap-3 bg-background rounded-lg p-2.5 border border-border hover:border-tiffany/40 hover:bg-accent/30 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-foreground mb-0.5 line-clamp-1">
                            {(language === 'ar' && (cake as any).name_ar) || cake.name}
                          </h4>
                          {(cake.description || (cake as any).description_ar) && (
                            <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                              {(language === 'ar' && (cake as any).description_ar) || cake.description}
                            </p>
                          )}
                          {discountInfo.hasDiscount ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground line-through">
                                {toArabicNumerals(cake.price.toFixed(0))} {currencyLabel}
                              </span>
                              <span className="text-xs font-semibold text-destructive">
                                {toArabicNumerals(discountInfo.discountedPrice.toFixed(1))} {currencyLabel}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center px-2 py-0.5 border border-tiffany rounded-full">
                              <span className="text-xs font-semibold text-tiffany">
                                {currencyLabel} {toArabicNumerals(cake.price.toFixed(0))}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden bg-tiffany/10 relative">
                          {discountInfo.showBadge && discountInfo.discountPercentage && (
                            <div className="absolute top-0 left-0 bg-destructive text-destructive-foreground text-[8px] font-bold px-1 rounded-br z-10">
                              -{Math.round(discountInfo.discountPercentage)}%
                            </div>
                          )}
                          <img 
                            src={cake.image_url || '/placeholder.svg'}
                            alt={cake.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('search_start_typing')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
