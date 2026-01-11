import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { withApiBase } from '@/lib/config';
import { getAuthHeader } from '@/lib/utilsAuth';

export interface TableSession {
  id: string;
  venue_id: string;
  table_id: string | null;
  booking_id: string | null;
  package_purchase_id: string | null;
  status: 'open' | 'billing' | 'paid' | 'closed' | 'cancelled';
  guest_count: number;
  guest_name: string | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  opened_by: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  table?: {
    id: string;
    table_number: string;
    seats: number;
    location_zone: string | null;
  } | null;
  orders?: SessionOrder[];
  invoice?: SessionInvoice | null;
}

export interface SessionOrder {
  id: string;
  session_id: string;
  order_number: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  notes: string | null;
  ordered_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  items?: SessionOrderItem[];
}

export interface SessionOrderItem {
  id: string;
  session_order_id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  modifiers: any[];
  notes: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  destination: string;
  served_at: string | null;
  created_at: string;
}

export interface SessionInvoice {
  id: string;
  session_id: string;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  service_charge: number;
  discount_amount: number;
  discount_reason: string | null;
  deposit_credit: number;
  total_amount: number;
  amount_paid: number;
  status: 'draft' | 'pending' | 'paid' | 'partially_paid' | 'void';
  generated_at: string;
  paid_at: string | null;
}

interface CreateSessionParams {
  venue_id: string;
  table_id?: string;
  booking_id?: string;
  package_purchase_id?: string;
  guest_count: number;
  guest_name?: string;
  notes?: string;
}

export function useTableSessions(venueId: string | null) {
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!venueId) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('table_sessions')
        .select(`
          *,
          table:venue_tables(id, table_number, seats, location_zone)
        `)
        .eq('venue_id', venueId)
        .in('status', ['open', 'billing'])
        .order('opened_at', { ascending: false });

      if (error) throw error;

      // Fetch orders for each session
      const sessionsWithOrders = await Promise.all(
        (data || []).map(async (session) => {
          const { data: orders } = await supabase
            .from('session_orders')
            .select(`
              *,
              items:session_order_items(*)
            `)
            .eq('session_id', session.id)
            .order('order_number', { ascending: true });

          const { data: invoice } = await supabase
            .from('session_invoices')
            .select('*')
            .eq('session_id', session.id)
            .neq('status', 'void')
            .maybeSingle();

          return {
            ...session,
            orders: orders || [],
            invoice: invoice || null
          } as TableSession;
        })
      );

      setSessions(sessionsWithOrders);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Realtime subscription
  useEffect(() => {
    if (!venueId) return;

    const channel = supabase
      .channel('table-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_sessions',
          filter: `venue_id=eq.${venueId}`
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, fetchSessions]);

  const openSession = async (params: CreateSessionParams): Promise<TableSession | null> => {
    try {
      // Call backend check-in endpoint which will auto-assign tables for walk-ins
      const url = withApiBase(`/api/v1/sessions/venue/${params.venue_id}/checkin`);
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
      const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify({
        table_id: params.table_id || undefined,
        booking_id: params.booking_id || undefined,
        package_purchase_id: params.package_purchase_id || undefined,
        guest_profile_id: undefined,
        guest_count: params.guest_count,
        guest_name: params.guest_name || undefined,
        notes: params.notes || undefined
      }) });

      if (!resp.ok) {
        const text = await resp.text();
        console.error('Checkin API error:', resp.status, text);
        throw new Error(text || 'Failed to check-in');
      }

      const data = await resp.json();
      const sessionId = data?.session_id;
      if (!sessionId) throw new Error('No session_id returned from checkin');

      toast.success('Session opened');

      // Fetch the single created session immediately
      const session = await getSessionById(sessionId);

      // Schedule a sessions list refresh shortly (realtime will usually pick up)
      setTimeout(() => {
        fetchSessions();
      }, 600);

      return session;
    } catch (error) {
      console.error('Error opening session:', error);
      toast.error('Failed to open session');
      return null;
    }
  };

  const updateSession = async (sessionId: string, updates: Partial<TableSession>) => {
    try {
      const { error } = await supabase
        .from('table_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;

      await fetchSessions();
      return true;
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
      return false;
    }
  };

  const closeSession = async (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      
      const { error } = await supabase
        .from('table_sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Free up the table
      if (session?.table_id) {
        await supabase
          .from('venue_tables')
          .update({ status: 'available' })
          .eq('id', session.table_id);
      }

      toast.success('Session closed');
      await fetchSessions();
      return true;
    } catch (error) {
      console.error('Error closing session:', error);
      toast.error('Failed to close session');
      return false;
    }
  };

  const getSessionById = async (sessionId: string): Promise<TableSession | null> => {
    try {
      const { data: session, error } = await supabase
        .from('table_sessions')
        .select(`
          *,
          table:venue_tables(id, table_number, seats, location_zone)
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      const { data: orders } = await supabase
        .from('session_orders')
        .select(`
          *,
          items:session_order_items(*)
        `)
        .eq('session_id', sessionId)
        .order('order_number', { ascending: true });

      const { data: invoice } = await supabase
        .from('session_invoices')
        .select('*')
        .eq('session_id', sessionId)
        .neq('status', 'void')
        .maybeSingle();

      return {
        ...session,
        orders: orders || [],
        invoice: invoice || null
      } as TableSession;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  };

  return {
    sessions,
    isLoading,
    openSession,
    updateSession,
    closeSession,
    getSessionById,
    refetch: fetchSessions
  };
}
