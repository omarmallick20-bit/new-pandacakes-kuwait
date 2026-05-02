/**
 * Category caching utility to reduce database queries
 * Categories are cached in localStorage with a 5-minute TTL
 */

interface CachedCategories {
  data: any[];
  timestamp: number;
}

const CACHE_KEY = 'panda_cakes_categories_cache_v3';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

export const getCachedCategories = (): any[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp }: CachedCategories = JSON.parse(cached);
    
    // Check if cache is expired
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading category cache:', error);
    return null;
  }
};

export const setCachedCategories = (data: any[]): void => {
  try {
    const cacheData: CachedCategories = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error setting category cache:', error);
  }
};

export const clearCategoryCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing category cache:', error);
  }
};
