import { useQueryClient } from '@tanstack/react-query';
import { searchPromos } from '@/lib/promosApi';

export function usePromoSearch(venueId?: string) {
  const queryClient = useQueryClient();

  async function search(term: string, opts?: { limit?: number; endsAtGte?: string }) {
    if (!term || !venueId) return [] as any[];
    const queryKey = ['promo-search', venueId, term];
    try {
      const data = await queryClient.fetchQuery({
        queryKey,
        queryFn: () => searchPromos({ term, venueId, isActive: true, endsAtGte: opts?.endsAtGte, limit: opts?.limit || 50 }),
        staleTime: 1000 * 60,
      });
      return data as any[];
    } catch (err) {
      // rethrow so callers can handle
      throw err;
    }
  }

  return { search };
}
