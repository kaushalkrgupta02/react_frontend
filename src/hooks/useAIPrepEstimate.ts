import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  destination: string;
  category?: string;
}

interface EstimateCache {
  [itemName: string]: {
    minutes: number;
    timestamp: number;
  };
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export function useAIPrepEstimate(destination: 'kitchen' | 'bar') {
  const [estimates, setEstimates] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<EstimateCache>({});

  const getEstimates = useCallback(async (items: OrderItem[], queueDepth: number) => {
    if (items.length === 0) return;

    const now = Date.now();
    const uncachedItems: OrderItem[] = [];
    const cachedEstimates: Record<string, number> = {};

    // Check cache first
    items.forEach(item => {
      const cached = cacheRef.current[item.item_name];
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        cachedEstimates[item.item_name] = cached.minutes;
      } else {
        uncachedItems.push(item);
      }
    });

    // If all items are cached, just update state
    if (uncachedItems.length === 0) {
      setEstimates(prev => ({ ...prev, ...cachedEstimates }));
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-prep-time-estimator', {
        body: {
          items: uncachedItems,
          queueDepth,
          destination,
        },
      });

      if (error) {
        console.error('Error getting prep estimates:', error);
        return;
      }

      const newEstimates = data?.estimates || {};

      // Update cache
      Object.entries(newEstimates).forEach(([itemName, minutes]) => {
        cacheRef.current[itemName] = {
          minutes: minutes as number,
          timestamp: now,
        };
      });

      // Merge with cached estimates
      setEstimates(prev => ({
        ...prev,
        ...cachedEstimates,
        ...newEstimates,
      }));
    } catch (error) {
      console.error('Failed to get AI prep estimates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [destination]);

  const getEstimateForItem = useCallback((itemName: string): number | null => {
    return estimates[itemName] ?? null;
  }, [estimates]);

  return {
    estimates,
    isLoading,
    getEstimates,
    getEstimateForItem,
  };
}
