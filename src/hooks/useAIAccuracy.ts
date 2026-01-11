import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PredictionLog {
  id: string;
  venue_id: string;
  prediction_type: string;
  prediction_date: string;
  predicted_value: Record<string, unknown>;
  actual_value: Record<string, unknown> | null;
  confidence_score: number | null;
  accuracy_score: number | null;
  model_version: string;
  created_at: string;
  evaluated_at: string | null;
}

interface LearningInsight {
  id: string;
  venue_id: string | null;
  insight_type: string;
  title: string;
  description: string;
  data_points: Record<string, unknown>;
  confidence: number;
  is_actioned: boolean;
  created_at: string;
}

// Log an AI prediction for later accuracy tracking
export async function logAIPrediction(
  venueId: string,
  predictionType: string,
  predictedValue: Record<string, unknown>,
  confidenceScore?: number,
  predictionDate?: string
) {
  try {
    const { data, error } = await supabase
      .from('ai_prediction_logs')
      .insert({
        venue_id: venueId,
        prediction_type: predictionType,
        prediction_date: predictionDate || new Date().toISOString().split('T')[0],
        predicted_value: predictedValue as unknown as Record<string, never>,
        confidence_score: confidenceScore,
        model_version: 'v1',
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error logging AI prediction:', error);
    return { success: false, error };
  }
}

// Update prediction with actual outcome and calculate accuracy
export async function evaluatePrediction(
  predictionId: string,
  actualValue: Record<string, unknown>,
  accuracyScore: number
) {
  try {
    const { error } = await supabase
      .from('ai_prediction_logs')
      .update({
        actual_value: actualValue as unknown as Record<string, never>,
        accuracy_score: accuracyScore,
        evaluated_at: new Date().toISOString(),
      })
      .eq('id', predictionId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error evaluating prediction:', error);
    return { success: false, error };
  }
}

// Hook to get AI accuracy stats for a venue
export function useAIAccuracyStats(venueId?: string) {
  return useQuery({
    queryKey: ['ai-accuracy', venueId],
    queryFn: async () => {
      if (!venueId) return null;

      const { data, error } = await supabase
        .from('ai_prediction_logs')
        .select('*')
        .eq('venue_id', venueId)
        .not('accuracy_score', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const logs = data as PredictionLog[];
      
      if (logs.length === 0) {
        return {
          overallAccuracy: 0,
          byType: {} as Record<string, { accuracy: number; count: number }>,
          totalEvaluated: 0,
          recentTrend: 'stable' as const,
          logs: [],
        };
      }

      // Calculate overall accuracy
      const overallAccuracy = logs.reduce((sum, l) => sum + (l.accuracy_score || 0), 0) / logs.length;

      // Group by prediction type
      const byType: Record<string, { accuracy: number; count: number }> = {};
      logs.forEach(log => {
        if (!byType[log.prediction_type]) {
          byType[log.prediction_type] = { accuracy: 0, count: 0 };
        }
        byType[log.prediction_type].accuracy += log.accuracy_score || 0;
        byType[log.prediction_type].count++;
      });
      Object.keys(byType).forEach(type => {
        byType[type].accuracy = byType[type].accuracy / byType[type].count;
      });

      // Determine trend (compare last 10 vs previous 10)
      const recent = logs.slice(0, 10);
      const previous = logs.slice(10, 20);
      const recentAvg = recent.length > 0 ? recent.reduce((sum, l) => sum + (l.accuracy_score || 0), 0) / recent.length : 0;
      const previousAvg = previous.length > 0 ? previous.reduce((sum, l) => sum + (l.accuracy_score || 0), 0) / previous.length : recentAvg;
      
      let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
      if (recentAvg - previousAvg > 5) recentTrend = 'improving';
      else if (previousAvg - recentAvg > 5) recentTrend = 'declining';

      return {
        overallAccuracy,
        byType,
        totalEvaluated: logs.length,
        recentTrend,
        logs: logs.slice(0, 20),
      };
    },
    enabled: !!venueId,
  });
}

// Hook to get learning insights
export function useLearningInsights(venueId?: string) {
  return useQuery({
    queryKey: ['learning-insights', venueId],
    queryFn: async () => {
      let query = supabase
        .from('ai_learning_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (venueId) {
        query = query.or(`venue_id.eq.${venueId},venue_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LearningInsight[];
    },
    enabled: true,
  });
}

// Trigger learning loop analysis
export function useTriggerLearningAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (venueId: string) => {
      const { data, error } = await supabase.functions.invoke('ai-learning-loop', {
        body: { venueId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, venueId) => {
      queryClient.invalidateQueries({ queryKey: ['ai-accuracy', venueId] });
      queryClient.invalidateQueries({ queryKey: ['learning-insights', venueId] });
    },
  });
}
