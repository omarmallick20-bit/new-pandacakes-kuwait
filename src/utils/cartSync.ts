import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/types';
import { retryWithBackoff } from './retryWithBackoff';

// Global flags to block cart revalidation during/after checkout
let isCheckoutComplete = false;
let isCheckoutModalOpen = false;

export const setCheckoutComplete = (value: boolean): void => {
  isCheckoutComplete = value;
  if (value) {
    sessionStorage.setItem('checkout_complete', 'true');
    console.log('🔒 Checkout complete flag SET - blocking cart revalidation');
  } else {
    sessionStorage.removeItem('checkout_complete');
    console.log('🔓 Checkout complete flag CLEARED');
  }
};

// Track when checkout modal is open - blocks DB revalidation to prevent cart clearing
export const setCheckoutModalOpen = (value: boolean): void => {
  isCheckoutModalOpen = value;
  if (value) {
    sessionStorage.setItem('checkout_modal_open', 'true');
    console.log('🛒 Checkout modal OPEN - blocking cart revalidation');
  } else {
    sessionStorage.removeItem('checkout_modal_open');
    console.log('🛒 Checkout modal CLOSED');
  }
};

export const isCheckoutInProgress = (): boolean => {
  // Block revalidation if checkout completed OR modal is currently open
  return isCheckoutComplete || 
         isCheckoutModalOpen || 
         sessionStorage.getItem('checkout_complete') === 'true' ||
         sessionStorage.getItem('checkout_modal_open') === 'true';
};

export const resetCheckoutFlag = (): void => {
  isCheckoutComplete = false;
  sessionStorage.removeItem('checkout_complete');
};

export const resetCheckoutModalFlag = (): void => {
  isCheckoutModalOpen = false;
  sessionStorage.removeItem('checkout_modal_open');
};

export interface DBCartItem {
  id: string;
  customer_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  customizations: any;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch cart from database for logged-in user
 */
export const fetchCartFromDB = async (userId: string): Promise<CartItem[]> => {
  try {
    const result = await retryWithBackoff(
      async () => {
        const { data, error } = await supabase
          .from('cart_items')
          .select('*')
          .eq('customer_id', userId);
        
        if (error) throw error;
        return data;
      },
      { operationName: 'fetchCartFromDB' }
    );

    return (result || []).map(dbItem => transformDBToCartItem(dbItem));
  } catch (error) {
    console.error('Error fetching cart from DB:', error);
    return [];
  }
};

/**
 * Sync local cart to database
 * @param replaceMode - If true (default), replaces DB cart with local cart. If false, merges them (used on sign-in).
 */
export const syncCartToDB = async (
  userId: string,
  localCart: CartItem[],
  existingDbCart?: CartItem[],
  replaceMode: boolean = true
): Promise<void> => {
  try {
    console.log('🔄 Syncing cart to DB for user:', userId, { replaceMode });
    
    let finalCart: CartItem[];
    
    if (replaceMode) {
      finalCart = localCart;
    } else {
      const dbCart = existingDbCart || await fetchCartFromDB(userId);
      finalCart = mergeCart(localCart, dbCart);
    }
    
    // ATOMIC SYNC: selective delete + upsert instead of delete-all + insert
    // This prevents the window where DB has 0 items
    
    // Get current DB item IDs
    const { data: currentItems } = await supabase
      .from('cart_items')
      .select('id, product_id')
      .eq('customer_id', userId);
    
    const currentIds = new Set((currentItems || []).map(item => item.id));
    const finalIds = new Set(finalCart.filter(item => item.id).map(item => item.id));
    
    // Delete items that are NOT in the final cart
    const idsToDelete = [...currentIds].filter(id => !finalIds.has(id));
    if (idsToDelete.length > 0) {
      await retryWithBackoff(
        async () => {
          const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('customer_id', userId)
            .in('id', idsToDelete);
          if (error) throw error;
        },
        { operationName: 'deleteRemovedCartItems' }
      );
    }
    
    // Upsert items that ARE in the final cart
    if (finalCart.length > 0) {
      const dbItems = finalCart.map(item => {
        const transformed = transformCartItemToDB(item, userId);
        // Keep existing ID if it's already in DB, otherwise let DB generate
        if (item.id && currentIds.has(item.id)) {
          transformed.id = item.id;
        }
        return transformed;
      });
      
      await retryWithBackoff(
        async () => {
          const { error } = await supabase
            .from('cart_items')
            .upsert(dbItems, { onConflict: 'id' });
          if (error) throw error;
        },
        { operationName: 'upsertCartItems' }
      );
    }
    
    console.log('✅ Cart synced successfully (atomic)');
  } catch (error) {
    console.error('❌ Error syncing cart to DB:', error);
    throw error;
  }
};

/**
 * Clear entire cart from database
 */
export const clearCartInDB = async (userId: string): Promise<void> => {
  try {
    await retryWithBackoff(
      async () => {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('customer_id', userId);
        if (error) throw error;
      },
      { operationName: 'clearCartInDB' }
    );
  } catch (error) {
    console.error('Error clearing cart in DB:', error);
  }
};

/**
 * Delete a specific cart item from database immediately (no debounce)
 * Used for delete actions to ensure instant sync
 */
export const deleteCartItemFromDB = async (userId: string, itemId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('customer_id', userId)
      .eq('id', itemId);
    
    if (error) throw error;
    console.log('✅ Cart item deleted from DB immediately:', itemId);
  } catch (error) {
    console.error('❌ Error deleting cart item from DB:', error);
    throw error;
  }
};

