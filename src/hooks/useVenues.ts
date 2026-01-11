import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OpeningHours {
  [day: string]: {
    open: string;
    close: string;
  } | null;
}

export interface Venue {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: 'quiet' | 'perfect' | 'ideal' | 'busy' | 'too_busy';
  has_cover: boolean;
  supports_booking: boolean;
  booking_mode: 'none' | 'night_reservation' | 'resource_time_slots';
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  opening_hours: OpeningHours | null;
  amenities: string[] | null;
  venue_notes: string | null;
  min_spend: string | null;
  crowd_trend: 'filling_up' | 'steady' | 'easing' | null;
  venue_type: {
    id: string;
    name: string;
  } | null;
  // Booking preference fields
  min_party_size: number | null;
  max_party_size: number | null;
  allow_special_requests: boolean;
  total_tables: number | null;
  seats_per_table: number | null;
  total_capacity: number | null;
  // Line skip fields (legacy)
  line_skip_enabled: boolean;
  line_skip_price: number | null;
  line_skip_daily_limit: number | null;
  line_skip_sold_count: number;
  line_skip_valid_until: string | null;
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

export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: async (): Promise<Venue[]> => {
      const { data, error } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          description,
          address,
          status,
          has_cover,
          supports_booking,
          booking_mode,
          latitude,
          longitude,
          cover_image_url,
          min_party_size,
          max_party_size,
          allow_special_requests,
          total_tables,
          seats_per_table,
          total_capacity,
          line_skip_enabled,
          line_skip_price,
          line_skip_daily_limit,
          line_skip_sold_count,
          line_skip_valid_until,
          entry_pass_enabled,
          entry_pass_price,
          entry_pass_daily_limit,
          entry_pass_sold_count,
          vip_pass_enabled,
          vip_pass_price,
          vip_pass_daily_limit,
          vip_pass_sold_count,
          vip_pass_free_item,
          venue_type:venue_types (
            id,
            name
          )
        `)
        .order('name');

      if (error) throw error;
      
      return (data as unknown as Venue[]) || [];
    },
  });
}
