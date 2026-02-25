import React, { createContext, useContext, useReducer, ReactNode, useEffect, useRef } from 'react';
import { CartItem, Order, WishlistItem } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { syncCartToDB, fetchCartFromDB, clearCartInDB, isCheckoutInProgress } from '@/utils/cartSync';
import { syncWishlistToDB, fetchWishlistFromDB, clearWishlistInDB, mergeWishlists } from '@/utils/wishlistSync';
import { useAuth } from '@/contexts/AuthContext';

interface AppState {
  cart: CartItem[];
  wishlist: WishlistItem[];
  orders: Order[];
  isHydrated: boolean;
}

interface PersistedData {
  cart: CartItem[];
  wishlist: WishlistItem[];
  lastUpdated: number;
  userId?: string;
}

type AppAction =
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'ADD_TO_WISHLIST'; payload: WishlistItem }
  | { type: 'REMOVE_FROM_WISHLIST'; payload: string }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'LOAD_PERSISTED_DATA'; payload: { cart: CartItem[]; wishlist: WishlistItem[] } }
  | { type: 'SET_HYDRATED'; payload: boolean };

const initialState: AppState = {
  cart: [],
  wishlist: [],
  orders: [],
  isHydrated: false
};

// Storage utilities
const STORAGE_KEYS = {
  ANONYMOUS_DATA: 'panda_cakes_data',
  USER_DATA_PREFIX: 'panda_cakes_user_'
};

const CART_TIMEOUT_HOURS = 24;

const getStorageKey = (userId?: string): string => {
  return userId ? `${STORAGE_KEYS.USER_DATA_PREFIX}${userId}` : STORAGE_KEYS.ANONYMOUS_DATA;
};

