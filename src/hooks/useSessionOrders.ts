import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrderItem {
  menu_item_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  modifiers?: any[];
  notes?: string;
  destination?: string;
}

interface CreateOrderParams {
  session_id: string;
  items: OrderItem[];
  notes?: string;
}

export function useSessionOrders(sessionId: string | null) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createOrder = async (params: CreateOrderParams): Promise<string | null> => {
    setIsSubmitting(true);
    try {
      // Get next order number
      const { data: existingOrders } = await supabase
        .from('session_orders')
        .select('order_number')
        .eq('session_id', params.session_id)
        .order('order_number', { ascending: false })
        .limit(1);

      const nextOrderNumber = existingOrders && existingOrders.length > 0 
        ? existingOrders[0].order_number + 1 
        : 1;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('session_orders')
        .insert({
          session_id: params.session_id,
          order_number: nextOrderNumber,
          notes: params.notes || null,
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = params.items.map(item => ({
        session_order_id: order.id,
        menu_item_id: item.menu_item_id || null,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        modifiers: item.modifiers || [],
        notes: item.notes || null,
        destination: item.destination || 'kitchen',
        status: 'pending' as const
      }));

      const { error: itemsError } = await supabase
        .from('session_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success(`Order #${nextOrderNumber} sent`);
      return order.id;
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to submit order');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateItemStatus = async (
    itemId: string, 
    status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
  ) => {
    try {
      const updates: any = { status };
      if (status === 'served') {
        updates.served_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('session_order_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating item status:', error);
      toast.error('Failed to update item');
      return false;
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled'
  ) => {
    try {
      const { error } = await supabase
        .from('session_orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order');
      return false;
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      // Cancel all items first
      await supabase
        .from('session_order_items')
        .update({ status: 'cancelled' })
        .eq('session_order_id', orderId);

      // Cancel the order
      const { error } = await supabase
        .from('session_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order cancelled');
      return true;
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
      return false;
    }
  };

  const addItemsToOrder = async (orderId: string, items: OrderItem[]): Promise<boolean> => {
    try {
      const orderItems = items.map(item => ({
        session_order_id: orderId,
        menu_item_id: item.menu_item_id || null,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        modifiers: item.modifiers || [],
        notes: item.notes || null,
        destination: item.destination || 'kitchen',
        status: 'pending' as const
      }));

      const { error } = await supabase
        .from('session_order_items')
        .insert(orderItems);

      if (error) throw error;

      toast.success('Items added to order');
      return true;
    } catch (error) {
      console.error('Error adding items:', error);
      toast.error('Failed to add items');
      return false;
    }
  };

  const updateItemQuantity = async (itemId: string, quantity: number): Promise<boolean> => {
    try {
      if (quantity <= 0) {
        const { error } = await supabase
          .from('session_order_items')
          .delete()
          .eq('id', itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('session_order_items')
          .update({ quantity })
          .eq('id', itemId);
        if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error('Error updating item quantity:', error);
      toast.error('Failed to update quantity');
      return false;
    }
  };

  const deleteOrderItem = async (itemId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('session_order_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to remove item');
      return false;
    }
  };

  return {
    isSubmitting,
    createOrder,
    addItemsToOrder,
    updateItemQuantity,
    deleteOrderItem,
    updateItemStatus,
    updateOrderStatus,
    cancelOrder
  };
}
