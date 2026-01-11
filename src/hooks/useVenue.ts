import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Venue } from './useVenues';

export function useVenue(id: string | undefined) {
  return useQuery({
    queryKey: ['venue', id],
    queryFn: async (): Promise<Venue | null> => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          description,
          address,
          phone,
          whatsapp,
          status,
          has_cover,
          supports_booking,
          booking_mode,
          latitude,
          longitude,
          cover_image_url,
          opening_hours,
          amenities,
          venue_notes,
          min_spend,
          crowd_trend,
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
          venue_type:venue_types (
            id,
            name
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      return data as unknown as Venue | null;
    },
    enabled: !!id,
  });
}
