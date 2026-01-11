import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PackageGuest {
  id: string;
  purchase_id: string;
  user_id: string | null;
  guest_number: number;
  qr_code: string;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  is_primary: boolean;
  redemption_status: string;
  created_at: string;
  updated_at: string;
  // Joined profile data for app users
  profile?: {
    display_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

export interface AddPackageGuestParams {
  purchase_id: string;
  user_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
}

function generateQRCode(): string {
  return 'PG-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function usePackageGuests(purchaseId?: string) {
  const { user } = useAuth();
  const [guests, setGuests] = useState<PackageGuest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGuests = useCallback(async () => {
    if (!purchaseId) {
      setGuests([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('package_guests')
        .select(`
          *,
          profile:profiles!package_guests_user_id_fkey(display_name, phone, avatar_url)
        `)
        .eq('purchase_id', purchaseId)
        .order('guest_number', { ascending: true });

      if (error) throw error;
      setGuests(data as PackageGuest[]);
    } catch (error) {
      console.error('Error fetching package guests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const addGuest = async (params: AddPackageGuestParams): Promise<{ success: boolean; guest?: PackageGuest; error?: string }> => {
    try {
      const maxGuestNumber = guests.length > 0 ? Math.max(...guests.map(g => g.guest_number)) : 0;
      const nextGuestNumber = maxGuestNumber + 1;

      const { data, error } = await supabase
        .from('package_guests')
        .insert({
          purchase_id: params.purchase_id,
          user_id: params.user_id || null,
          guest_number: nextGuestNumber,
          qr_code: generateQRCode(),
          guest_name: params.guest_name || null,
          guest_phone: params.guest_phone || null,
          guest_email: params.guest_email || null,
          is_primary: false,
          redemption_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchGuests();
      return { success: true, guest: data as PackageGuest };
    } catch (error: any) {
      console.error('Error adding package guest:', error);
      return { success: false, error: error.message };
    }
  };

  const removeGuest = async (guestId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('package_guests')
        .delete()
        .eq('id', guestId)
        .eq('is_primary', false);

      if (error) throw error;
      
      await fetchGuests();
      return { success: true };
    } catch (error: any) {
      console.error('Error removing package guest:', error);
      return { success: false, error: error.message };
    }
  };

  const updateRedemptionStatus = async (guestId: string, status: 'pending' | 'partially_redeemed' | 'fully_redeemed'): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('package_guests')
        .update({
          redemption_status: status,
        })
        .eq('id', guestId);

      if (error) throw error;
      
      await fetchGuests();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating redemption status:', error);
      return { success: false, error: error.message };
    }
  };

  const findGuestByQRCode = async (qrCode: string): Promise<{ success: boolean; guest?: PackageGuest & { purchase?: any }; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('package_guests')
        .select(`
          *,
          profile:profiles!package_guests_user_id_fkey(display_name, phone, avatar_url),
          purchase:package_purchases(*, package:venue_packages(*), venue:venues(id, name, cover_image_url))
        `)
        .eq('qr_code', qrCode)
        .single();

      if (error) throw error;
      return { success: true, guest: data };
    } catch (error: any) {
      console.error('Error finding package guest by QR:', error);
      return { success: false, error: error.message };
    }
  };

  const getRedemptionSummary = () => {
    const total = guests.length;
    const pending = guests.filter(g => g.redemption_status === 'pending').length;
    const partial = guests.filter(g => g.redemption_status === 'partially_redeemed').length;
    const complete = guests.filter(g => g.redemption_status === 'fully_redeemed').length;
    return { total, pending, partial, complete };
  };

  return {
    guests,
    isLoading,
    addGuest,
    removeGuest,
    updateRedemptionStatus,
    findGuestByQRCode,
    getRedemptionSummary,
    refetch: fetchGuests,
  };
}