const saveToStorage = (data: PersistedData, userId?: string): void => {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

const loadFromStorage = (userId?: string): PersistedData | null => {
  try {
    const key = getStorageKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const data: PersistedData = JSON.parse(stored);
    
    const now = Date.now();
    const hoursElapsed = (now - data.lastUpdated) / (1000 * 60 * 60);
    
    if (hoursElapsed > CART_TIMEOUT_HOURS) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

const clearStorage = (userId?: string): void => {
  try {
    const key = getStorageKey(userId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_PERSISTED_DATA':
      return {
        ...state,
        cart: action.payload.cart,
        wishlist: action.payload.wishlist,
        isHydrated: true
      };

    case 'SET_HYDRATED':
      return {
        ...state,
        isHydrated: action.payload
      };
    case 'ADD_TO_CART':
      // Helper function to check if custom selections are identical
      const areCustomSelectionsEqual = (
        a: CartItem['customizations'],
        b: CartItem['customizations']
      ): boolean => {
        if (!a && !b) return true;
        if (!a || !b) return false;
        return JSON.stringify(a.custom_selections) === JSON.stringify(b.custom_selections);
      };

      const existingItem = state.cart.find(item => 
        item.cake.id === action.payload.cake.id && 
        item.flavor === action.payload.flavor && 
        item.variant === action.payload.variant &&
        areCustomSelectionsEqual(item.customizations, action.payload.customizations)
      );
      
      if (existingItem) {
        const newQuantity = Math.min(5, existingItem.quantity + action.payload.quantity);
        return {
          ...state,
          cart: state.cart.map(item =>
            item.id === existingItem.id
              ? { ...item, quantity: newQuantity }
              : item
          )
        };
      }
      
      return {
        ...state,
        cart: [...state.cart, { ...action.payload, quantity: Math.min(5, action.payload.quantity) }]
      };

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter(item => item.id !== action.payload)
      };

    case 'UPDATE_CART_QUANTITY':
      return {
        ...state,
        cart: state.cart.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.min(5, Math.max(1, action.payload.quantity)) }
            : item
        )
      };

    case 'CLEAR_CART':
      return {
        ...state,
        cart: []
      };

    case 'ADD_TO_WISHLIST':
      return {
        ...state,
        wishlist: [...state.wishlist, action.payload]
      };

    case 'REMOVE_FROM_WISHLIST':
      return {
        ...state,
        wishlist: state.wishlist.filter(item => item.id !== action.payload)
      };

    case 'ADD_ORDER':
      return {
        ...state,
        orders: [...state.orders, action.payload]
      };

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const isSyncingRef = useRef(false);
  const hasLoadedFromDBRef = useRef(false); // Prevents immediate DB sync after hydration
  const userChangedDataRef = useRef(false); // Only sync when user actually changes data
  const { isLoading: authLoading, user, isAuthReady } = useAuth();

  // STALE-WHILE-REVALIDATE: Load localStorage IMMEDIATELY, then revalidate from DB in background
  useEffect(() => {
    if (authLoading || !isAuthReady) {
      console.log('[AppContext] Waiting for auth to be ready...');
      return;
    }
    
    const userId = user?.id;
    
    // GUARD: If already loaded from DB for this user, skip revalidation
    if (hasLoadedFromDBRef.current && userId) {
      console.log('[AppContext] Already loaded from DB, skipping revalidation');
      return;
    }
    
    const startTime = Date.now();
    
    // STEP 1: Load from localStorage IMMEDIATELY (synchronous, fast)
    const localData = loadFromStorage(userId);
    if (localData?.cart || localData?.wishlist) {
      console.log(`[AppContext] Instant load from localStorage - Cart: ${localData.cart?.length || 0}, Wishlist: ${localData.wishlist?.length || 0}`);
      dispatch({ 
        type: 'LOAD_PERSISTED_DATA', 
        payload: { 
          cart: localData.cart || [], 
          wishlist: localData.wishlist || [] 
        }
      });
    } else {
      dispatch({ type: 'SET_HYDRATED', payload: true });
    }
    
    // STEP 2: For logged-in users, revalidate from DB in BACKGROUND (non-blocking)
    if (userId) {
      // Defer DB fetch to not compete with categories
      const timeoutId = setTimeout(async () => {
        // CHECK: Don't revalidate if checkout just completed - cart was intentionally cleared
        if (isCheckoutInProgress()) {
          console.log('[AppContext] Skipping DB revalidation - checkout complete');
          hasLoadedFromDBRef.current = true;
          return;
        }
        
        try {
          console.log('[AppContext] Background DB revalidation starting...');
          const [dbCart, dbWishlist] = await Promise.all([
            fetchCartFromDB(userId),
            fetchWishlistFromDB(userId)
          ]);
          
          console.log(`[AppContext] DB revalidation complete - Cart: ${dbCart.length}, Wishlist: ${dbWishlist.length} (${Date.now() - startTime}ms)`);
          
          const hasDbData = dbCart.length > 0 || dbWishlist.length > 0;
          // Use ref-based check: read current cart length from prevCartRef (always up-to-date)
          const currentCartLength = prevCartRef.current.length;
          const currentWishlistLength = prevWishlistRef.current.length;
          const localHasData = currentCartLength > 0 || currentWishlistLength > 0;
          
          if (hasDbData) {
            // DB has data -- use it as source of truth
            hasLoadedFromDBRef.current = true;
            dispatch({ 
              type: 'LOAD_PERSISTED_DATA', 
              payload: { cart: dbCart, wishlist: dbWishlist }
            });
          } else if (!localHasData) {
            // Both empty -- that's fine
            hasLoadedFromDBRef.current = true;
          } else {
            // HYDRATION GUARD: Local has data but DB is empty -- trust local, sync to DB
            // This prevents clearing a user's cart when DB hasn't synced yet
            console.log(`[AppContext] DB empty but local has ${currentCartLength} cart items -- keeping local, syncing to DB`);
            hasLoadedFromDBRef.current = true;
            userChangedDataRef.current = true; // Trigger sync to write local data to DB
          }
        } catch (error) {
          console.warn('[AppContext] Background DB fetch failed, using local data:', error);
          hasLoadedFromDBRef.current = true; // Don't block further operations
        }
      }, 500); // 500ms delay to let categories load first
      
      return () => clearTimeout(timeoutId);
    }
  }, [authLoading, isAuthReady, user?.id]);

  // Track when user actually changes data (not just hydration)
  const prevCartRef = useRef<CartItem[]>([]);
  const prevWishlistRef = useRef<WishlistItem[]>([]);
  
  useEffect(() => {
    if (!state.isHydrated) return;
    
    // Detect if this is a user change vs hydration
    const cartChanged = JSON.stringify(prevCartRef.current) !== JSON.stringify(state.cart);
    const wishlistChanged = JSON.stringify(prevWishlistRef.current) !== JSON.stringify(state.wishlist);
    
    if ((cartChanged || wishlistChanged) && prevCartRef.current.length > 0) {
      userChangedDataRef.current = true;
    }
    
    prevCartRef.current = state.cart;
    prevWishlistRef.current = state.wishlist;
  }, [state.cart, state.wishlist, state.isHydrated]);

  // IMMEDIATE localStorage save (no debounce)
  useEffect(() => {
    if (!state.isHydrated) return;

    const userId = user?.id;
    
    try {
      const dataToSave: PersistedData = {
        cart: state.cart,
        wishlist: state.wishlist,
        lastUpdated: Date.now(),
        userId
      };
      saveToStorage(dataToSave, userId);
    } catch (error) {
      console.error('[AppContext] Failed to save to localStorage:', error);
    }
  }, [state.cart, state.wishlist, state.isHydrated, user?.id]);

  // DEBOUNCED database sync - ONLY when user changes data, NOT after hydration
  useEffect(() => {
    if (!state.isHydrated) return;
    
    const userId = user?.id;
    if (!userId) return;
    
    // CRITICAL: Don't sync immediately after loading from DB
    // Only sync when user has made actual changes
    if (!userChangedDataRef.current) {
      return;
    }

    const debounceTimeout = setTimeout(() => {
      if (isSyncingRef.current) return;
      
      isSyncingRef.current = true;
      userChangedDataRef.current = false; // Reset after syncing
      
      const syncWithTimeout = async () => {
        const timeoutPromise = new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Sync timeout')), 5000)
        );
        
        const syncPromise = Promise.all([
          syncCartToDB(userId, state.cart),
          syncWishlistToDB(userId, state.wishlist)
        ]).then(() => {
          console.log('[AppContext] Data synced to DB');
        });
        
        try {
          await Promise.race([syncPromise, timeoutPromise]);
        } catch (error: any) {
          if (error.message === 'Sync timeout') {
            console.warn('[AppContext] Sync timed out');
          } else {
            console.error('[AppContext] Error syncing data:', error);
          }
        } finally {
          isSyncingRef.current = false;
        }
      };
      
      syncWithTimeout();
    }, 1500); // Increased debounce to 1.5s

    return () => clearTimeout(debounceTimeout);
  }, [state.cart, state.wishlist, state.isHydrated, user?.id]);

  // Flush localStorage on page unload
  useEffect(() => {
    const flushToStorage = () => {
      if (!state.isHydrated) return;
      const userId = user?.id;
      try {
        const dataToSave: PersistedData = {
          cart: state.cart,
          wishlist: state.wishlist,
          lastUpdated: Date.now(),
          userId
        };
        saveToStorage(dataToSave, userId);
      } catch (error) {
        console.error('[AppContext] Failed to flush to localStorage:', error);
      }
    };

    window.addEventListener('beforeunload', flushToStorage);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushToStorage();
    });

    return () => {
      window.removeEventListener('beforeunload', flushToStorage);
    };
  }, [state.cart, state.wishlist, state.isHydrated, user?.id]);

  // Listen for auth state changes - OPTIMIZED to reduce DB calls
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AppContext] Auth event:', event, 'User:', session?.user?.id);
        
        // Handle sign in - merge guest data with DB
        if (event === 'SIGNED_IN' && session?.user?.id && !isSyncingRef.current) {
          const guestData = loadFromStorage();
          const guestCart = guestData?.cart || [];
          const guestWishlist = guestData?.wishlist || [];
          
          // OPTIMIZATION: Skip if no guest data to merge
          if (guestCart.length === 0 && guestWishlist.length === 0) {
            console.log('[AppContext] No guest data to merge, skipping');
            
            // CRITICAL: Don't reload from DB if checkout is in progress
            if (isCheckoutInProgress()) {
              console.log('[AppContext] Skipping auth reload - checkout in progress');
              return;
            }
            
            // Just fetch user's DB data
            setTimeout(async () => {
              try {
                const [dbCart, dbWishlist] = await Promise.all([
                  fetchCartFromDB(session.user.id),
                  fetchWishlistFromDB(session.user.id)
                ]);
                hasLoadedFromDBRef.current = true;
                dispatch({ 
                  type: 'LOAD_PERSISTED_DATA', 
                  payload: { cart: dbCart, wishlist: dbWishlist }
                });
                // Log restoration for debugging
                if (dbWishlist.length > 0 || dbCart.length > 0) {
                  console.log(`✅ Restored from account - Cart: ${dbCart.length} items, Wishlist: ${dbWishlist.length} items`);
                }
              } catch (error) {
                console.error('[AppContext] Error loading user data:', error);
              }
            }, 300);
            return;
          }
          
          console.log('[AppContext] Merging guest data - Cart:', guestCart.length, 'Wishlist:', guestWishlist.length);
          isSyncingRef.current = true;
          
          (async () => {
            try {
              // Fetch DB data
              const [dbCart, dbWishlist] = await Promise.all([
                fetchCartFromDB(session.user.id),
                fetchWishlistFromDB(session.user.id)
              ]);
              
              // Merge and sync
              if (guestCart.length > 0) {
                await syncCartToDB(session.user.id, guestCart, dbCart, false);
              }
              if (guestWishlist.length > 0) {
                const mergedWishlist = mergeWishlists(guestWishlist, dbWishlist);
                await syncWishlistToDB(session.user.id, mergedWishlist);
              }
              
              // Fetch final merged data
              const [mergedCart, mergedWishlist] = await Promise.all([
                fetchCartFromDB(session.user.id),
                fetchWishlistFromDB(session.user.id)
              ]);
              
              hasLoadedFromDBRef.current = true;
              dispatch({ 
                type: 'LOAD_PERSISTED_DATA', 
                payload: { cart: mergedCart, wishlist: mergedWishlist }
              });
              
              // Clear guest data
              clearStorage();
              console.log('[AppContext] Guest data merged and cleared');
              
            } catch (error) {
              console.error('[AppContext] Error merging data:', error);
            } finally {
              isSyncingRef.current = false;
            }
          })();
          
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 [AppContext] User signed out');
          
          dispatch({ type: 'CLEAR_CART' });
          dispatch({ 
            type: 'LOAD_PERSISTED_DATA', 
            payload: { cart: [], wishlist: [] }
          });
          
          clearStorage();
          hasLoadedFromDBRef.current = false;
          userChangedDataRef.current = false;
          
          console.log('✅ [AppContext] Sign out complete');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    // Return safe defaults instead of throwing to prevent React Error #310
    console.warn('[AppContext] Hook used outside provider, returning defaults');
    return {
      state: {
        cart: [],
        wishlist: [],
        orders: [],
        isHydrated: false
      },
      dispatch: () => {}
    };
  }
  return context;
}