/**
 * Clear cart from localStorage immediately (no debounce)
 * Clears both user-specific and anonymous storage
 */
export const clearCartFromLocalStorage = (userId?: string): void => {
  const STORAGE_KEYS = {
    ANONYMOUS_DATA: 'panda_cakes_data',
    USER_DATA_PREFIX: 'panda_cakes_user_'
  };
  
  try {
    // Clear user-specific storage
    if (userId) {
      const userKey = `${STORAGE_KEYS.USER_DATA_PREFIX}${userId}`;
      const userStored = localStorage.getItem(userKey);
      if (userStored) {
        const userData = JSON.parse(userStored);
        userData.cart = [];
        userData.lastUpdated = Date.now();
        localStorage.setItem(userKey, JSON.stringify(userData));
        console.log('✅ Cleared user localStorage cart:', userKey);
      }
    }
    
    // Also clear anonymous storage to prevent any leftover data
    const anonStored = localStorage.getItem(STORAGE_KEYS.ANONYMOUS_DATA);
    if (anonStored) {
      const anonData = JSON.parse(anonStored);
      anonData.cart = [];
      anonData.lastUpdated = Date.now();
      localStorage.setItem(STORAGE_KEYS.ANONYMOUS_DATA, JSON.stringify(anonData));
      console.log('✅ Cleared anonymous localStorage cart');
    }
  } catch (error) {
    console.error('Error clearing localStorage cart:', error);
  }
};

/**
 * Merge local cart with database cart (smart merge)
 */
const mergeCart = (localCart: CartItem[], dbCart: CartItem[]): CartItem[] => {
  const merged = new Map<string, CartItem>();
  
  dbCart.forEach(item => {
    const key = getCartItemKey(item);
    merged.set(key, item);
  });
  
  localCart.forEach(item => {
    const key = getCartItemKey(item);
    const existing = merged.get(key);
    
    if (existing) {
      if (item.quantity > existing.quantity) {
        merged.set(key, item);
      }
    } else {
      merged.set(key, item);
    }
  });
  
  return Array.from(merged.values());
};

/**
 * Generate unique key for cart item comparison
 */
const getCartItemKey = (item: CartItem): string => {
  return `${item.cake.id}_${item.flavor}_${item.variant}`;
};

/**
 * Transform CartItem to database format
 */
const transformCartItemToDB = (item: CartItem, userId: string): any => {
  return {
    customer_id: userId,
    product_id: item.cake.id,
    product_name: item.cake.name,
    quantity: item.quantity,
    unit_price: item.price,
    customizations: {
      flavor: item.flavor,
      variant: item.variant,
      specialInstructions: item.specialInstructions,
      custom_selections: item.customizations?.custom_selections,
      total_variant_price: item.customizations?.total_variant_price,
      cakeImage: item.cake.image,
      cakeCategory: item.cake.categoryId,
      cakeDescription: item.cake.description,
      cakeInches: item.cake.inches,
      cakeLayers: item.cake.layers,
      cakeServingSize: item.cake.servingSize,
      cakePreparationTime: item.cake.preparationTime,
      cakeBasePrice: item.cake.basePrice,
      // Store item discount info
      originalPrice: item.originalPrice,
      itemDiscount: item.itemDiscount
    }
  };
};

/**
 * Transform database format to CartItem
 */
const transformDBToCartItem = (dbItem: DBCartItem): CartItem => {
  const custom = dbItem.customizations || {};
  
  return {
    id: dbItem.id,
    cake: {
      id: dbItem.product_id,
      name: dbItem.product_name,
      categoryId: custom.cakeCategory || '',
      image: custom.cakeImage || '',
      description: custom.cakeDescription || '',
      inches: custom.cakeInches || [],
      layers: custom.cakeLayers || 1,
      servingSize: custom.cakeServingSize || '',
      preparationTime: custom.cakePreparationTime || '',
      basePrice: custom.cakeBasePrice || dbItem.unit_price
    },
    flavor: custom.flavor || '',
    variant: custom.variant || '',
    specialInstructions: custom.specialInstructions,
    quantity: dbItem.quantity,
    price: dbItem.unit_price,
    originalPrice: custom.originalPrice,
    itemDiscount: custom.itemDiscount,
    customizations: custom.custom_selections ? {
      custom_selections: custom.custom_selections,
      total_variant_price: custom.total_variant_price || 0,
      specialInstructions: custom.specialInstructions
    } : undefined
  };
};
