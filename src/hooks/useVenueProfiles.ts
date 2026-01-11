import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VenueProfile {
  id: string;
  venue_id: string;
  avg_capacity_utilization: number | null;
  avg_show_up_rate: number | null;
  avg_customer_spend: number | null;
  total_revenue_30d: number | null;
  total_bookings_30d: number | null;
  peak_days: Array<{ day: number; score: number }> | null;
  slow_days: Array<{ day: number; score: number }> | null;
  peak_hours: Array<{ hour: number; footfall: number }> | null;
  top_customer_segments: Array<{ segment: string; percentage: number }> | null;
  avg_party_size: number | null;
  repeat_customer_rate: number | null;
  promo_effectiveness_score: number | null;
  avg_promo_redemption_rate: number | null;
  best_performing_promo_types: string[] | null;
  growth_opportunities: Array<{ title: string; description: string; impact: string }> | null;
  risk_factors: Array<{ title: string; description: string; severity: string }> | null;
  ai_recommendations: Array<{ action: string; reasoning: string; priority: string }> | null;
  last_calculated_at: string | null;
}

// Fetch venue profile for a specific venue
export function useVenueProfile(venueId: string | undefined) {
  return useQuery({
    queryKey: ['venue-profile', venueId],
    queryFn: async () => {
      if (!venueId) return null;

      const { data, error } = await supabase
        .from('venue_profiles')
        .select('*')
        .eq('venue_id', venueId)
        .maybeSingle();

      if (error) throw error;
      
      // Parse JSON fields
      if (data) {
        return {
          ...data,
          peak_days: data.peak_days as VenueProfile['peak_days'],
          slow_days: data.slow_days as VenueProfile['slow_days'],
          peak_hours: data.peak_hours as VenueProfile['peak_hours'],
          top_customer_segments: data.top_customer_segments as VenueProfile['top_customer_segments'],
          growth_opportunities: data.growth_opportunities as VenueProfile['growth_opportunities'],
          risk_factors: data.risk_factors as VenueProfile['risk_factors'],
          ai_recommendations: data.ai_recommendations as VenueProfile['ai_recommendations'],
        } as VenueProfile;
      }
      return null;
    },
    enabled: !!venueId,
  });
}

// Fetch all venue profiles (for admin view)
export function useAllVenueProfiles() {
  return useQuery({
    queryKey: ['venue-profiles-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venue_profiles')
        .select('*, venues(name)')
        .order('total_revenue_30d', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Trigger AI venue profiling
export function useRunVenueProfiler() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (venueId: string) => {
      const { data, error } = await supabase.functions.invoke('ai-venue-profiler', {
        body: { venueId, forceRecalculate: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, venueId) => {
      queryClient.invalidateQueries({ queryKey: ['venue-profile', venueId] });
      queryClient.invalidateQueries({ queryKey: ['venue-profiles-all'] });
    },
  });
}

// Get day name helper
export function getDayName(dayIndex: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex] || '';
}

// Get hour label helper
export function getHourLabel(hour: number): string {
  if (hour === 0) return '12AM';
  if (hour < 12) return `${hour}AM`;
  if (hour === 12) return '12PM';
  return `${hour - 12}PM`;
}
