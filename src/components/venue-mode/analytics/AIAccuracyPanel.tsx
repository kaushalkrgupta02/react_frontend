import { TrendingUp, TrendingDown, Minus, Brain, RefreshCw, Target, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAIAccuracyStats, useLearningInsights, useTriggerLearningAnalysis } from '@/hooks/useAIAccuracy';
import { toast } from 'sonner';

interface AIAccuracyPanelProps {
  venueId?: string;
}

export default function AIAccuracyPanel({ venueId }: AIAccuracyPanelProps) {
  const { data: accuracyStats, isLoading: statsLoading } = useAIAccuracyStats(venueId);
  const { data: insights, isLoading: insightsLoading } = useLearningInsights(venueId);
  const triggerAnalysis = useTriggerLearningAnalysis();

  const handleAnalyze = async () => {
    if (!venueId) return;
    try {
      await triggerAnalysis.mutateAsync(venueId);
      toast.success('Learning analysis complete');
    } catch (error) {
      toast.error('Analysis failed');
    }
  };

  const getTrendIcon = () => {
    if (!accuracyStats) return <Minus className="w-4 h-4 text-muted-foreground" />;
    switch (accuracyStats.recentTrend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-green-400';
    if (accuracy >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return <Brain className="w-4 h-4 text-purple-400" />;
      case 'improvement':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'anomaly':
        return <Target className="w-4 h-4 text-amber-400" />;
      default:
        return <Lightbulb className="w-4 h-4 text-blue-400" />;
    }
  };

  if (statsLoading || insightsLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Accuracy Stats */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              AI Model Performance
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAnalyze}
              disabled={triggerAnalysis.isPending || !venueId}
            >
              <RefreshCw className={`w-4 h-4 ${triggerAnalysis.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {accuracyStats && accuracyStats.totalEvaluated > 0 ? (
            <>
              {/* Overall Accuracy */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Accuracy</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getAccuracyColor(accuracyStats.overallAccuracy)}`}>
                      {accuracyStats.overallAccuracy.toFixed(0)}%
                    </span>
                    {getTrendIcon()}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Predictions</p>
                  <p className="text-lg font-medium text-foreground">{accuracyStats.totalEvaluated}</p>
                </div>
              </div>

              {/* Accuracy by Type */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">By Prediction Type</p>
                {Object.entries(accuracyStats.byType).map(([type, stats]) => (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{type}</span>
                      <span className={getAccuracyColor(stats.accuracy)}>
                        {stats.accuracy.toFixed(0)}% ({stats.count})
                      </span>
                    </div>
                    <Progress value={stats.accuracy} className="h-1.5" />
                  </div>
                ))}
              </div>

              {/* Trend Indicator */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  {getTrendIcon()}
                  <span className="text-muted-foreground">
                    {accuracyStats.recentTrend === 'improving' && 'Model accuracy is improving'}
                    {accuracyStats.recentTrend === 'declining' && 'Model accuracy is declining'}
                    {accuracyStats.recentTrend === 'stable' && 'Model accuracy is stable'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Brain className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No evaluated predictions yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Accuracy will be calculated as predictions are verified
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Insights */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights && insights.length > 0 ? (
            <div className="space-y-3">
              {insights.slice(0, 5).map((insight) => (
                <div
                  key={insight.id}
                  className="p-3 rounded-lg bg-secondary/50 border border-border"
                >
                  <div className="flex items-start gap-2">
                    {getInsightIcon(insight.insight_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {insight.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                          {insight.insight_type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {insight.confidence}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Lightbulb className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No learning insights yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Insights will appear as the AI learns from outcomes
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
