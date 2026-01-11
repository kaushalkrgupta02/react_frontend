import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VenueBranding {
  id: string;
  name: string;
  logo_url: string | null;
}

/**
 * Hook to fetch the default venue branding for the app.
 * Used for auth screens and global branding where specific venue context is not available.
 */
export function useDefaultVenue() {
  return useQuery({
    queryKey: ['default-venue-branding'],
    queryFn: async (): Promise<VenueBranding | null> => {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, logo_url')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching default venue:', error);
        return null;
      }
      
      return data;
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}
