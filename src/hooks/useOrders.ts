import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { retryWithBackoff } from '@/utils/retryWithBackoff';

export interface OrderItem {
  id: string;
  product_name: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  customizations: any;
}

export interface OrderAddress {
  street_address: string;
  city: string;
  landmarks?: string;
  label?: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  payment_method: string;
  payment_status?: string;
  payment_amount?: number;
  payment_currency?: string;
  tap_charge_id?: string;
  tap_payment_reference?: string;
  original_amount?: number;
  voucher_discount_amount?: number;
  bakepoints_discount_amount?: number;
  delivery_fee?: number;
  customer_notes: string | null;
  estimated_delivery_time: string | null;
  created_at: string;
  updated_at: string;
  order_placed_at?: string;
  country_id: string;
  fulfillment_type?: string;
  addresses?: OrderAddress | null;
  order_items: OrderItem[];
}

export const useOrders = (limit: number = 10) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const { user, isAuthReady } = useAuth();

  const fetchOrders = async (isRetry = false, loadOffset = 0) => {
    // Wait for user authentication to be fully established
    if (!user?.id) {
      console.log('useOrders: No authenticated user, skipping fetch');
      setLoading(false);
      setError(null);
      setOrders([]);
      return;
    }

    try {
      setLoading(true);
      if (!isRetry) {
        setError(null);
      }

      console.log('🔍 Fetching orders - Auth State:', {
        userId: user.id,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
        retryAttempt: retryCount
      });

      // Fetch orders with pagination and retry logic
      const { data: ordersData, error: ordersError, count } = await retryWithBackoff(
        async () => supabase
          .from('orders')
        .select(`
            id,
            order_number,
            status,
            total_amount,
            payment_method,
            payment_status,
            payment_amount,
            payment_currency,
            tap_charge_id,
            tap_payment_reference,
            original_amount,
            voucher_discount_amount,
            bakepoints_discount_amount,
            delivery_fee,
            customer_notes,
            estimated_delivery_time,
            created_at,
            updated_at,
            order_placed_at,
            customer_id,
            country_id,
            fulfillment_type,
            addresses:delivery_address_id (
              street_address,
              city,
              landmarks,
              label
            ),
            order_items!order_items_order_id_fkey (
              id,
              product_name,
              product_id,
              quantity,
              unit_price,
              total_price,
              customizations
            )
          `, { count: 'exact' })
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
          .range(loadOffset, loadOffset + limit - 1),
        { operationName: 'fetchOrders', maxRetries: 2, initialDelayMs: 500 }
      );

      console.log('📊 Orders query result:', {
        error: ordersError,
        dataCount: ordersData?.length || 0,
        queryUserId: user.id,
        data: ordersData
      });

      if (ordersError) {
        console.error('❌ Orders fetch error:', {
          code: ordersError.code,
          message: ordersError.message,
          details: ordersError.details,
          hint: ordersError.hint
        });
        throw ordersError;
      }

      console.log('✅ Successfully fetched orders:', {
        count: ordersData?.length || 0,
        totalCount: count,
        orderIds: ordersData?.map(o => o.id) || []
      });
      
      // Append or replace orders based on offset
      if (loadOffset === 0) {
        setOrders(ordersData || []);
      } else {
        setOrders(prev => [...prev, ...(ordersData || [])]);
      }
      
      // Check if there are more orders to load
      setHasMore(ordersData && ordersData.length === limit);
      setOffset(loadOffset + (ordersData?.length || 0));
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('💥 Error fetching orders:', {
        error: err,
        userId: user.id,
        retryCount,
        errorType: err instanceof Error ? err.constructor.name : typeof err
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(errorMessage);
      
      // If it's an RLS error, provide more specific guidance
      if (errorMessage.includes('row-level security') || errorMessage.includes('RLS')) {
        setError('Unable to access your orders. Please try signing out and back in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const retryFetch = () => {
    setRetryCount(prev => prev + 1);
    fetchOrders(true, 0);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchOrders(false, offset);
    }
  };

  useEffect(() => {
    // Wait for auth to be fully ready before fetching
    if (!isAuthReady) {
      console.log('⏳ [useOrders] Waiting for auth to be ready...');
      return;
    }
    
    fetchOrders(false, 0);
  }, [user?.id, isAuthReady]); // Depend on both user.id and isAuthReady

  return {
    orders,
    loading,
    error,
    retryCount,
    hasMore,
    refetch: () => fetchOrders(false, 0),
    retryFetch,
    loadMore
  };
};