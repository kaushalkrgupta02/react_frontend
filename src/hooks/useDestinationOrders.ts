import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAIPrepEstimate } from '@/hooks/useAIPrepEstimate';
import { playNewOrderSound, isAudioMuted, setAudioMuted } from '@/lib/audioFeedback';
import type { 
  GroupedOrder, 
  OrderItem, 
  DestinationType 
} from '@/components/venue-mode/pos/destination-display/types';

interface UseDestinationOrdersOptions {
  venueId: string;
  destination: DestinationType;
  autoRefreshInterval?: number;
}

interface UseDestinationOrdersReturn {
  orders: GroupedOrder[];
  loading: boolean;
  updating: string | null;
  isMuted: boolean;
  lastRefresh: Date;
  fetchOrders: () => Promise<void>;
  updateItemStatus: (itemId: string, newStatus: 'preparing' | 'ready' | 'served') => Promise<void>;
  toggleMute: () => void;
  getEstimateForItem: (itemName: string) => number | undefined;
}

export function useDestinationOrders({
  venueId,
  destination,
  autoRefreshInterval = 30000,
}: UseDestinationOrdersOptions): UseDestinationOrdersReturn {
  const [orders, setOrders] = useState<GroupedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(isAudioMuted());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const previousOrderCountRef = useRef(0);

  const { getEstimates, getEstimateForItem } = useAIPrepEstimate(destination);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('session_order_items')
        .select(`
          id,
          item_name,
          quantity,
          unit_price,
          notes,
          modifiers,
          status,
          created_at,
          served_at,
          destination,
          session_order_id,
          menu_item_id,
          session_order:session_orders!inner(
            id,
            order_number,
            session:table_sessions!inner(
              id,
              venue_id,
              table_id,
              guest_name,
              table:venue_tables(table_number)
            )
          )
        `)
        .eq('destination', destination)
        .in('status', ['pending', 'preparing', 'ready'])
        .eq('session_order.session.venue_id', venueId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      // Group items by order
      const orderMap = new Map<string, GroupedOrder>();

      (data || []).forEach((item: any) => {
        const orderId = item.session_order.id;
        const tableSession = item.session_order.session;

        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, {
            orderId,
            orderNumber: item.session_order.order_number,
            tableNumber: tableSession?.table?.table_number || null,
            isWalkIn: !tableSession?.table_id,
            guestName: tableSession?.guest_name || null,
            createdAt: item.created_at,
            items: [],
          });
        }

        const orderItem: OrderItem = {
          id: item.id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          status: item.status,
          notes: item.notes,
          modifiers: item.modifiers as Record<string, unknown> | null,
          destination: item.destination,
          created_at: item.created_at,
          served_at: item.served_at,
          session_order_id: item.session_order_id,
          menu_item_id: item.menu_item_id,
        };

        orderMap.get(orderId)!.items.push(orderItem);
      });

      const groupedOrders = Array.from(orderMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Check for new orders and play sound
      const currentPendingCount = groupedOrders.reduce(
        (acc, order) => acc + order.items.filter((i) => i.status === 'pending').length,
        0
      );

      if (currentPendingCount > previousOrderCountRef.current && previousOrderCountRef.current > 0) {
        playNewOrderSound();
      }
      previousOrderCountRef.current = currentPendingCount;

      setOrders(groupedOrders);
      setLastRefresh(new Date());

      // Get AI estimates for pending items
      const pendingItems = groupedOrders.flatMap((order) =>
        order.items.filter((i) => i.status === 'pending')
      );
      
      if (pendingItems.length > 0) {
        getEstimates(
          pendingItems.map((item) => ({
            id: item.id,
            item_name: item.item_name,
            quantity: item.quantity,
            destination: destination,
          })),
          pendingItems.length
        );
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [venueId, destination, getEstimates]);

  // Set up realtime subscription and auto-refresh
  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel(`destination-${destination}-${venueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_order_items',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    const interval = setInterval(fetchOrders, autoRefreshInterval);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchOrders, destination, venueId, autoRefreshInterval]);

  const updateItemStatus = useCallback(
    async (itemId: string, newStatus: 'preparing' | 'ready' | 'served') => {
      setUpdating(itemId);
      try {
        const updateData: {
          status: 'preparing' | 'ready' | 'served';
          served_at?: string;
        } = { status: newStatus };

        if (newStatus === 'served') {
          updateData.served_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from('session_order_items')
          .update(updateData)
          .eq('id', itemId);

        if (error) {
          console.error('Error updating item status:', error);
          return;
        }

        await fetchOrders();
      } catch (error) {
        console.error('Error updating status:', error);
      } finally {
        setUpdating(null);
      }
    },
    [fetchOrders]
  );

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setAudioMuted(newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  return {
    orders,
    loading,
    updating,
    isMuted,
    lastRefresh,
    fetchOrders,
    updateItemStatus,
    toggleMute,
    getEstimateForItem,
  };
}
