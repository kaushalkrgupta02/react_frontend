import { useState } from 'react';
import { 
  Zap, 
  Users, 
  Target, 
  Clock, 
  Calendar,
  Loader2,
  CheckCircle,
  Sparkles,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  useFillTonightSegments, 
  useRunSmartMatching,
  useVenueRecommendations,
  useActionRecommendation
} from '@/hooks/useSmartMatching';

function getDayName(day: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[day] || '';
}

function getHourLabel(hour: number): string {
  if (hour === 0) return '12AM';
  if (hour < 12) return `${hour}AM`;
  if (hour === 12) return '12PM';
  return `${hour - 12}PM`;
}

interface SmartMatchingPanelProps {
  venueId: string | undefined;
  venueName?: string;
}

export default function SmartMatchingPanel({ venueId, venueName }: SmartMatchingPanelProps) {
  const { data: fillTonightSegments = [], isLoading: segmentsLoading } = useFillTonightSegments(venueId);
  const { data: recommendations = [], isLoading: recsLoading } = useVenueRecommendations(venueId);
  const runMatching = useRunSmartMatching();
  const actionRec = useActionRecommendation();
  const [isRunningFillTonight, setIsRunningFillTonight] = useState(false);

  const handleFillTonight = async () => {
    if (!venueId) return;
    setIsRunningFillTonight(true);
    try {
      await runMatching.mutateAsync({
        venueId,
        matchType: 'venue_to_customer',
      });
      toast.success('Smart matching complete! Best segments identified.');
    } catch (error) {
      toast.error('Failed to run smart matching');
    } finally {
      setIsRunningFillTonight(false);
    }
  };

  const handleActionRecommendation = async (recId: string) => {
    try {
      await actionRec.mutateAsync({ recommendationId: recId });
      toast.success('Recommendation marked as actioned');
    } catch (error) {
      toast.error('Failed to action recommendation');
    }
  };

  const today = new Date();
  const dayName = getDayName(today.getDay());
  const isLoading = segmentsLoading || recsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5 text-primary" />
          Smart Matching
        </CardTitle>
        <CardDescription>
          AI-powered customer targeting for {venueName || 'your venue'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Fill Tonight CTA */}
        <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Fill Tonight
              </h3>
              <p className="text-sm text-muted-foreground">
                Target the best customer segments for {dayName}'s slow period
              </p>
            </div>
            <Button
              onClick={handleFillTonight}
              disabled={isRunningFillTonight}
              className="bg-primary"
            >
              {isRunningFillTonight ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run AI Match
                </>
              )}
            </Button>
          </div>

          {/* Suggested Segments */}
          {fillTonightSegments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-primary/20">
              <p className="text-xs text-muted-foreground mb-2">
                Recommended segments for tonight:
              </p>
              <div className="flex flex-wrap gap-2">
                {fillTonightSegments.slice(0, 4).map((seg) => (
                  <Badge key={seg.name} variant="secondary" className="text-xs">
                    {seg.name} ({seg.count})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Recommendations */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            AI Recommendations
            {recommendations.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {recommendations.filter(r => !r.was_actioned).length} pending
              </Badge>
            )}
          </h3>

          {recommendations.length === 0 ? (
            <div className="text-center py-6 bg-secondary/30 rounded-lg">
              <Target className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No recommendations yet. Run "Fill Tonight" to generate.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recommendations.slice(0, 10).map((rec) => (
                <div
                  key={rec.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    rec.was_actioned
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-card border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {rec.target_segment}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(rec.match_score || 0)}% match
                        </span>
                        {rec.was_actioned && (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                        {rec.match_reasoning}
                      </p>
                      
                      {/* Timing Recommendation */}
                      {rec.timing_recommendation && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {rec.timing_recommendation.best_day !== undefined && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {getDayName(rec.timing_recommendation.best_day)}
                            </span>
                          )}
                          {rec.timing_recommendation.best_hour !== undefined && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getHourLabel(rec.timing_recommendation.best_hour)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Match Factors */}
                      {rec.match_factors && (
                        <div className="flex gap-2 mt-2">
                          {Object.entries(rec.match_factors).slice(0, 3).map(([key, value]) => (
                            <div key={key} className="text-xs">
                              <span className="text-muted-foreground">{key}:</span>{' '}
                              <span className="font-medium">{Math.round(Number(value) * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {!rec.was_actioned && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleActionRecommendation(rec.id)}
                        disabled={actionRec.isPending}
                        className="ml-2"
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="p-3 bg-secondary/30 rounded-lg">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Matching Performance
          </h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold">{recommendations.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-500">
                {recommendations.filter(r => r.was_actioned).length}
              </p>
              <p className="text-xs text-muted-foreground">Actioned</p>
            </div>
            <div>
              <p className="text-lg font-bold text-primary">
                {recommendations.length > 0
                  ? Math.round(
                      recommendations.reduce((sum, r) => sum + (r.match_score || 0), 0) /
                        recommendations.length
                    )
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
