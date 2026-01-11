import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import type { VenuePass, PassStats } from '@/types/venue-mode';
import { fetchVenuePasses, fetchPassById, redeemPassApi, claimFreeItemApi } from '@/lib/passesApi';

// Re-export VenuePass type for backward compatibility
export type { VenuePass } from '@/types/venue-mode';

interface UseVenuePassesReturn {
  passes: VenuePass[];
  isLoading: boolean;
  error: string | null;
  stats: PassStats;
  redeemPass: (passId: string) => Promise<void>;
  claimFreeItem: (passId: string) => Promise<void>;
  getPassById: (passId: string) => Promise<VenuePass | null>;
  refetch: () => Promise<void>;
}

interface UseVenuePassesOptions {
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  enabled?: boolean; // if false, do not auto-fetch on mount
}

export function useVenuePasses(venueId: string | null, options?: UseVenuePassesOptions): UseVenuePassesReturn {
  const [passes, setPasses] = useState<VenuePass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startDateStr = options?.startDate ? format(options.startDate, 'yyyy-MM-dd') : undefined;
  const endDateStr = options?.endDate ? format(options.endDate, 'yyyy-MM-dd') : undefined;
  const enabled = options?.enabled ?? true;

  const fetchPasses = useCallback(async () => {
    if (!venueId) {
      setPasses([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // If startDate or endDate is undefined, the API client won't send those params (fetch all)
      const data = await fetchVenuePasses(venueId, startDateStr, endDateStr);
      setPasses((data || []) as VenuePass[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load passes';
      console.error('Error fetching venue passes:', err);
      setError(errorMessage);
      setPasses([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, startDateStr, endDateStr]);

  // Initial fetch only when enabled
  useEffect(() => {
    if (enabled) fetchPasses();
  }, [fetchPasses, enabled]);

  // No automatic polling by default. Use refetch() to fetch on demand.



  const redeemPass = useCallback(async (passId: string) => {
    await redeemPassApi(passId);
    // Optimistic update
    setPasses(prev => 
      prev.map(p => p.id === passId ? { ...p, status: 'used' as const } : p)
    );
  }, []);

  const claimFreeItem = useCallback(async (passId: string) => {
    await claimFreeItemApi(passId);
    // Optimistic update
    setPasses(prev => 
      prev.map(p => p.id === passId ? { ...p, free_item_claimed: true } : p)
    );
  }, []);

  const getPassById = useCallback(async (passId: string): Promise<VenuePass | null> => {
    try {
      const data = await fetchPassById(passId);
      return data as VenuePass | null;
    } catch (err) {
      console.error('Error fetching pass by ID:', err);
      return null;
    }
  }, []);

  // Calculate stats from passes
  const stats: PassStats = {
    total: passes.length,
    entry: passes.filter(p => p.pass_type === 'entry').length,
    vip: passes.filter(p => p.pass_type === 'vip').length,
    active: passes.filter(p => p.status === 'active').length,
    used: passes.filter(p => p.status === 'used').length,
    revenue: passes.reduce((sum, p) => sum + Number(p.price || 0), 0),
    freeItemsClaimed: passes.filter(p => p.pass_type === 'vip' && p.free_item_claimed).length,
  };

  return {
    passes,
    isLoading,
    error,
    stats,
    redeemPass,
    claimFreeItem,
    getPassById,
    refetch: fetchPasses,
  };
}
