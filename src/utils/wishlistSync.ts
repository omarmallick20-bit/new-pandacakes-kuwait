import { supabase } from '@/integrations/supabase/client';
import { WishlistItem, Cake } from '@/types';
import { retryWithBackoff } from './retryWithBackoff';

export interface DBWishlistItem {
  id: string;
  customer_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  product_description: string | null;
  base_price: number;
  category_id: string | null;
  created_at: string;
}

/**
 * Fetch wishlist from database for logged-in user
 */
export const fetchWishlistFromDB = async (userId: string): Promise<WishlistItem[]> => {
  try {
    const result = await retryWithBackoff(
      async () => {
        const { data, error } = await supabase
          .from('wishlist_items')
          .select('*')
          .eq('customer_id', userId);
        
        if (error) throw error;
        return data;
      },
      { operationName: 'fetchWishlistFromDB' }
    );

    return (result || []).map(dbItem => transformDBToWishlistItem(dbItem));
  } catch (error) {
    console.error('Error fetching wishlist from DB:', error);
    return [];
  }
};

/**
 * Sync local wishlist to database (replace strategy)
 */
export const syncWishlistToDB = async (
  userId: string,
  localWishlist: WishlistItem[]
): Promise<void> => {
  try {
    console.log('🔄 Syncing wishlist to DB for user:', userId);
    
    // Clear existing wishlist
    await retryWithBackoff(
      async () => {
        const { error } = await supabase
          .from('wishlist_items')
          .delete()
          .eq('customer_id', userId);
        if (error) throw error;
      },
      { operationName: 'clearWishlistBeforeSync' }
    );
    
    // Insert new items
    if (localWishlist.length > 0) {
      const dbItems = localWishlist.map(item => transformWishlistItemToDB(item, userId));
      
      await retryWithBackoff(
        async () => {
          const { error } = await supabase
            .from('wishlist_items')
            .insert(dbItems);
          if (error) throw error;
        },
        { operationName: 'syncWishlistToDB' }
      );
    }
    
    console.log('✅ Wishlist synced successfully');
  } catch (error) {
    console.error('❌ Error syncing wishlist to DB:', error);
    throw error;
  }
};

/**
 * Add single item to wishlist in database
 */
export const addToWishlistDB = async (userId: string, item: WishlistItem): Promise<void> => {
  try {
    const dbItem = transformWishlistItemToDB(item, userId);
    
    await retryWithBackoff(
      async () => {
        const { error } = await supabase
          .from('wishlist_items')
          .upsert(dbItem, { onConflict: 'customer_id,product_id' });
        if (error) throw error;
      },
      { operationName: 'addToWishlistDB' }
    );
  } catch (error) {
    console.error('Error adding to wishlist in DB:', error);
  }
};

/**
 * Remove single item from wishlist in database
 */
export const removeFromWishlistDB = async (userId: string, productId: string): Promise<void> => {
  try {
    await retryWithBackoff(
      async () => {
        const { error } = await supabase
          .from('wishlist_items')
          .delete()
          .eq('customer_id', userId)
          .eq('product_id', productId);
        if (error) throw error;
      },
      { operationName: 'removeFromWishlistDB' }
    );
  } catch (error) {
    console.error('Error removing from wishlist in DB:', error);
  }
};

/**
 * Clear entire wishlist from database
 */
export const clearWishlistInDB = async (userId: string): Promise<void> => {
  try {
    await retryWithBackoff(
      async () => {
        const { error } = await supabase
          .from('wishlist_items')
          .delete()
          .eq('customer_id', userId);
        if (error) throw error;
      },
      { operationName: 'clearWishlistInDB' }
    );
  } catch (error) {
    console.error('Error clearing wishlist in DB:', error);
  }
};

/**
 * Merge local wishlist with database wishlist
 */
export const mergeWishlists = (
  localWishlist: WishlistItem[],
  dbWishlist: WishlistItem[]
): WishlistItem[] => {
  const merged = new Map<string, WishlistItem>();
  
  // Add DB items first
  dbWishlist.forEach(item => {
    merged.set(item.cake.id, item);
  });
  
  // Add local items (will overwrite if exists, but that's fine for wishlist)
  localWishlist.forEach(item => {
    if (!merged.has(item.cake.id)) {
      merged.set(item.cake.id, item);
    }
  });
  
  return Array.from(merged.values());
};

/**
 * Transform WishlistItem to database format
 */
const transformWishlistItemToDB = (item: WishlistItem, userId: string): any => {
  return {
    customer_id: userId,
    product_id: item.cake.id,
    product_name: item.cake.name,
    product_image: item.cake.image,
    product_description: item.cake.description,
    base_price: item.cake.basePrice,
    category_id: item.cake.categoryId
  };
};

/**
 * Transform database format to WishlistItem
 */
const transformDBToWishlistItem = (dbItem: DBWishlistItem): WishlistItem => {
  const cake: Cake = {
    id: dbItem.product_id,
    name: dbItem.product_name,
    categoryId: dbItem.category_id || '',
    image: dbItem.product_image || '',
    description: dbItem.product_description || '',
    inches: [],
    layers: 1,
    servingSize: '',
    preparationTime: '',
    basePrice: dbItem.base_price
  };
  
  return {
    id: dbItem.id,
    cake,
    addedAt: new Date(dbItem.created_at)
  };
};
