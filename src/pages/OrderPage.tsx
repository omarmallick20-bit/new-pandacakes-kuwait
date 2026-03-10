import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useDataContext } from '@/contexts/DataContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { calculateDiscount, DiscountableItem } from '@/utils/discountHelpers';
import { DiscountBadge } from '@/components/DiscountBadge';
import { useItemDiscounts, applyItemDiscount } from '@/hooks/useItemDiscounts';
import { useCategoryDiscounts } from '@/hooks/useCategoryDiscounts';
import { useTranslation } from '@/hooks/useTranslation';
import { COUNTRY_ID } from '@/config/country';
import { formatAmount } from '@/utils/currencyHelpers';

interface Category {
  id: string;
  name: string;
  image_url: string;
  is_active: boolean;
  sort_order?: number;
}

interface LayoutConfig {
  id: string;
  mobile_columns: number;
  desktop_columns: number;
  mobile_gap: number;
  desktop_gap: number;
  show_category_names: boolean;
  card_aspect_ratio: string;
}

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

interface SearchResults {
  cakes: MenuItem[];
  categories: Category[];
}

interface CakeCardProps {
  cake: MenuItem;
}
const CakeCard = React.memo(({
  cake,
  discountsMap
}: CakeCardProps & { discountsMap: Map<string, any> }) => {
  const navigate = useNavigate();
  const { language, currencyLabel } = useTranslation();
  const enrichedCake = applyItemDiscount(cake, discountsMap);
  const discountInfo = calculateDiscount(enrichedCake);
  
  return (
    <div onClick={() => navigate(`/cake/${cake.id}`)} className="bg-card-gradient rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer border border-tiffany/20 group">
      <div className="aspect-[4/3] relative">
        {/* Discount Badge */}
        {discountInfo.showBadge && discountInfo.discountPercentage && (
          <DiscountBadge percentage={discountInfo.discountPercentage} />
        )}
        <img src={cake.image_url || '/placeholder.svg'} alt={cake.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-tiffany/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-tiffany transition-colors">
          {cake.name}
        </h3>
        {cake.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {cake.description}
          </p>}
        <div className="flex items-center justify-between">
          {/* Price with Discount Support */}
          {discountInfo.hasDiscount ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground line-through">
                {formatAmount(cake.price)} {currencyLabel}
              </span>
              <span className="text-xl font-bold text-destructive">
                {formatAmount(discountInfo.discountedPrice)} {currencyLabel}
              </span>
            </div>
          ) : (
            <span className="text-xl font-bold text-tiffany">
              {currencyLabel} {formatAmount(cake.price)}
            </span>
          )}
          {cake.preparation_time && <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{cake.preparation_time}min</span>
            </div>}
        </div>
        <div className="mt-2 h-1 bg-gradient-to-r from-tiffany to-sunshine rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      </div>
    </div>
  );
});
CakeCard.displayName = 'CakeCard';
export default function OrderPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t, translateCategory, language, currencyLabel } = useTranslation();

  // Fetch active item discounts from item_discounts table
  const { discountsMap, isLoading: discountsLoading } = useItemDiscounts();
  const { categoryDiscounts } = useCategoryDiscounts();

  // Use centralized DataContext for categories and layout
  const {
    categories,
    layoutConfig,
    isLoading: dataLoading,
    hasError,
    loadingTooLong,
    retryLoading
  } = useDataContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>({
    cakes: [],
    categories: []
  });
  const [isSearching, setIsSearching] = useState(false);

  // Debug function
  useEffect(() => {
    (window as any).debugCategories = () => {
      console.log('Current State:', {
        categoriesCount: categories.length,
        loading: dataLoading,
        isSearching,
        searchQuery
      });
      console.log('Categories:', categories);
    };
  }, [categories, dataLoading, isSearching, searchQuery]);

  // Note: fetchLayoutConfig and fetchCategories removed - now using DataContext
  const search = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({
        cakes: [],
        categories: []
      });
      setIsSearching(false);
      return;
    }
    try {
      setIsSearching(true);

      // Search both cakes and categories in parallel
      const [cakesResult, categoriesResult] = await Promise.all([supabase.from('menu_items').select('*').eq('country_id', COUNTRY_ID).eq('is_active', true).ilike('name', `%${query}%`).order('name'), supabase.from('categories').select('*').eq('is_active', true).ilike('name', `%${query}%`).order('name')]);
      if (cakesResult.error) throw cakesResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      setSearchResults({
        cakes: cakesResult.data || [],
        categories: categoriesResult.data || []
      });
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults({
        cakes: [],
        categories: []
      });
    } finally {
      setIsSearching(false);
    }
  };
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim()) {
        search(searchQuery);
      } else {
        setSearchResults({
          cakes: [],
          categories: []
        });
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);
  return <main className="min-h-screen bg-hero-gradient">
      <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
        <h1 className="font-black font-display mb-4 bg-gradient-to-r from-tiffany to-primary bg-clip-text text-slate-950 text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
          {t('order_title')}
        </h1>
          
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input type="text" placeholder={t('order_search_placeholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 pr-12 h-14 text-lg rounded-full border-2 border-tiffany/30 focus:border-tiffany bg-white/80 backdrop-blur text-slate-900 dark:text-slate-900" />
            {searchQuery && <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery('')}>
                <X className="h-5 w-5" />
              </Button>}
          </div>
        </div>

        {searchQuery.trim().length > 0 ? <>
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-foreground">
                {t('order_search_results')} "{searchQuery}"
              </h2>
              <Button variant="outline" onClick={() => setSearchQuery('')} className="gap-2">
                <X className="h-4 w-4" />
                {t('order_clear_search')}
              </Button>
            </div>

            {searchResults.cakes.length === 0 && searchResults.categories.length === 0 ? <div className="text-center py-16">
                <div className="bg-card-gradient rounded-3xl p-12 border border-tiffany/20 shadow-lg max-w-md mx-auto">
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    {t('order_no_results')}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t('order_try_different')}
                  </p>
                  <Button onClick={() => setSearchQuery('')}>
                    {t('order_browse_all')}
                  </Button>
                </div>
              </div> : <div className="space-y-8">
                {/* Categories Section */}
                {searchResults.categories.length > 0 && <div>
                    <h3 className="text-2xl font-bold text-foreground mb-6">
                      {t('order_categories')} ({searchResults.categories.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {searchResults.categories.map(category => <div key={category.id} onClick={() => navigate(`/category/${category.id}`)} className="bg-card-gradient rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer border border-tiffany/20 group">
                          <div className="aspect-square relative">
                            <img src={category.image_url || '/placeholder.svg'} alt={category.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-tiffany/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                          <div className="p-4 text-center">
                            <h4 className="font-bold text-foreground group-hover:text-tiffany transition-colors">
                              {translateCategory(category.name)}
                            </h4>
                          </div>
                        </div>)}
                    </div>
                  </div>}

                {/* Cakes Section - Compact Layout */}
                {searchResults.cakes.length > 0 && <div>
                    <h3 className="text-lg font-bold text-foreground mb-4">
                      {t('order_cakes')} ({searchResults.cakes.length})
                    </h3>
                    <div className="space-y-2">
                      {searchResults.cakes.map(cake => {
                        const enrichedCake = applyItemDiscount(cake, discountsMap);
                        const discountInfo = calculateDiscount(enrichedCake);
                        
                        return (
                          <div
                            key={cake.id}
                            onClick={() => navigate(`/cake/${cake.id}`)}
                            className="flex items-start gap-3 bg-background rounded-lg p-3 border border-border hover:border-tiffany/40 hover:bg-accent/30 transition-colors cursor-pointer"
                          >
                            {/* Left: Content */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-foreground mb-0.5 line-clamp-1">
                                {cake.name}
                              </h4>
                              {cake.description && (
                                <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                                  {cake.description}
                                </p>
                              )}
                              {/* Price with Discount Support */}
                              {discountInfo.hasDiscount ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground line-through">
                                    {formatAmount(cake.price)} {currencyLabel}
                                  </span>
                                  <span className="text-xs font-semibold text-destructive">
                                    {formatAmount(discountInfo.discountedPrice)} {currencyLabel}
                                  </span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center px-2 py-0.5 border border-tiffany rounded-full">
                                  <span className="text-xs font-semibold text-tiffany">
                                    {currencyLabel} {formatAmount(cake.price)}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Right: Small image with optional badge */}
                            <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-tiffany/10 relative">
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
                  </div>}
              </div>}
          </> : dataLoading ? <div className="space-y-6">
            {/* Show retry option if loading takes too long or has error */}
            {(loadingTooLong || hasError) && <div className="text-center">
                <div className="bg-card-gradient rounded-2xl p-6 border border-amber-200 shadow-lg max-w-md mx-auto">
                  <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {hasError ? t('order_failed_load') : t('order_loading_slow')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {hasError ? t('order_problem_loading') : t('order_slow_connection')}
                  </p>
                  <Button onClick={retryLoading} variant="outline" className="gap-2 border-tiffany text-tiffany hover:bg-tiffany hover:text-white">
                    <RefreshCw className="h-4 w-4" />
                    {t('order_try_again')}
                  </Button>
                </div>
              </div>}
            <div className="grid" style={{
          gridTemplateColumns: `repeat(${isMobile ? layoutConfig?.mobile_columns || 2 : layoutConfig?.desktop_columns || 4}, 1fr)`,
          gap: `${isMobile ? layoutConfig?.mobile_gap || 16 : layoutConfig?.desktop_gap || 24}px`
        }}>
              {Array.from({
            length: 8
          }).map((_, index) => <div key={index} className="bg-card-gradient rounded-3xl overflow-hidden shadow-lg border border-tiffany/20 animate-pulse">
                  <div className="aspect-[4/3] md:aspect-square bg-muted" />
                  <div className="p-3 md:p-6">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-2 bg-muted rounded w-1/2" />
                  </div>
                </div>)}
            </div>
          </div> : categories.length === 0 || hasError ? <div className="text-center py-16">
              <div className="bg-card-gradient rounded-3xl p-12 border border-tiffany/20 shadow-lg max-w-md mx-auto">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  {hasError ? t('order_unable_load') : t('order_no_categories')}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {hasError ? t('order_check_connection') : t('order_check_back')}
                </p>
                <Button onClick={retryLoading} className="bg-tiffany hover:bg-tiffany/90 text-white gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t('order_retry')}
                </Button>
              </div>
            </div> : <div className="grid" style={{
        gridTemplateColumns: `repeat(${isMobile ? layoutConfig?.mobile_columns || 2 : layoutConfig?.desktop_columns || 4}, 1fr)`,
        gap: `${isMobile ? layoutConfig?.mobile_gap || 16 : layoutConfig?.desktop_gap || 24}px`
      }}>
            {categories.map(category => {
              const catDiscount = categoryDiscounts.get(category.id);
              return <div key={category.id} onClick={() => navigate(`/category/${category.id}`)} className="bg-card-gradient rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer border border-tiffany/20 group">
                <div className="aspect-[4/3] md:aspect-square relative">
                  {catDiscount && catDiscount > 0 && (
                    <DiscountBadge percentage={catDiscount} />
                  )}
                  <img src={category.image_url || '/placeholder.svg'} alt={category.name} loading="lazy" onError={e => {
              e.currentTarget.src = '/placeholder.svg';
            }} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-tiffany/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-3 md:p-6 relative">
                  <h3 className="text-sm md:text-lg font-bold text-foreground group-hover:text-tiffany transition-colors duration-300">
                    {translateCategory(category.name)}
                  </h3>
                  <div className="mt-2 h-1 bg-gradient-to-r from-tiffany to-sunshine rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </div>
              </div>;
            })}
          </div>}
      </div>
    </main>;
}