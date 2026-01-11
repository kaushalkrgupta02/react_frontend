import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminVenue {
  id: string;
  name: string;
  cover_image_url: string | null;
  status: 'quiet' | 'perfect' | 'ideal' | 'busy' | 'too_busy';
  supports_booking: boolean;
  allow_special_requests: boolean;
  min_party_size: number | null;
  max_party_size: number | null;
  max_bookings_per_night: number | null;
  total_tables: number | null;
  seats_per_table: number | null;
  total_capacity: number | null;
  // Legacy line skip fields (keeping for backward compatibility)
  line_skip_enabled: boolean;
  line_skip_price: number | null;
  line_skip_daily_limit: number | null;
  line_skip_sold_count: number;
  // Entry Pass fields
  entry_pass_enabled: boolean;
  entry_pass_price: number | null;
  entry_pass_daily_limit: number | null;
  entry_pass_sold_count: number;
  // VIP Pass fields
  vip_pass_enabled: boolean;
  vip_pass_price: number | null;
  vip_pass_daily_limit: number | null;
  vip_pass_sold_count: number;
  vip_pass_free_item: string | null;
}

export function useAdminVenues() {
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVenues = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          cover_image_url,
          status,
          supports_booking,
          allow_special_requests,
          min_party_size,
          max_party_size,
          max_bookings_per_night,
          total_tables,
          seats_per_table,
          total_capacity,
          line_skip_enabled,
          line_skip_price,
          line_skip_daily_limit,
          line_skip_sold_count,
          entry_pass_enabled,
          entry_pass_price,
          entry_pass_daily_limit,
          entry_pass_sold_count,
          vip_pass_enabled,
          vip_pass_price,
          vip_pass_daily_limit,
          vip_pass_sold_count,
          vip_pass_free_item
        `)
        .order('name');

      if (error) throw error;
      setVenues(data as AdminVenue[]);
    } catch (error) {
      console.error('Error fetching venues:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const updateVenueStatus = async (
    venueId: string,
    status: AdminVenue['status']
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('venues')
        .update({ status })
        .eq('id', venueId);

      if (error) throw error;
      await fetchVenues();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating venue status:', error);
      return { success: false, error: error.message };
    }
  };

  const updateVenueSettings = async (
    venueId: string,
    settings: Partial<Omit<AdminVenue, 'id' | 'name'>>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('venues')
        .update(settings)
        .eq('id', venueId);

      if (error) throw error;
      await fetchVenues();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating venue settings:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    venues,
    isLoading,
    updateVenueStatus,
    updateVenueSettings,
    updateLineSkipSettings: updateVenueSettings, // Alias for backward compatibility
    refetch: fetchVenues,
  };
}
