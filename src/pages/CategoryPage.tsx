import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, ShoppingCart, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CategoryErrorFallback } from '@/components/CategoryErrorFallback';
import { getCachedCategoryData, setCachedCategoryData } from '@/utils/menuItemsCache';
import { formatPreparationTime } from '@/utils/dateHelpers';
import { withTimeout, createRequestGuard } from '@/utils/withTimeoutAbort';
import { calculateDiscount, DiscountableItem } from '@/utils/discountHelpers';
import { DiscountBadge } from '@/components/DiscountBadge';
import { useItemDiscounts, applyItemDiscount } from '@/hooks/useItemDiscounts';
import { COUNTRY_ID } from '@/config/country';

interface Category {
  id: string;
  name: string;
  image_url: string;
  is_active: boolean;
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
export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { t, translateCategory, language, toArabicNumerals, translatePrepTime, currencyLabel } = useTranslation();
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryItems, setCategoryItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  
  // Fetch active item discounts from item_discounts table
  const { discountsMap, isLoading: discountsLoading } = useItemDiscounts();
  
  // Enrich items with discount data from item_discounts table
  const enrichedItems = useMemo(() => {
    return categoryItems.map(item => applyItemDiscount(item, discountsMap));
  }, [categoryItems, discountsMap]);
  
  // Stale request guard - prevents late responses from overwriting state
  const requestGuardRef = useRef(createRequestGuard());
  const loadingStartRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleBack = () => navigate('/');

  const fetchCategoryAndItems = useCallback(async () => {
    if (!categoryId) return;

    // Check cache first
    const cachedData = getCachedCategoryData(categoryId);
    if (cachedData && cachedData.items.length > 0) {
      console.log(`✅ [CategoryPage] Using cached data for category ${categoryId}:`, cachedData.items.length);
      setCategoryItems(cachedData.items);
      if (cachedData.category) setCategory(cachedData.category);
      setLoading(false);
      setLoadingTooLong(false);
      return;
    }

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    const requestId = requestGuardRef.current.incrementAndGet();
    loadingStartRef.current = Date.now();

    try {
      setLoading(true);
      setError(null);
      setLoadingTooLong(false);

      // Set up "loading too long" indicator after 4 seconds
      const longLoadTimeout = setTimeout(() => {
        if (!requestGuardRef.current.isStale(requestId)) {
          setLoadingTooLong(true);
        }
      }, 4000);

      // Fetch with timeout (8 seconds)
      const [categoryResult, itemsResult] = await withTimeout(
        async () => {
          const [catRes, itemsRes] = await Promise.all([
            supabase
              .from('categories')
              .select('id, name, image_url, is_active')
              .eq('id', categoryId)
              .eq('is_active', true)
              .abortSignal(signal)
              .single(),
            supabase
              .from('menu_items')
              .select('*')
              .or(`category_id.eq.${categoryId},category_ids.cs.${JSON.stringify([categoryId])}`)
              .eq('country_id', COUNTRY_ID)
              .eq('is_active', true)
              .abortSignal(signal)
              .order('sort_order', { ascending: true })
              .order('name', { ascending: true })
          ]);
          return [catRes, itemsRes] as const;
        },
        { timeoutMs: 8000, operationName: 'CategoryPage.fetch' }
      );

      clearTimeout(longLoadTimeout);

      // Guard against stale responses
      if (requestGuardRef.current.isStale(requestId)) {
        console.log('🚫 [CategoryPage] Ignoring stale response for request', requestId);
        return;
      }

      if (categoryResult.error && categoryResult.error.code !== 'PGRST116') {
        throw categoryResult.error;
      }
      
      if (itemsResult.error) {
        throw itemsResult.error;
      }

      const categoryData = categoryResult.data;
      const itemsData = itemsResult.data || [];

      setCategory(categoryData);
      setCategoryItems(itemsData);
      setLoadingTooLong(false);
      
      if (itemsData.length > 0) {
        setCachedCategoryData(categoryId, categoryData, itemsData);
        console.log(`✅ [CategoryPage] Cached category + ${itemsData.length} items in ${Date.now() - loadingStartRef.current}ms`);
      }
    } catch (error: any) {
      // Guard against stale errors
      if (requestGuardRef.current.isStale(requestId)) return;
      
      // Don't show error for aborted requests (user navigated away)
      if (error?.name === 'AbortError' || signal.aborted) {
        console.log('🚫 [CategoryPage] Request aborted');
        return;
      }
      
      console.error('Error fetching category and items:', error);
      setError(error.message || 'Failed to load category. Please try again.');
    } finally {
      if (!requestGuardRef.current.isStale(requestId)) {
        setLoading(false);
      }
    }
  }, [categoryId]);

