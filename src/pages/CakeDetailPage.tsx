import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { ArrowLeft, Heart, ShoppingCart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CartItem, WishlistItem } from '@/types';
import { CustomVariantSelector, type CustomSection } from '@/components/CustomVariantSelector';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { formatPreparationTime } from '@/utils/dateHelpers';
import { addToWishlistDB, removeFromWishlistDB } from '@/utils/wishlistSync';
import { calculateDiscount, DiscountableItem } from '@/utils/discountHelpers';
import { DiscountBadge } from '@/components/DiscountBadge';
import { useItemDiscounts, applyItemDiscount } from '@/hooks/useItemDiscounts';
import { COUNTRY_ID } from '@/config/country';
import { formatAmount } from '@/utils/currencyHelpers';

interface MenuItemFlavor {
  name: string;
  price_modifier: number;
  is_available: boolean;
}

interface MenuItemSize {
  name: string;
  price_modifier: number;
  is_available: boolean;
}

interface MenuItem extends DiscountableItem {
  id: string;
  name: string;
  description: string;
  image_url: string;
  category_id: string;
  flavors: any; // JSONB field
  sizes: any; // JSONB field
  custom_sections?: any; // JSONB field - will be parsed to CustomSection[]
  additional_images?: any; // JSONB field - will be parsed to string[]
  preparation_time?: number;
}

