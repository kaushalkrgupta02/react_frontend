import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logAIPrediction } from './useAIAccuracy';

interface DemandPrediction {
  type: 'demand' | 'staffing' | 'noShow' | 'revenue' | 'promo';
  title: string;
  value: string;
  confidence: number;
  insight: string;
  action?: string;
  metadata?: Record<string, unknown>;
  promoSuggestion?: {
    title: string;
    description: string;
    timing: string;
  };
}

interface NoShowRiskBooking {
  bookingId: string;
  bookingRef: string;
  partySize: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  riskFactors: string[];
  suggestedAction: string;
}

interface DemandForecastResponse {
  predictions: DemandPrediction[];
  noShowRiskBookings: NoShowRiskBooking[];
  rawPredictions?: Record<string, unknown>;
  dataContext?: {
    dayOfWeek: string;
    isWeekend: boolean;
    historicalBookings: number;
    currentBookings: number;
  };
  error?: string;
}

export function useDemandForecast(venueId?: string, targetDate?: string) {
  return useQuery({
    queryKey: ['demand-forecast', venueId, targetDate],
    queryFn: async (): Promise<DemandForecastResponse> => {
      if (!venueId) {
        return { predictions: [], noShowRiskBookings: [] };
      }

      const { data, error } = await supabase.functions.invoke('ai-demand-forecast', {
        body: { venueId, targetDate },
      });

      if (error) {
        console.error('Demand forecast error:', error);
        throw error;
      }

      const response = data as DemandForecastResponse;

      // Log predictions for accuracy tracking (fire and forget)
      if (response.predictions && response.predictions.length > 0) {
        const predictionDate = targetDate || new Date().toISOString().split('T')[0];
        
        response.predictions.forEach(prediction => {
          // Skip promo suggestions as they're not measurable predictions
          if (prediction.type === 'promo') return;
          
          const predictedValue: Record<string, unknown> = {
            value: prediction.value,
            ...prediction.metadata,
          };

          // Add type-specific data
          if (prediction.type === 'demand') {
            predictedValue.expectedFootfall = prediction.metadata?.expectedFootfall;
          } else if (prediction.type === 'noShow') {
            const riskMatch = prediction.value.match(/(\d+)/);
            predictedValue.riskPercent = riskMatch ? parseInt(riskMatch[1]) : 15;
          } else if (prediction.type === 'revenue') {
            const matches = prediction.value.match(/(\d+\.?\d*)/g);
            if (matches && matches.length >= 2) {
              predictedValue.min = parseFloat(matches[0]) * 1000000;
              predictedValue.max = parseFloat(matches[1]) * 1000000;
            }
          }

          logAIPrediction(
            venueId,
            prediction.type,
            predictedValue,
            prediction.confidence,
            predictionDate
          ).catch(err => console.error('Failed to log prediction:', err));
        });
      }

      return response;
    },
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
}

export type { DemandPrediction, NoShowRiskBooking, DemandForecastResponse };
