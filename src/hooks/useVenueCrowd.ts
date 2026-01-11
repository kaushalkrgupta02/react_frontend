import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VenueCrowdSnapshot {
  id: string;
  venue_id: string;
  snapshot_at: string;
  population_density: number | null;
  crowd_level: 'quiet' | 'moderate' | 'busy' | 'very_busy' | 'packed';
  confidence: number | null;
  source: string | null;
}

export function useVenueCrowd(venueId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['venue-crowd', venueId],
    queryFn: async () => {
      if (!venueId) return null;
      
      const { data, error } = await supabase
        .from('venue_crowd_snapshots')
        .select('*')
        .eq('venue_id', venueId)
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as VenueCrowdSnapshot | null;
    },
    enabled: !!venueId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    crowdData: data,
    isLoading,
    error,
    crowdLevel: data?.crowd_level || null,
    density: data?.population_density || null,
    confidence: data?.confidence || null,
    lastUpdated: data?.snapshot_at ? new Date(data.snapshot_at) : null,
  };
}

export function useVenueCrowdAnalytics(venueId: string | null, days: number = 7) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['venue-crowd-analytics', venueId, days],
    queryFn: async () => {
      if (!venueId) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('venue_crowd_snapshots')
        .select('*')
        .eq('venue_id', venueId)
        .gte('snapshot_at', startDate.toISOString())
        .order('snapshot_at', { ascending: true });
      
      if (error) throw error;
      return data as VenueCrowdSnapshot[];
    },
    enabled: !!venueId,
  });

  // Calculate peak hours from the data
  const peakHours = data?.length ? calculatePeakHours(data) : [];
  
  return {
    snapshots: data || [],
    isLoading,
    error,
    peakHours,
  };
}

function calculatePeakHours(snapshots: VenueCrowdSnapshot[]): { hour: number; avgDensity: number }[] {
  const hourlyData: Record<number, number[]> = {};
  
  snapshots.forEach(snapshot => {
    if (snapshot.population_density) {
      const hour = new Date(snapshot.snapshot_at).getHours();
      if (!hourlyData[hour]) hourlyData[hour] = [];
      hourlyData[hour].push(snapshot.population_density);
    }
  });
  
  return Object.entries(hourlyData)
    .map(([hour, densities]) => ({
      hour: parseInt(hour),
      avgDensity: densities.reduce((a, b) => a + b, 0) / densities.length
    }))
    .sort((a, b) => b.avgDensity - a.avgDensity);
}