interface Category {
  id: string;
  name: string;
  name_ar?: string;
  image_url: string;
}
export default function CakeDetailPage() {
  const { cakeId } = useParams<{ cakeId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const { t, translateCategory, language, toArabicNumerals, translateVariant, translatePrepTime, currencyLabel } = useTranslation();
  
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY - before any conditional returns
  const [selectedFlavor, setSelectedFlavor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [customSelections, setCustomSelections] = useState<Record<string, string | string[]>>({});
  const [totalVariantPrice, setTotalVariantPrice] = useState(0);
  const [isCustomValid, setIsCustomValid] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [relatedCakes, setRelatedCakes] = useState<MenuItem[]>([]);
  
  // Fetch item discounts from item_discounts table
  const { discountsMap, isLoading: discountsLoading } = useItemDiscounts();

  // Fetch data with AbortController + timeout to handle navigation and stuck requests
  useEffect(() => {
    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout>;
    let loadingStartTime = Date.now();

    const fetchMenuItemData = async () => {
      if (!cakeId) return;
      
      // Reset states on new fetch
      setDataLoading(true);
      setLoadTimeout(false);
      setMenuItem(null);
      setCategory(null);
      loadingStartTime = Date.now();

      // Set timeout for stuck loading detection (6s)
      timeoutId = setTimeout(() => {
        if (!abortController.signal.aborted) {
          console.warn('⏱️ [CakeDetailPage] Load timeout - aborting');
          abortController.abort();
          setLoadTimeout(true);
          setDataLoading(false);
        }
      }, 6000);

      try {
        // Fetch menu item with abort signal
        const { data: menuItemData, error: menuError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('id', cakeId)
          .eq('country_id', COUNTRY_ID)
          .abortSignal(abortController.signal)
          .maybeSingle();

        // Check if aborted before processing
        if (abortController.signal.aborted) return;

        if (menuError) throw menuError;
        if (!menuItemData) {
          setDataLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        setMenuItem(menuItemData);

        // Fetch category with abort signal (optional - don't block if it fails)
        if (menuItemData?.category_id) {
          try {
            const { data: categoryData } = await supabase
              .from('categories')
              .select('*')
              .eq('id', menuItemData.category_id)
              .abortSignal(abortController.signal)
              .maybeSingle();

            if (!abortController.signal.aborted && categoryData) {
              setCategory(categoryData);
            }
          } catch {
            // Category fetch is optional - don't fail the whole page
            console.warn('[CakeDetailPage] Category fetch failed, continuing without it');
          }
        }
        
        console.log(`✅ [CakeDetailPage] Data loaded in ${Date.now() - loadingStartTime}ms`);
      } catch (error: any) {
        if (!abortController.signal.aborted) {
          console.error('Error fetching data:', error);
          if (error?.name === 'AbortError' || error?.message?.includes('abort')) {
            setLoadTimeout(true);
          }
        }
      } finally {
        clearTimeout(timeoutId);
        if (!abortController.signal.aborted) {
          setDataLoading(false);
        }
      }
    };

    fetchMenuItemData();
    
    // Visibility recovery - if tab becomes visible and still loading > 5s, refetch
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !abortController.signal.aborted) {
        const loadingDuration = Date.now() - loadingStartTime;
        if (dataLoading && loadingDuration > 5000) {
          console.log('📺 [CakeDetailPage] Tab visible + stuck loading, triggering retry');
          setLoadTimeout(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup: abort fetch and clear timeout on unmount or cakeId change
    return () => {
      abortController.abort();
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cakeId]);

  // Fetch related cakes from same category
  useEffect(() => {
    const fetchRelatedCakes = async () => {
      if (!menuItem?.category_id || !cakeId) return;
      
      try {
        const { data } = await supabase
          .from('menu_items')
          .select('id, name, price, image_url, category_id, description, flavors, sizes, custom_sections, additional_images, preparation_time')
          .eq('category_id', menuItem.category_id)
          .eq('is_active', true)
          .eq('country_id', COUNTRY_ID)
          .neq('id', cakeId)
          .limit(12);
        
        // Filter out same-name items and deduplicate by name
        const seen = new Set<string>();
        seen.add(menuItem.name);
        const deduplicated = (data || []).filter((item: any) => {
          if (seen.has(item.name)) return false;
          seen.add(item.name);
          return true;
        }).slice(0, 3);
        
        setRelatedCakes(deduplicated as MenuItem[]);
      } catch (error) {
        console.error('Error fetching related cakes:', error);
      }
    };

    fetchRelatedCakes();
  }, [menuItem?.category_id, cakeId]);

  // ALL useMemo hooks MUST be called BEFORE any conditional returns (Rules of Hooks)
  // Parse JSON fields and ensure they're arrays - safely handle null menuItem
  const flavors = useMemo(() => {
    return menuItem && Array.isArray(menuItem.flavors) ? menuItem.flavors : [];
  }, [menuItem]);
  
  const sizes = useMemo(() => {
    return menuItem && Array.isArray(menuItem.sizes) ? menuItem.sizes : [];
  }, [menuItem]);
  
  const customSections: CustomSection[] = useMemo(() => {
    return menuItem && Array.isArray(menuItem.custom_sections) ? menuItem.custom_sections : [];
  }, [menuItem]);

  // Parse additional images and build complete image array
  const additionalImages: string[] = useMemo(() => {
    return menuItem && Array.isArray(menuItem.additional_images) 
      ? menuItem.additional_images.filter((img: any) => typeof img === 'string' && img.trim() !== '') 
      : [];
  }, [menuItem]);

  // Combine main image with additional images
  const allImages = useMemo(() => {
    return menuItem ? [menuItem.image_url, ...additionalImages] : [];
  }, [menuItem, additionalImages]);
  
  const hasMultipleImages = allImages.length > 1;
  
  const selectedFlavorData = useMemo(() => {
    return flavors.find((f: MenuItemFlavor) => f.name === selectedFlavor);
  }, [flavors, selectedFlavor]);
  
  const selectedSizeData = useMemo(() => {
    return sizes.find((s: MenuItemSize) => s.name === selectedSize);
  }, [sizes, selectedSize]);
  
  const legacyPrice = (selectedFlavorData?.price_modifier || 0) + (selectedSizeData?.price_modifier || 0);
  
  // Apply item discount from item_discounts table
  const enrichedMenuItem = useMemo(() => {
    if (!menuItem) return null;
    return applyItemDiscount(menuItem, discountsMap);
  }, [menuItem, discountsMap]);
  
  const discountInfo = useMemo(() => {
    if (!enrichedMenuItem) return { hasDiscount: false, discountedPrice: 0, discountPercentage: 0 };
    return calculateDiscount(enrichedMenuItem);
  }, [enrichedMenuItem]);
  
  // Calculate price with discount applied - safely handle null menuItem
  const basePrice = menuItem ? (discountInfo.hasDiscount ? discountInfo.discountedPrice : menuItem.price) : 0;
  const finalPrice = basePrice + legacyPrice + totalVariantPrice;
  const originalFinalPrice = (menuItem?.price || 0) + legacyPrice + totalVariantPrice;

  // Check if we can add to cart - need flavor/size if no custom sections, or custom sections if available
  const needsFlavor = flavors.length > 0 && customSections.length === 0;
  const needsSize = sizes.length > 0 && customSections.length === 0;
  const canAddToCart = (!needsFlavor || selectedFlavor) && (!needsSize || selectedSize) && (customSections.length === 0 || isCustomValid);

  // Create a legacy cake object for wishlist compatibility
  const legacyCake = useMemo(() => {
    if (!menuItem) return null;
    return {
      id: menuItem.id,
      name: menuItem.name,
      name_ar: (menuItem as any).name_ar || undefined,
      categoryId: menuItem.category_id,
      image: menuItem.image_url,
      description: menuItem.description,
      basePrice: menuItem.price,
      inches: [],
      layers: 1,
      servingSize: 'Varies by size',
      preparationTime: menuItem.preparation_time ? formatPreparationTime(menuItem.preparation_time) : 'Standard'
    };
  }, [menuItem]);
  
  const isInWishlist = menuItem ? state.wishlist.some(item => item.cake.id === menuItem.id) : false;

  // Retry function for timeout recovery
  const handleRetry = () => {
    setLoadTimeout(false);
    setDataLoading(true);
    window.location.reload();
  };

  // NOW we can have conditional returns - after ALL hooks have been called
  if (dataLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          {loadTimeout ? (
            <>
              <p className="text-muted-foreground mb-4">{t('cake_loading_slow')}</p>
              <Button onClick={handleRetry} variant="outline">
                {t('cake_try_again')}
              </Button>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiffany mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('cake_loading')}</p>
            </>
          )}
        </div>
      </main>
    );
  }
  
  // Only require menuItem - category is optional (show without category name if missing)
  if (!menuItem || !legacyCake) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('cake_not_found')}</h1>
          <Button onClick={() => navigate('/')}>{t('cake_back_to_menu')}</Button>
        </div>
      </main>
    );
  }
  const handleAddToWishlist = () => {
    if (!user) {
      toast({
        title: t('cake_login_required'),
        description: t('cake_login_wishlist_desc'),
        variant: 'destructive'
      });
      return;
    }
    if (isInWishlist) {
      const wishlistItem = state.wishlist.find(item => item.cake.id === menuItem.id);
      if (wishlistItem) {
        dispatch({
          type: 'REMOVE_FROM_WISHLIST',
          payload: wishlistItem.id
        });
        // Immediately sync removal to database
        if (user) {
          removeFromWishlistDB(user.id, menuItem.id);
        }
        toast({
          title: t('cake_removed_wishlist')
        });
      }
    } else {
      const wishlistItem: WishlistItem = {
        id: `wishlist-${menuItem.id}-${Date.now()}`,
        cake: legacyCake,
        addedAt: new Date()
      };
      dispatch({
        type: 'ADD_TO_WISHLIST',
        payload: wishlistItem
      });
      // Immediately sync addition to database
      if (user) {
        addToWishlistDB(user.id, wishlistItem);
      }
      toast({
        title: t('cake_added_wishlist')
      });
    }
  };
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: menuItem.name,
      text: `Check out this delicious ${menuItem.name} from Panda Cakes! ${menuItem.description || ''}`,
      url: shareUrl
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: t('cake_shared'),
          description: t('cake_shared_desc')
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: t('cake_link_copied'),
          description: t('cake_link_copied_desc')
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
        toast({
          title: t('cake_share_failed'),
          description: t('cake_share_failed_desc'),
          variant: "destructive"
        });
      }
    }
  };
  const handleAddToCart = async () => {
    if (!canAddToCart) return;
    setIsLoading(true);
    try {
      // Build customizations object
      const customizations: CartItem['customizations'] = customSections.length > 0 ? {
        custom_selections: {},
        total_variant_price: totalVariantPrice,
        specialInstructions: specialInstructions || undefined
      } : undefined;

      // Populate custom_selections
      if (customizations) {
        customSections.forEach(section => {
          const selected = customSelections[section.title];
          if (selected) {
            const selectedOptions = Array.isArray(selected) ? selected : [selected];
            const price = section.options.filter(opt => selectedOptions.includes(opt.name)).reduce((sum, opt) => sum + opt.price, 0);
            customizations.custom_selections[section.title] = {
              selected,
              price
            };
          }
        });
      }
      
      // Build cart item with discount info
      const cartItem: CartItem = {
        id: `cart-${menuItem.id}-${Date.now()}`,
        cake: legacyCake,
        flavor: selectedFlavor || 'Default',
        variant: selectedSize || 'Standard',
        specialInstructions: specialInstructions || undefined,
        quantity: 1,
        price: finalPrice,
        originalPrice: discountInfo.hasDiscount ? originalFinalPrice : undefined,
        itemDiscount: discountInfo.hasDiscount ? {
          percentage: discountInfo.discountPercentage || 0,
          amount: originalFinalPrice - finalPrice
        } : undefined,
        customizations
      };
      dispatch({
        type: 'ADD_TO_CART',
        payload: cartItem
      });
      toast({
        title: t('cake_added_to_cart'),
        description: `${menuItem.name} ${t('cake_added_desc')}`
      });

      // Redirect to cart page
      navigate('/cart');

      // Reset selections after adding to cart
      setSelectedFlavor('');
      setSelectedSize('');
      setSpecialInstructions('');
      setCustomSelections({});
      setTotalVariantPrice(0);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item to cart',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <main className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(menuItem.category_id ? `/category/${menuItem.category_id}` : '/')} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
           {category?.name && <p className="text-muted-foreground">{translateCategory(category.name)}</p>}
            <h1 className="text-3xl md:text-4xl font-black font-display text-foreground">
              {(language === 'ar' && (menuItem as any).name_ar) || menuItem.name}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Cake Image(s) - Slider if multiple images */}
          <div className="space-y-4">
            {hasMultipleImages ? <Carousel className="w-full" opts={{
            align: "start",
            loop: true
          }} setApi={api => {
            setCarouselApi(api);
            api?.on('select', () => {
              setCurrentSlide(api.selectedScrollSnap());
            });
          }}>
                <CarouselContent>
                  {allImages.map((imageUrl, index) => <CarouselItem key={index}>
                      <div className="aspect-square rounded-3xl overflow-hidden bg-card shadow-lg">
                        <img src={imageUrl} alt={`${menuItem.name} - Image ${index + 1}`} loading="lazy" className="w-full h-full object-cover" />
                      </div>
                    </CarouselItem>)}
                </CarouselContent>
                
                {/* Navigation Arrows */}
                <CarouselPrevious className="left-2 sm:left-4 h-8 w-8 sm:h-10 sm:w-10 bg-white/90 hover:bg-white shadow-lg border-0" />
                <CarouselNext className="right-2 sm:right-4 h-8 w-8 sm:h-10 sm:w-10 bg-white/90 hover:bg-white shadow-lg border-0" />
              </Carousel> :
          // Single image - no slider needed
          <div className="aspect-square rounded-3xl overflow-hidden bg-card shadow-lg">
                <img src={menuItem.image_url} alt={menuItem.name} loading="lazy" className="w-full h-full object-cover" />
              </div>}
            
            {/* Thumbnail Dots Navigation */}
            {hasMultipleImages && <div className="flex justify-center gap-1.5 sm:gap-2 px-4">
                {allImages.map((_, index) => <button key={index} onClick={() => carouselApi?.scrollTo(index)} className={cn("h-1.5 sm:h-2 rounded-full transition-all duration-300 touch-manipulation", currentSlide === index ? "w-6 sm:w-8 bg-tiffany" : "w-1.5 sm:w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50")} aria-label={`Go to image ${index + 1}`} aria-current={currentSlide === index} />)}
              </div>}
          </div>

          {/* Cake Details & Options */}
          <div className="space-y-8">
            <div>
              <p className="text-lg text-muted-foreground mb-6">{(language === 'ar' && (menuItem as any).description_ar) || menuItem.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {menuItem.preparation_time && <div>
                    <span className="font-semibold text-foreground">{t('cake_prep_time')}</span>
                    <p className="text-muted-foreground">{translatePrepTime(formatPreparationTime(menuItem.preparation_time))}</p>
                  </div>}
                <div>
                  <span className="font-semibold text-foreground text-xl">{t('cake_price')}</span>
                  {(() => {
                    const discountInfo = calculateDiscount(menuItem);
                    return discountInfo.hasDiscount ? (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground line-through text-lg">{toArabicNumerals(formatAmount(menuItem.price))} {currencyLabel}</span>
                        <span className="text-destructive font-bold text-xl">{toArabicNumerals(formatAmount(discountInfo.discountedPrice))} {currencyLabel}</span>
                      </div>
                    ) : (
                      <p className="text-tiffany font-bold text-xl">{currencyLabel} {toArabicNumerals(String(menuItem.price))}</p>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Custom Variant Selection */}
            {customSections.length > 0 && <CustomVariantSelector customSections={customSections} selections={customSelections} onSelectionChange={(title, value) => {
            setCustomSelections(prev => ({
              ...prev,
              [title]: value
            }));
          }} onPriceChange={setTotalVariantPrice} onValidationChange={setIsCustomValid} />}

            {/* Legacy Flavor Selection - Only show if no custom sections */}
            {flavors.length > 0 && customSections.length === 0 && <div className="space-y-3">
                <Label className="text-base font-semibold">{t('cake_flavor')}</Label>
                <Select value={selectedFlavor} onValueChange={setSelectedFlavor}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('cake_choose_flavor')} />
                  </SelectTrigger>
                  <SelectContent>
                    {flavors.filter((flavor: MenuItemFlavor) => flavor.is_available).map((flavor: MenuItemFlavor) => <SelectItem key={flavor.name} value={flavor.name}>
                          {translateVariant(flavor.name)} {flavor.price_modifier > 0 && `(+${currencyLabel} ${toArabicNumerals(String(flavor.price_modifier))})`}
                        </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}

            {/* Legacy Size Selection - Only show if no custom sections */}
            {sizes.length > 0 && customSections.length === 0 && <div className="space-y-3">
                <Label className="text-base font-semibold">{t('cake_size')}</Label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('cake_choose_size')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sizes.filter((size: MenuItemSize) => size.is_available).map((size: MenuItemSize) => <SelectItem key={size.name} value={size.name}>
                          {translateVariant(size.name)} {size.price_modifier > 0 && `(+${currencyLabel} ${toArabicNumerals(String(size.price_modifier))})`}
                        </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}

            {/* Special Instructions */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('cake_special_instructions')}</Label>
              <Textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} rows={3} placeholder={t('cake_special_placeholder')} />
            </div>

            {/* Price Display */}
            <div className="p-4 bg-card rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">{t('cake_total_price')}</span>
                <span className="text-2xl font-black text-tiffany">{currencyLabel} {toArabicNumerals(formatAmount(finalPrice))}</span>
              </div>
              {(totalVariantPrice > 0 || legacyPrice > 0) && <div className="text-sm text-muted-foreground mt-2 space-y-1">
                  <div>{t('cake_base_price')} {currencyLabel} {toArabicNumerals(formatAmount(menuItem.price))}</div>
                  {totalVariantPrice > 0 && <div>{t('cake_customizations')} +{currencyLabel} {toArabicNumerals(formatAmount(totalVariantPrice))}</div>}
                  {legacyPrice > 0 && <div>{t('cake_options')} +{currencyLabel} {toArabicNumerals(formatAmount(legacyPrice))}</div>}
                </div>}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button onClick={handleAddToWishlist} variant="outline" size="icon" className="rounded-full flex-shrink-0" disabled={!user}>
                <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-current text-red-500' : ''}`} />
              </Button>
              
              <Button onClick={handleShare} variant="outline" size="icon" className="rounded-full flex-shrink-0">
                <Share2 className="h-5 w-5" />
              </Button>
              
              <Button onClick={handleAddToCart} disabled={!canAddToCart || isLoading} className="flex-1" size="lg">
                <ShoppingCart className="h-5 w-5 mr-2" />
                {isLoading ? t('cake_adding') : t('cake_add_to_cart')}
              </Button>
            </div>

            {!user}

            {!canAddToCart && user && <p className="text-sm text-muted-foreground text-center">
                {needsFlavor && !selectedFlavor && needsSize && !selectedSize && t('cake_select_flavor_size')}
                {needsFlavor && !selectedFlavor && !needsSize && t('cake_select_flavor')}
                {!needsFlavor && needsSize && !selectedSize && t('cake_select_size')}
              </p>}

            {flavors.length === 0 && sizes.length === 0}
          </div>
        </div>

        {/* You Might Also Like Section */}
        {relatedCakes.length > 0 && (
          <div className="mt-12 border-t pt-8">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">{t('cake_you_might_like')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedCakes.map((cake) => (
                <div 
                  key={cake.id}
                  onClick={() => navigate(`/cake/${cake.id}`)}
                  className="cursor-pointer group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-square overflow-hidden">
                    <img 
                      src={cake.image_url || '/placeholder.svg'} 
                      alt={cake.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground line-clamp-2 mb-1">{(language === 'ar' && (cake as any).name_ar) || cake.name}</h3>
                    {(() => {
                      const discountInfo = calculateDiscount(cake as unknown as DiscountableItem);
                      return discountInfo.hasDiscount ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground line-through">{toArabicNumerals(formatAmount(cake.price))} {currencyLabel}</span>
                          <span className="text-destructive font-bold">{toArabicNumerals(formatAmount(discountInfo.discountedPrice))} {currencyLabel}</span>
                        </div>
                      ) : (
                        <p className="text-tiffany font-bold">{currencyLabel} {toArabicNumerals(String(cake.price))}</p>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>;
}