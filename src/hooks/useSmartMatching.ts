import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface AIRecommendation {
  id: string;
  recommendation_type: string;
  source_id: string | null;
  source_type: string | null;
  target_user_id: string | null;
  target_segment: string | null;
  match_score: number | null;
  match_reasoning: string | null;
  match_factors: Record<string, number> | null;
  timing_recommendation: {
    best_day?: number;
    best_hour?: number;
    promo_code?: string;
  } | null;
  created_at: string | null;
  expires_at: string | null;
  was_actioned: boolean | null;
  actioned_at: string | null;
}

// Fetch recommendations for a venue (venue_to_customer)
export function useVenueRecommendations(venueId: string | undefined) {
  return useQuery({
    queryKey: ['venue-recommendations', venueId],
    queryFn: async () => {
      if (!venueId) return [];

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('source_id', venueId)
        .eq('source_type', 'venue')
        .eq('recommendation_type', 'venue_to_customer')
        .order('match_score', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AIRecommendation[];
    },
    enabled: !!venueId,
  });
}

// Fetch recommendations for a promo (promo_to_segment)
export function usePromoRecommendations(promoId: string | undefined) {
  return useQuery({
    queryKey: ['promo-recommendations', promoId],
    queryFn: async () => {
      if (!promoId) return [];

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('source_id', promoId)
        .eq('source_type', 'promo')
        .eq('recommendation_type', 'promo_to_segment')
        .order('match_score', { ascending: false });

      if (error) throw error;
      return data as AIRecommendation[];
    },
    enabled: !!promoId,
  });
}

// Trigger smart matching for a venue
export function useRunSmartMatching() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      venueId?: string;
      promoId?: string;
      matchType: 'venue_to_customer' | 'promo_to_segment' | 'customer_to_venue';
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-smart-matcher', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, params) => {
      if (params.venueId) {
        queryClient.invalidateQueries({ queryKey: ['venue-recommendations', params.venueId] });
      }
      if (params.promoId) {
        queryClient.invalidateQueries({ queryKey: ['promo-recommendations', params.promoId] });
      }
    },
  });
}

// Mark recommendation as actioned
export function useActionRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { recommendationId: string; result?: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('ai_recommendations')
        .update({
          was_actioned: true,
          actioned_at: new Date().toISOString(),
          action_result: (params.result || null) as Json,
        })
        .eq('id', params.recommendationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['promo-recommendations'] });
    },
  });
}

// Get segments best suited for "Fill Tonight"
export function useFillTonightSegments(venueId: string | undefined) {
  return useQuery({
    queryKey: ['fill-tonight-segments', venueId],
    queryFn: async () => {
      if (!venueId) return [];

      const today = new Date().getDay();
      const currentHour = new Date().getHours();

      // Get customers who prefer today's day of week and haven't visited recently
      const { data, error } = await supabase
        .from('customer_segments')
        .select('*')
        .eq('preferred_day_of_week', today)
        .gte('promo_responsiveness', 0.3)
        .lte('no_show_risk', 0.3)
        .order('clv_score', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Group by segment
      const segmentMap: Record<string, { name: string; count: number; avgClv: number }> = {};
      (data || []).forEach((customer) => {
        if (!segmentMap[customer.segment_name]) {
          segmentMap[customer.segment_name] = { name: customer.segment_name, count: 0, avgClv: 0 };
        }
        segmentMap[customer.segment_name].count += 1;
        segmentMap[customer.segment_name].avgClv += customer.clv_score || 0;
      });

      return Object.values(segmentMap)
        .map((s) => ({ ...s, avgClv: s.count > 0 ? s.avgClv / s.count : 0 }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!venueId,
  });
}
