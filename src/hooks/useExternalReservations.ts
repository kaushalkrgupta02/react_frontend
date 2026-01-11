import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ExternalReservation {
  id: string;
  booking_id: string | null;
  venue_id: string;
  provider: string;
  provider_reservation_id: string | null;
  idempotency_key: string;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed' | 'cancelled' | 'modified';
  provider_status: string | null;
  last_synced_at: string | null;
  provider_response: Record<string, any>;
  provider_confirmation_number: string | null;
  error_message: string | null;
  retry_count: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useExternalReservations(bookingId?: string) {
  const [reservation, setReservation] = useState<ExternalReservation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReservation = useCallback(async () => {
    if (!bookingId) {
      setReservation(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('external_reservations')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setReservation(data as unknown as ExternalReservation);
    } catch (err: any) {
      console.error('Error fetching external reservation:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  // Subscribe to realtime updates for sync status
  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`external_reservation_${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'external_reservations',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          console.log('External reservation update:', payload);
          if (payload.new) {
            setReservation(payload.new as unknown as ExternalReservation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const retrySync = async (): Promise<{ success: boolean; error?: string }> => {
    if (!reservation) return { success: false, error: 'No reservation found' };

    try {
      const { error: updateError } = await supabase
        .from('external_reservations')
        .update({
          sync_status: 'pending',
          error_message: null,
          next_retry_at: null,
        })
        .eq('id', reservation.id);

      if (updateError) throw updateError;

      // Trigger sync via edge function
      const { error: invokeError } = await supabase.functions.invoke('reservation-api', {
        body: {
          action: 'sync-retry',
          reservationId: reservation.id,
        }
      });

      if (invokeError) throw invokeError;

      await fetchReservation();
      return { success: true };
    } catch (err: any) {
      console.error('Error retrying sync:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    reservation,
    isLoading,
    error,
    retrySync,
    refetch: fetchReservation,
    isSynced: reservation?.sync_status === 'synced',
    isFailed: reservation?.sync_status === 'failed',
    isPending: reservation?.sync_status === 'pending' || reservation?.sync_status === 'syncing',
  };
}
