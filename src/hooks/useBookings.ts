import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Booking {
  id: string;
  user_id: string;
  venue_id: string;
  booking_reference: string;
  booking_date: string;
  party_size: number;
  arrival_window: string | null;
  special_requests: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'declined';
  created_at: string;
  updated_at: string;
  // New fields for pass functionality
  booking_type: string | null;
  can_cancel: boolean | null;
  cancel_cutoff_at: string | null;
  pass_status: string | null;
  venue?: {
    id: string;
    name: string;
    cover_image_url: string | null;
  };
}

export interface CreateBookingParams {
  venue_id: string;
  booking_date: string;
  party_size: number;
  arrival_window?: string | null;
  special_requests?: string | null;
  booking_type?: string | null;
}

export function useBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    if (!user) {
      setBookings([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          venue:venues(id, name, cover_image_url)
        `)
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings(data as Booking[]);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const createBooking = async (
    params: CreateBookingParams,
  ): Promise<{ success: boolean; bookingId?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          venue_id: params.venue_id,
          booking_date: params.booking_date,
          party_size: params.party_size,
          arrival_window: params.arrival_window || null,
          special_requests: params.special_requests || null,
          booking_type: params.booking_type || 'night_reservation',
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;
      
      // Refresh bookings
      await fetchBookings();
      
      return { success: true, bookingId: data?.id };
    } catch (error: any) {
      console.error('Error creating booking:', error);
      return { success: false, error: error.message };
    }
  };

  const cancelBooking = async (
    bookingId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          pass_status: 'disabled',
        })
        .eq('id', bookingId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Refresh bookings
      await fetchBookings();
      
      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    bookings,
    isLoading,
    createBooking,
    cancelBooking,
    refetch: fetchBookings,
  };
}
