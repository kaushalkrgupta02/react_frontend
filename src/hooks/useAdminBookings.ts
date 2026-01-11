import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { withApiBase } from '@/lib/config';
import { getAuthHeader } from '@/lib/utilsAuth';

export interface AdminBooking {
  id: string;
  user_id: string;
  venue_id: string;
  booking_date: string;
  booking_reference: string;
  party_size: number;
  arrival_window: string | null;
  special_requests: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'declined';
  created_at: string;
  venue: {
    id: string;
    name: string;
  } | null;
}

// Always use demo mode for venue mode since we removed authentication
function isTestMode(): boolean {
  return true;
}

interface UseAdminBookingsOptions {
  startDate?: Date;
  endDate?: Date;
}

export function useAdminBookings(venueId?: string | null, options?: UseAdminBookingsOptions) {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const startDateStr = options?.startDate ? format(options.startDate, 'yyyy-MM-dd') : undefined;
  const endDateStr = options?.endDate ? format(options.endDate, 'yyyy-MM-dd') : undefined;

  const fetchBookings = useCallback(async () => {
    console.log('fetchBookings called with venueId:', venueId, 'dates:', startDateStr, '-', endDateStr);
    setIsLoading(true);
    try {
      // In test mode, call our backend admin endpoint (replaces edge function)
      if (isTestMode()) {
        console.log('Fetching bookings for venue via backend:', venueId || 'all');
        const params = new URLSearchParams();
        if (venueId) params.set('venue_id', venueId);
        if (startDateStr) params.set('start_date', startDateStr);
        if (endDateStr) params.set('end_date', endDateStr);

        const url = withApiBase(`/api/v1/admin/bookings${params.toString() ? `?${params.toString()}` : ''}`);
        const headers = { ...(await getAuthHeader()) };
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
          const text = await resp.text();
          console.error('Backend bookings fetch error:', resp.status, text);
          throw new Error(text || 'Failed to fetch bookings');
        }

        const data = await resp.json();
        const fetchedBookings = data as AdminBooking[];
        // Filter by venue if specified (extra safety)
        const finalBookings = venueId ? fetchedBookings.filter(b => b.venue_id === venueId) : fetchedBookings;
        console.log('Fetched bookings via backend:', finalBookings.length);
        setBookings(finalBookings);
      } else {
        // Normal mode - use regular query with RLS
        let query = supabase
          .from('bookings')
          .select(`
            *,
            venue:venues(id, name)
          `)
          .order('booking_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (venueId) {
          query = query.eq('venue_id', venueId);
        }

        if (startDateStr) {
          query = query.gte('booking_date', startDateStr);
        }

        if (endDateStr) {
          query = query.lte('booking_date', endDateStr);
        }

        const { data, error } = await query;

        if (error) throw error;
        setBookings(data as AdminBooking[]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, startDateStr, endDateStr]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const updateBookingStatus = async (
    bookingId: string,
    status: 'confirmed' | 'cancelled' | 'declined'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // In test mode, call backend to update booking status
      if (isTestMode()) {
        console.log('Test mode: updating booking via backend');
        const url = withApiBase(`/api/v1/admin/bookings/${bookingId}/status`);
        const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
        const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ status }) });
        if (!resp.ok) {
          const text = await resp.text();
          console.error('Backend update booking status error:', resp.status, text);
          throw new Error(text || 'Failed to update booking status');
        }

        const data = await resp.json();
        if (!data?.success) throw new Error(data?.error || 'Failed to update booking');

        await fetchBookings();
        return { success: true };
      }

      // Normal mode
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;
      
      await fetchBookings();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating booking:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    bookings,
    isLoading,
    updateBookingStatus,
    refetch: fetchBookings,
  };
}
