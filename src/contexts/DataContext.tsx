import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedCategories, setCachedCategories } from '@/utils/categoryCache';
import { withTimeoutAutoAbort } from '@/utils/withTimeoutAbort';
import { COUNTRY_ID, DEFAULT_CURRENCY, DEFAULT_CURRENCY_SYMBOL } from '@/config/country';

interface Category {
  id: string;
  name: string;
  name_ar?: string;
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

interface SiteConfig {
  id: string;
  vat_enabled: boolean;
  vat_percentage: number;
  currency_code: string;
  currency_symbol: string;
}

interface DataContextType {
  categories: Category[];
  layoutConfig: LayoutConfig | null;
  siteConfig: SiteConfig | null;
  isDataReady: boolean;
  isLoading: boolean;
  hasError: boolean;
  loadingTooLong: boolean;
  refreshCategories: () => Promise<void>;
  retryLoading: () => void;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const FETCH_TIMEOUT_MS = 8000; // 8 second timeout with abort
const SLOW_LOADING_THRESHOLD_MS = 3000; // Show "taking too long" after 3 seconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DataContext = createContext<DataContextType | null>(null);

// In-memory cache (survives re-renders but not page refresh)
let categoriesCache: CacheEntry<Category[]> | null = null;
let layoutConfigCache: CacheEntry<LayoutConfig> | null = null;
let siteConfigCache: CacheEntry<SiteConfig> | null = null;

const isCacheValid = <T,>(cache: CacheEntry<T> | null): boolean => {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_TTL_MS;
};

// Default configs to use as fallback
const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  id: 'default',
  mobile_columns: 2,
  desktop_columns: 4,
  mobile_gap: 16,
  desktop_gap: 24,
  show_category_names: true,
  card_aspect_ratio: '4/3'
};

const DEFAULT_SITE_CONFIG: SiteConfig = {
  id: 'default',
  vat_enabled: false,
  vat_percentage: 0,
  currency_code: DEFAULT_CURRENCY,
  currency_symbol: DEFAULT_CURRENCY_SYMBOL
};

export function DataProvider({ children }: { children: ReactNode }) {
  // Initialize from cache immediately (in-memory or localStorage)
  const getInitialCategories = (): Category[] => {
    if (categoriesCache?.data) return categoriesCache.data;
    const lsCache = getCachedCategories();
    if (lsCache) {
      categoriesCache = { data: lsCache, timestamp: Date.now() };
      return lsCache;
    }
    return [];
  };

  const [categories, setCategories] = useState<Category[]>(getInitialCategories);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(layoutConfigCache?.data || DEFAULT_LAYOUT_CONFIG);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(siteConfigCache?.data || DEFAULT_SITE_CONFIG);
  const [isLoading, setIsLoading] = useState(!isCacheValid(categoriesCache) && getInitialCategories().length === 0);
  const [isDataReady, setIsDataReady] = useState(isCacheValid(categoriesCache) || getInitialCategories().length > 0);
  const [hasError, setHasError] = useState(false);
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  // Reset refs on mount
  useEffect(() => {
    mountedRef.current = true;
    isFetchingRef.current = false;
    
    return () => {
      mountedRef.current = false;
      isFetchingRef.current = false;
    };
  }, []);

  const fetchCategories = useCallback(async (): Promise<boolean> => {
    // Check in-memory cache first
    if (isCacheValid(categoriesCache)) {
      console.log('✅ [DataContext] Using cached categories:', categoriesCache!.data.length);
      if (mountedRef.current) {
        setCategories(categoriesCache!.data);
      }
      return true;
    }

    // Prevent duplicate fetches
    if (isFetchingRef.current) {
      console.log('⏳ [DataContext] Categories fetch already in progress');
      return false;
    }
    isFetchingRef.current = true;

    const startTime = Date.now();

    try {
      console.log('🔍 [DataContext] Fetching categories from DB...');
      
      // Use withTimeoutAutoAbort to guarantee the promise resolves/rejects
      const { data: result, timedOut, error: timeoutError } = await withTimeoutAutoAbort(
        async (signal) => {
          return supabase
            .from('categories')
            .select('id, name, name_ar, image_url, is_active, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .abortSignal(signal);
        },
        { timeoutMs: FETCH_TIMEOUT_MS, operationName: 'fetchCategories' }
      );

      // Handle timeout - use cache fallback
      if (timedOut) {
        console.warn('⏱️ [DataContext] Categories fetch timed out');
        const lsCache = getCachedCategories();
        if (lsCache && lsCache.length > 0) {
          console.log('💾 [DataContext] Using localStorage fallback after timeout');
          if (mountedRef.current) {
            setCategories(lsCache);
          }
          return true;
        }
        if (mountedRef.current) {
          setHasError(true);
        }
        return false;
      }

      const { data, error } = result || { data: null, error: timeoutError };
      if (error) throw error;

      const sortedCategories = (data || []).sort((a: Category, b: Category) => {
        const orderA = a.sort_order ?? 999;
        const orderB = b.sort_order ?? 999;
        return orderA - orderB;
      });

      // Update both in-memory and localStorage cache
      categoriesCache = { data: sortedCategories, timestamp: Date.now() };
      setCachedCategories(sortedCategories);
      
      if (mountedRef.current) {
        setCategories(sortedCategories);
        setHasError(false);
      }
      console.log(`✅ [DataContext] Categories loaded: ${sortedCategories.length} (${Date.now() - startTime}ms)`);
      return true;
    } catch (error) {
      console.error('❌ [DataContext] Error fetching categories:', error);
      
      // Try localStorage fallback on error
      const lsCache = getCachedCategories();
      if (lsCache && lsCache.length > 0) {
        console.log('💾 [DataContext] Using localStorage fallback for categories');
        if (mountedRef.current) {
          setCategories(lsCache);
        }
        return true;
      }
      
      if (mountedRef.current) {
        setHasError(true);
      }
      return false;
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Fetch layout config (deferred, non-blocking) with timeout
  const fetchLayoutConfig = useCallback(async () => {
    if (isCacheValid(layoutConfigCache)) {
      if (mountedRef.current) {
        setLayoutConfig(layoutConfigCache!.data);
      }
      return;
    }

    try {
      const { data: result, timedOut } = await withTimeoutAutoAbort(
        async (signal) => {
          return supabase
            .from('category_layout_config')
            .select('*')
            .eq('country_id', COUNTRY_ID)
            .limit(1)
            .abortSignal(signal)
            .maybeSingle();
        },
        { timeoutMs: 6000, operationName: 'fetchLayoutConfig' }
      );

      if (timedOut || !result?.data) {
        layoutConfigCache = { data: DEFAULT_LAYOUT_CONFIG, timestamp: Date.now() };
        return;
      }

      layoutConfigCache = { data: result.data, timestamp: Date.now() };
      if (mountedRef.current) {
        setLayoutConfig(result.data);
      }
    } catch (error) {
      console.error('❌ [DataContext] Error fetching layout config:', error);
      layoutConfigCache = { data: DEFAULT_LAYOUT_CONFIG, timestamp: Date.now() };
    }
  }, []);

  // Fetch site config (deferred, non-blocking) with timeout
  const fetchSiteConfig = useCallback(async () => {
    if (isCacheValid(siteConfigCache)) {
      if (mountedRef.current) {
        setSiteConfig(siteConfigCache!.data);
      }
      return;
    }

    try {
      const { data: result, timedOut } = await withTimeoutAutoAbort(
        async (signal) => {
          return supabase
            .from('site_config')
            .select('id, vat_enabled, vat_percentage, currency_code, currency_symbol')
            .eq('is_active', true)
            .eq('country_code', COUNTRY_ID)
            .limit(1)
            .abortSignal(signal)
            .maybeSingle();
        },
        { timeoutMs: 6000, operationName: 'fetchSiteConfig' }
      );

      if (timedOut || !result?.data) {
        siteConfigCache = { data: DEFAULT_SITE_CONFIG, timestamp: Date.now() };
        return;
      }

      siteConfigCache = { data: result.data, timestamp: Date.now() };
      if (mountedRef.current) {
        setSiteConfig(result.data);
      }
    } catch (error) {
      console.error('❌ [DataContext] Error fetching site config:', error);
      siteConfigCache = { data: DEFAULT_SITE_CONFIG, timestamp: Date.now() };
    }
  }, []);

  const initializeData = useCallback(async () => {
    const startTime = Date.now();
    
    // If we already have categories (from cache), mark ready immediately
    if (categories.length > 0) {
      if (mountedRef.current) {
        setIsDataReady(true);
        setIsLoading(false);
        setHasError(false);
        setLoadingTooLong(false);
      }
      // Still fetch fresh data in background
      fetchCategories();
      // Defer secondary data even more
      setTimeout(() => {
        fetchLayoutConfig();
        fetchSiteConfig();
      }, 100);
      return;
    }

    if (mountedRef.current) {
      setIsLoading(true);
      setHasError(false);
      setLoadingTooLong(false);
    }

    // Set up "loading too long" warning
    const slowLoadingTimeout = setTimeout(() => {
      if (mountedRef.current && !isCacheValid(categoriesCache)) {
        setLoadingTooLong(true);
      }
    }, SLOW_LOADING_THRESHOLD_MS);

    try {
      // PRIORITY 1: Fetch categories FIRST (most important for UI)
      const categoriesSuccess = await fetchCategories();
      
      // Mark ready as soon as categories are loaded
      if (mountedRef.current) {
        setIsDataReady(true);
        setIsLoading(false);
        setLoadingTooLong(false);
        if (categoriesSuccess) {
          setHasError(false);
          retryCountRef.current = 0;
        }
      }
      
      console.log(`✅ [DataContext] Categories ready in ${Date.now() - startTime}ms`);
      
      // PRIORITY 2: Defer layout/site config (less critical)
      // Use requestIdleCallback if available, otherwise setTimeout
      const deferSecondaryFetch = () => {
        fetchLayoutConfig();
        fetchSiteConfig();
      };
      
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(deferSecondaryFetch, { timeout: 2000 });
      } else {
        setTimeout(deferSecondaryFetch, 100);
      }
      
    } catch (error) {
      console.error('❌ [DataContext] Error initializing data:', error);
      if (mountedRef.current) {
        setHasError(true);
        setIsDataReady(true);
        setIsLoading(false);
      }
    } finally {
      clearTimeout(slowLoadingTimeout);
    }
  }, [categories.length, fetchCategories, fetchLayoutConfig, fetchSiteConfig]);

  // Initialize on mount
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  const refreshCategories = useCallback(async () => {
    categoriesCache = null;
    isFetchingRef.current = false;
    await fetchCategories();
  }, [fetchCategories]);

  const retryLoading = useCallback(() => {
    retryCountRef.current += 1;
    console.log(`🔄 [DataContext] Manual retry #${retryCountRef.current}`);
    
    categoriesCache = null;
    layoutConfigCache = null;
    siteConfigCache = null;
    isFetchingRef.current = false;
    
    initializeData();
  }, [initializeData]);

  return (
    <DataContext.Provider value={{
      categories,
      layoutConfig,
      siteConfig,
      isDataReady,
      isLoading,
      hasError,
      loadingTooLong,
      refreshCategories,
      retryLoading
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  const context = useContext(DataContext);
  if (!context) {
    // Return safe defaults instead of throwing to prevent React Error #310
    console.warn('[DataContext] Hook used outside provider, returning defaults');
    return {
      categories: [],
      layoutConfig: null,
      siteConfig: null,
      isDataReady: false,
      isLoading: true,
      hasError: false,
      loadingTooLong: false,
      refreshCategories: async () => {},
      retryLoading: () => {}
    };
  }
  return context;
}
