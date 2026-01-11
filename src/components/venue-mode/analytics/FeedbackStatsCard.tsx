import { Star, ThumbsUp, Clock, MessageSquare, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useVenueFeedbackStats, useVenueFeedback } from '@/hooks/useFeedback';

interface FeedbackStatsCardProps {
  venueId?: string;
}

export default function FeedbackStatsCard({ venueId }: FeedbackStatsCardProps) {
  const stats = useVenueFeedbackStats(venueId);
  const { data: recentFeedback, isLoading } = useVenueFeedback(venueId);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-400';
    if (rating >= 3) return 'text-amber-400';
    return 'text-red-400';
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Guest Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.totalFeedback > 0 ? (
          <>
            {/* Overall Stats */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Rating</p>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${getRatingColor(stats.averageOverall)}`}>
                    {stats.averageOverall.toFixed(1)}
                  </span>
                  {renderStars(stats.averageOverall)}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <div className="flex items-center gap-1 justify-end">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-lg font-medium text-foreground">{stats.totalFeedback}</span>
                </div>
              </div>
            </div>

            {/* Detailed Ratings */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className={getRatingColor(stats.averageService)}>
                    {stats.averageService.toFixed(1)}
                  </span>
                </div>
                <Progress value={stats.averageService * 20} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Atmosphere</span>
                  <span className={getRatingColor(stats.averageAtmosphere)}>
                    {stats.averageAtmosphere.toFixed(1)}
                  </span>
                </div>
                <Progress value={stats.averageAtmosphere * 20} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Value</span>
                  <span className={getRatingColor(stats.averageValue)}>
                    {stats.averageValue.toFixed(1)}
                  </span>
                </div>
                <Progress value={stats.averageValue * 20} className="h-1.5" />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span className="text-xs">Would Recommend</span>
                </div>
                <p className={`text-lg font-bold ${stats.recommendRate >= 70 ? 'text-green-400' : 'text-amber-400'}`}>
                  {stats.recommendRate.toFixed(0)}%
                </p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Avg Wait Time</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {stats.avgWaitTime.toFixed(0)} min
                </p>
              </div>
            </div>

            {/* Recent Feedback */}
            {recentFeedback && recentFeedback.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Recent Comments
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {recentFeedback
                    .filter(f => f.feedback_text)
                    .slice(0, 3)
                    .map((feedback) => (
                      <div key={feedback.id} className="p-2 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-1 mb-1">
                          {renderStars(feedback.overall_rating)}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          "{feedback.feedback_text}"
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No guest feedback yet
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Feedback will appear after guests submit reviews
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
