/**
 * Menu items caching utility to reduce database queries
 * Uses in-memory cache with 5-minute TTL for faster access
 */

interface CachedCategoryData {
  category: {
    id: string;
    name: string;
    image_url: string;
    is_active: boolean;
  } | null;
  items: any[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache (survives re-renders, cleared on page refresh)
const menuItemsCache = new Map<string, CachedCategoryData>();

export const getCachedMenuItems = (categoryId: string): any[] | null => {
  const cached = menuItemsCache.get(categoryId);
  
  if (!cached) return null;
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    menuItemsCache.delete(categoryId);
    return null;
  }
  
  console.log(`✅ [MenuItemsCache] Cache hit for category ${categoryId}`);
  return cached.items;
};

export const getCachedCategoryData = (categoryId: string): CachedCategoryData | null => {
  const cached = menuItemsCache.get(categoryId);
  
  if (!cached) return null;
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    menuItemsCache.delete(categoryId);
    return null;
  }
  
  return cached;
};

export const setCachedMenuItems = (categoryId: string, data: any[], category?: any): void => {
  menuItemsCache.set(categoryId, {
    category: category || null,
    items: data,
    timestamp: Date.now()
  });
  console.log(`💾 [MenuItemsCache] Cached ${data.length} items for category ${categoryId}`);
};

export const setCachedCategoryData = (categoryId: string, category: any, items: any[]): void => {
  menuItemsCache.set(categoryId, {
    category,
    items,
    timestamp: Date.now()
  });
  console.log(`💾 [MenuItemsCache] Cached category + ${items.length} items for ${categoryId}`);
};

export const clearMenuItemsCache = (categoryId?: string): void => {
  if (categoryId) {
    menuItemsCache.delete(categoryId);
    console.log(`🧹 [MenuItemsCache] Cleared cache for category ${categoryId}`);
  } else {
    menuItemsCache.clear();
    console.log('🧹 [MenuItemsCache] Cleared all menu items caches');
  }
};