  // Fetch on mount and categoryId change
  useEffect(() => {
    if (categoryId) {
      console.log('🔄 [CategoryPage] Fetching public category data for:', categoryId);
      fetchCategoryAndItems();
    }
    
    return () => {
      // Cleanup: abort on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [categoryId, fetchCategoryAndItems]);

  // Visibility recovery: refetch if tab becomes visible and we're stuck loading
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && loading) {
        const elapsed = Date.now() - loadingStartRef.current;
        if (elapsed > 5000) {
          console.log('👁️ [CategoryPage] Tab visible + stuck loading, refetching...');
          fetchCategoryAndItems();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loading, fetchCategoryAndItems]);

  // Show error UI if there's an error
  if (error) {
    return <CategoryErrorFallback 
      error={error} 
      onRetry={fetchCategoryAndItems}
      onGoHome={() => navigate('/')}
    />;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-hero-gradient">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          {/* Loading too long indicator */}
          {loadingTooLong && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
               <p className="text-amber-800 dark:text-amber-200 text-sm">
                {t('cat_loading_slow')}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchCategoryAndItems}
                className="text-amber-800 border-amber-300"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('cat_retry')}
              </Button>
            </div>
          )}
          
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-8 w-48" />
            <div className="h-12 bg-muted rounded mb-4 w-96" />
            <div className="h-6 bg-muted rounded mb-12 w-64" />
            {/* Mobile skeletons */}
            <div className="space-y-4 md:hidden">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-start gap-4 bg-background rounded-xl p-4 shadow-sm border border-border">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-7 bg-muted rounded-full w-20 mt-2" />
                  </div>
                  <div className="w-24 h-24 bg-muted rounded-xl" />
                </div>
              ))}
            </div>

            {/* Desktop skeletons */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-card-gradient rounded-3xl overflow-hidden shadow-lg border border-tiffany/20">
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="p-6">
                    <div className="h-6 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded mb-4" />
                    <div className="h-8 bg-muted rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }
  if (!category) {
    return <main className="min-h-screen bg-hero-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="bg-card-gradient rounded-3xl p-12 border border-tiffany/20 shadow-lg max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-4">{t('cat_not_found')}</h1>
            <Button onClick={() => navigate('/')} className="bg-tiffany hover:bg-tiffany/90 text-white">
              {t('cat_back_to_menu')}
            </Button>
          </div>
        </div>
      </main>;
  }
  return <main className="min-h-screen bg-hero-gradient">
      <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button variant="default" size="icon" onClick={handleBack} className="rounded-full bg-tiffany hover:bg-tiffany/90 text-white shadow-lg flex-shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-display text-foreground mb-1 sm:mb-2 bg-gradient-to-r from-primary to-tiffany bg-clip-text text-transparent truncate">
              {translateCategory(category.name)}
            </h1>
            
          </div>
        </div>


        {enrichedItems.length === 0 ? <div className="text-center py-16">
            <div className="bg-card-gradient rounded-3xl p-12 border border-tiffany/20 shadow-lg max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-4">{t('cat_coming_soon')}</h2>
              <p className="text-muted-foreground mb-6">
                {t('cat_coming_soon_desc')}
              </p>
              <Button onClick={() => navigate('/')} className="bg-tiffany hover:bg-tiffany/90 text-white">
                {t('cat_back_to_menu')}
              </Button>
            </div>
          </div> : <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-8">
        {enrichedItems.map(item => {
              const discountInfo = calculateDiscount(item);
              
              return (
              <div key={item.id}>
                {/* Mobile Layout - Horizontal */}
                <div 
                  onClick={() => navigate(`/cake/${item.id}`)}
                  className="md:hidden flex items-start gap-4 bg-background rounded-xl p-4 shadow-sm border border-border active:bg-accent/50 transition-colors cursor-pointer"
                >
                  {/* Left: Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-foreground mb-1 line-clamp-2">
                      {(language === 'ar' && (item as any).name_ar) || item.name}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {(language === 'ar' && (item as any).description_ar) || item.description}
                    </p>
                    
                    {/* Price Badge with Discount Support */}
                    {discountInfo.hasDiscount ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground line-through">
                          {toArabicNumerals(item.price.toFixed(0))} {currencyLabel}
                        </span>
                        <div className="inline-flex items-center px-3 py-1 border-2 border-destructive rounded-full">
                          <span className="text-sm font-semibold text-destructive">
                            {toArabicNumerals(discountInfo.discountedPrice.toFixed(1))} {currencyLabel}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-flex items-center px-3 py-1 border-2 border-tiffany rounded-full">
                        <span className="text-sm font-semibold text-tiffany">
                          {currencyLabel} {toArabicNumerals(String(item.price))}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Right: Image with optional discount badge */}
                  <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-tiffany/10 relative">
                    {discountInfo.showBadge && discountInfo.discountPercentage && (
                      <DiscountBadge percentage={discountInfo.discountPercentage} size="sm" className="top-1 left-1" />
                    )}
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                
                {/* Desktop Layout - Vertical Card */}
                <div 
                  onClick={() => navigate(`/cake/${item.id}`)}
                  className="hidden md:block bg-card-gradient rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer border border-tiffany/20 group"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {/* Discount Badge */}
                    {discountInfo.showBadge && discountInfo.discountPercentage && (
                      <DiscountBadge percentage={discountInfo.discountPercentage} />
                    )}
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-tiffany/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Floating price badge with discount support */}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm font-bold px-3 py-1 rounded-full shadow-lg">
                      {discountInfo.hasDiscount ? (
                        <div className="flex flex-col items-end">
                         <span className="text-xs text-muted-foreground line-through">{toArabicNumerals(item.price.toFixed(0))} {currencyLabel}</span>
                          <span className="text-destructive">{toArabicNumerals(discountInfo.discountedPrice.toFixed(1))} {currencyLabel}</span>
                        </div>
                      ) : (
                        <span className="text-tiffany">{currencyLabel} {toArabicNumerals(String(item.price))}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-tiffany transition-colors duration-300">
                      {(language === 'ar' && (item as any).name_ar) || item.name}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {(language === 'ar' && (item as any).description_ar) || item.description}
                    </p>
                    
                    {item.preparation_time > 0 && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{translatePrepTime(formatPreparationTime(item.preparation_time))}</span>
                        </div>
                      </div>
                    )}
                    
                    <Button className="w-full bg-tiffany hover:bg-tiffany/90 text-white group-hover:scale-105 transition-all duration-300">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {t('cake_add_to_cart')}
                    </Button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>}
      </div>
    </main>;
}