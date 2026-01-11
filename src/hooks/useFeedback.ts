import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VisitFeedback {
  id: string;
  booking_id: string | null;
  venue_id: string;
  user_id: string;
  overall_rating: number;
  service_rating: number | null;
  atmosphere_rating: number | null;
  value_rating: number | null;
  wait_time_minutes: number | null;
  would_recommend: boolean | null;
  feedback_text: string | null;
  visited_at: string;
  created_at: string;
}

interface FeedbackInput {
  bookingId?: string;
  venueId: string;
  overallRating: number;
  serviceRating?: number;
  atmosphereRating?: number;
  valueRating?: number;
  waitTimeMinutes?: number;
  wouldRecommend?: boolean;
  feedbackText?: string;
  visitedAt?: string;
}

export function useSubmitFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedback: FeedbackInput) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('visit_feedback')
        .insert({
          booking_id: feedback.bookingId || null,
          venue_id: feedback.venueId,
          user_id: user.id,
          overall_rating: feedback.overallRating,
          service_rating: feedback.serviceRating,
          atmosphere_rating: feedback.atmosphereRating,
          value_rating: feedback.valueRating,
          wait_time_minutes: feedback.waitTimeMinutes,
          would_recommend: feedback.wouldRecommend,
          feedback_text: feedback.feedbackText,
          visited_at: feedback.visitedAt || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['venue-feedback'] });
    },
  });
}

export function useUserFeedback() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['visit-feedback', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('visit_feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VisitFeedback[];
    },
    enabled: !!user,
  });
}

export function useVenueFeedback(venueId?: string) {
  return useQuery({
    queryKey: ['venue-feedback', venueId],
    queryFn: async () => {
      if (!venueId) return [];

      const { data, error } = await supabase
        .from('visit_feedback')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VisitFeedback[];
    },
    enabled: !!venueId,
  });
}

export function useVenueFeedbackStats(venueId?: string) {
  const { data: feedback } = useVenueFeedback(venueId);

  if (!feedback || feedback.length === 0) {
    return {
      averageOverall: 0,
      averageService: 0,
      averageAtmosphere: 0,
      averageValue: 0,
      totalFeedback: 0,
      recommendRate: 0,
      avgWaitTime: 0,
    };
  }

  const avgField = (field: keyof VisitFeedback) => {
    const values = feedback.filter(f => f[field] !== null).map(f => f[field] as number);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  const recommendCount = feedback.filter(f => f.would_recommend === true).length;
  const recommendableCount = feedback.filter(f => f.would_recommend !== null).length;

  return {
    averageOverall: avgField('overall_rating'),
    averageService: avgField('service_rating'),
    averageAtmosphere: avgField('atmosphere_rating'),
    averageValue: avgField('value_rating'),
    totalFeedback: feedback.length,
    recommendRate: recommendableCount > 0 ? (recommendCount / recommendableCount) * 100 : 0,
    avgWaitTime: avgField('wait_time_minutes'),
  };
}
