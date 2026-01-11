import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VenuePackageCount {
  venue_id: string;
  count: number;
}

export function useVenuePackageCounts() {
  return useQuery({
    queryKey: ['venue-package-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('venue_packages')
        .select('venue_id')
        .eq('is_active', true);

      if (error) throw error;

      // Count packages per venue
      const counts: Record<string, number> = {};
      (data || []).forEach((pkg) => {
        counts[pkg.venue_id] = (counts[pkg.venue_id] || 0) + 1;
      });

      return counts;
    },
  });
}
