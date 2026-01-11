import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchVenuePromos } from '@/lib/promosApi';
import { toast } from 'sonner';

export interface VenuePromo {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  discount_type: string | null;
  discount_value: number | null;
  promo_code: string | null;
  target_audience: string | null;
  terms_conditions: string | null;
  ai_generated: boolean | null;
  current_redemptions: number | null;
  max_redemptions: number | null;
  created_at: string;
  venue_id: string | null;
}

export function useVenuePromos(venueId?: string) {
  return useQuery({
    queryKey: ['venue-promos', venueId],
    queryFn: async () => {
      if (!venueId) return [];
      try {
        const data = await fetchVenuePromos(venueId);
        return (data || []) as VenuePromo[];
      } catch (error) {
        console.error('Error fetching promos via API:', error);
        throw error;
      }
    },
    enabled: !!venueId,
  });
}

export function useTogglePromoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ promoId, isActive }: { promoId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('promos')
        .update({ is_active: isActive })
        .eq('id', promoId);

      if (error) throw error;
      return { promoId, isActive };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['venue-promos'] });
      toast.success(data.isActive ? 'Promo activated!' : 'Promo deactivated');
    },
    onError: (error) => {
      console.error('Error toggling promo status:', error);
      toast.error('Failed to update promo status');
    },
  });
}

export function useUpdatePromo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ promoId, updates }: { promoId: string; updates: Partial<VenuePromo> }) => {
      const { error } = await supabase
        .from('promos')
        .update(updates)
        .eq('id', promoId);

      if (error) throw error;
      return promoId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-promos'] });
      toast.success('Promo updated!');
    },
    onError: (error) => {
      console.error('Error updating promo:', error);
      toast.error('Failed to update promo');
    },
  });
}

export function useDeletePromo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promoId: string) => {
      const { error } = await supabase
        .from('promos')
        .delete()
        .eq('id', promoId);

      if (error) throw error;
      return promoId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-promos'] });
      toast.success('Promo deleted');
    },
    onError: (error) => {
      console.error('Error deleting promo:', error);
      toast.error('Failed to delete promo');
    },
  });
}
