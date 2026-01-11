import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerSegment {
  id: string;
  user_id: string;
  segment_name: string;
  segment_score: number | null;
  rfm_recency_days: number | null;
  rfm_frequency: number | null;
  rfm_monetary: number | null;
  rfm_tier: string | null;
  avg_party_size: number | null;
  preferred_day_of_week: number | null;
  preferred_arrival_hour: number | null;
  preferred_venue_types: string[] | null;
  promo_responsiveness: number | null;
  no_show_risk: number | null;
  clv_score: number | null;
  last_calculated_at: string | null;
  calculation_version: string | null;
  raw_metrics: Record<string, unknown> | null;
}

export interface SegmentSummary {
  name: string;
  count: number;
  avgSpend: number;
  avgClv: number;
  avgPromoResponsiveness: number;
  avgNoShowRisk: number;
}

// Fetch all customer segments (for venue managers)
export function useCustomerSegments() {
  return useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_segments')
        .select('*')
        .order('clv_score', { ascending: false });

      if (error) throw error;
      return data as CustomerSegment[];
    },
  });
}

// Get aggregated segment summaries for targeting
export function useSegmentSummaries() {
  return useQuery({
    queryKey: ['segment-summaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_segments')
        .select('*');

      if (error) throw error;

      // Group by segment name and calculate stats
      const segments = data as CustomerSegment[];
      const summaryMap: Record<string, SegmentSummary> = {};

      segments.forEach((seg) => {
        if (!summaryMap[seg.segment_name]) {
          summaryMap[seg.segment_name] = {
            name: seg.segment_name,
            count: 0,
            avgSpend: 0,
            avgClv: 0,
            avgPromoResponsiveness: 0,
            avgNoShowRisk: 0,
          };
        }
        const summary = summaryMap[seg.segment_name];
        summary.count += 1;
        summary.avgSpend += seg.rfm_monetary || 0;
        summary.avgClv += seg.clv_score || 0;
        summary.avgPromoResponsiveness += seg.promo_responsiveness || 0;
        summary.avgNoShowRisk += seg.no_show_risk || 0;
      });

      // Calculate averages
      Object.values(summaryMap).forEach((summary) => {
        if (summary.count > 0) {
          summary.avgSpend = summary.avgSpend / summary.count;
          summary.avgClv = summary.avgClv / summary.count;
          summary.avgPromoResponsiveness = summary.avgPromoResponsiveness / summary.count;
          summary.avgNoShowRisk = summary.avgNoShowRisk / summary.count;
        }
      });

      return Object.values(summaryMap).sort((a, b) => b.count - a.count);
    },
  });
}

// Calculate reach for selected segments
export function useSegmentReach(segmentNames: string[]) {
  return useQuery({
    queryKey: ['segment-reach', segmentNames],
    queryFn: async () => {
      if (segmentNames.length === 0) return { reach: 0, total: 0 };

      const { data: selected, error: selectedError } = await supabase
        .from('customer_segments')
        .select('user_id')
        .in('segment_name', segmentNames);

      if (selectedError) throw selectedError;

      const { count: total, error: totalError } = await supabase
        .from('customer_segments')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      const uniqueUsers = new Set((selected || []).map(s => s.user_id));
      return { reach: uniqueUsers.size, total: total || 0 };
    },
    enabled: segmentNames.length > 0,
  });
}

// Predict redemption rate for promo type + segments
export function usePredictedRedemption(discountType: string, segmentNames: string[]) {
  return useQuery({
    queryKey: ['predicted-redemption', discountType, segmentNames],
    queryFn: async () => {
      if (segmentNames.length === 0) return { rate: 0, confidence: 0 };

      // Get avg promo responsiveness for selected segments
      const { data, error } = await supabase
        .from('customer_segments')
        .select('promo_responsiveness')
        .in('segment_name', segmentNames);

      if (error) throw error;

      const avgResponsiveness = data.length > 0
        ? data.reduce((sum, d) => sum + (d.promo_responsiveness || 0), 0) / data.length
        : 0;

      // Adjust based on discount type
      const typeMultipliers: Record<string, number> = {
        percentage: 1.0,
        bogo: 1.2,
        free_item: 1.3,
        fixed: 0.9,
      };
      const multiplier = typeMultipliers[discountType] || 1.0;

      return {
        rate: Math.min(100, Math.round(avgResponsiveness * multiplier * 100)),
        confidence: Math.min(95, 60 + segmentNames.length * 5),
      };
    },
    enabled: segmentNames.length > 0,
  });
}

// Trigger AI segmentation calculation
export function useRunSegmentation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-customer-segmentation', {
        body: { forceRecalculate: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] });
      queryClient.invalidateQueries({ queryKey: ['segment-summaries'] });
    },
  });
}
