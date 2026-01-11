import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AvailabilitySlot {
  id: string;
  venue_id: string;
  provider: string;
  slot_date: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  party_min: number;
  party_max: number;
  area_zone: string | null;
  table_type: string | null;
  requires_deposit: boolean;
  deposit_amount: number | null;
  min_spend: number | null;
  is_available: boolean;
  slots_remaining: number | null;
  provider_slot_id: string | null;
}

interface FetchAvailabilityParams {
  venueId: string;
  date: string;
  partySize: number;
  seatingType?: string;
}

export function useAvailabilitySlots() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cache' | 'provider' | 'local' | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const fetchAvailability = useCallback(async (params: FetchAvailabilityParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('reservation-api', {
        body: {
          action: 'availability',
          venueId: params.venueId,
          date: params.date,
          partySize: params.partySize,
          seatingType: params.seatingType,
        }
      });

      if (invokeError) throw invokeError;

      setSlots(data.slots || []);
      setSource(data.source || null);
      setProvider(data.provider || null);

    } catch (err: any) {
      console.error('Error fetching availability:', err);
      setError(err.message);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSlots = useCallback(() => {
    setSlots([]);
    setSource(null);
    setProvider(null);
    setError(null);
  }, []);

  return {
    slots,
    isLoading,
    error,
    source,
    provider,
    fetchAvailability,
    clearSlots,
  };
}
