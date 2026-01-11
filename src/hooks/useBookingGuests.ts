import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface BookingGuest {
  id: string;
  booking_id: string;
  user_id: string | null;
  guest_number: number;
  qr_code: string;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  is_primary: boolean;
  check_in_status: string;
  checked_in_at: string | null;
  spend_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined profile data for app users
  profile?: {
    display_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

export interface AddGuestParams {
  booking_id: string;
  user_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
}

function generateQRCode(): string {
  return 'BG-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function useBookingGuests(bookingId?: string) {
  const { user } = useAuth();
  const [guests, setGuests] = useState<BookingGuest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGuests = useCallback(async () => {
    if (!bookingId) {
      setGuests([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('booking_guests')
        .select(`
          *,
          profile:profiles!booking_guests_user_id_fkey(display_name, phone, avatar_url)
        `)
        .eq('booking_id', bookingId)
        .order('guest_number', { ascending: true });

      if (error) throw error;
      setGuests(data as BookingGuest[]);
    } catch (error) {
      console.error('Error fetching booking guests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const addGuest = async (params: AddGuestParams): Promise<{ success: boolean; guest?: BookingGuest; error?: string }> => {
    try {
      // Get the next guest number
      const maxGuestNumber = guests.length > 0 ? Math.max(...guests.map(g => g.guest_number)) : 0;
      const nextGuestNumber = maxGuestNumber + 1;

      const { data, error } = await supabase
        .from('booking_guests')
        .insert({
          booking_id: params.booking_id,
          user_id: params.user_id || null,
          guest_number: nextGuestNumber,
          qr_code: generateQRCode(),
          guest_name: params.guest_name || null,
          guest_phone: params.guest_phone || null,
          guest_email: params.guest_email || null,
          is_primary: false,
          check_in_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchGuests();
      return { success: true, guest: data as BookingGuest };
    } catch (error: any) {
      console.error('Error adding guest:', error);
      return { success: false, error: error.message };
    }
  };

  const removeGuest = async (guestId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('booking_guests')
        .delete()
        .eq('id', guestId)
        .eq('is_primary', false); // Can't remove primary guest

      if (error) throw error;
      
      await fetchGuests();
      return { success: true };
    } catch (error: any) {
      console.error('Error removing guest:', error);
      return { success: false, error: error.message };
    }
  };

  const checkInGuest = async (guestId: string, spendAmount?: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('booking_guests')
        .update({
          check_in_status: 'checked_in',
          checked_in_at: new Date().toISOString(),
          spend_amount: spendAmount || null,
        })
        .eq('id', guestId);

      if (error) throw error;
      
      await fetchGuests();
      return { success: true };
    } catch (error: any) {
      console.error('Error checking in guest:', error);
      return { success: false, error: error.message };
    }
  };

  const markNoShow = async (guestId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('booking_guests')
        .update({
          check_in_status: 'no_show',
        })
        .eq('id', guestId);

      if (error) throw error;
      
      await fetchGuests();
      return { success: true };
    } catch (error: any) {
      console.error('Error marking no show:', error);
      return { success: false, error: error.message };
    }
  };

  const findGuestByQRCode = async (qrCode: string): Promise<{ success: boolean; guest?: BookingGuest & { booking?: any }; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('booking_guests')
        .select(`
          *,
          profile:profiles!booking_guests_user_id_fkey(display_name, phone, avatar_url),
          booking:bookings(*, venue:venues(id, name, cover_image_url))
        `)
        .eq('qr_code', qrCode)
        .single();

      if (error) throw error;
      return { success: true, guest: data };
    } catch (error: any) {
      console.error('Error finding guest by QR:', error);
      return { success: false, error: error.message };
    }
  };

  const getCheckInSummary = () => {
    const total = guests.length;
    const checkedIn = guests.filter(g => g.check_in_status === 'checked_in').length;
    const noShow = guests.filter(g => g.check_in_status === 'no_show').length;
    const pending = guests.filter(g => g.check_in_status === 'pending').length;
    return { total, checkedIn, noShow, pending };
  };

  return {
    guests,
    isLoading,
    addGuest,
    removeGuest,
    checkInGuest,
    markNoShow,
    findGuestByQRCode,
    getCheckInSummary,
    refetch: fetchGuests,
  };
}
