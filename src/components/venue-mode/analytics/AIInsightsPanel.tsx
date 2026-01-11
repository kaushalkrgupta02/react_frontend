import { useState } from 'react';
import { Sparkles, Users, TrendingUp, AlertTriangle, Clock, RefreshCw, Loader2, Gift, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Prediction {
  type: 'demand' | 'staffing' | 'noShow' | 'promo' | 'revenue';
  title: string;
  value: string;
  confidence: number;
  insight: string;
  action?: string;
  promoSuggestion?: {
    title: string;
    description: string;
    timing: string;
  };
}

interface AIInsightsPanelProps {
  predictions: Prediction[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onCreatePromo?: () => void;
}

export default function AIInsightsPanel({ predictions, isLoading, onRefresh, onCreatePromo }: AIInsightsPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  const getIcon = (type: Prediction['type']) => {
    switch (type) {
      case 'demand':
        return TrendingUp;
      case 'staffing':
        return Users;
      case 'noShow':
        return AlertTriangle;
      case 'promo':
        return Gift;
      default:
        return Clock;
    }
  };

  const getIconColor = (type: Prediction['type']) => {
    switch (type) {
      case 'demand':
        return 'text-blue-400';
      case 'staffing':
        return 'text-emerald-400';
      case 'noShow':
        return 'text-amber-400';
      case 'promo':
        return 'text-accent';
      default:
        return 'text-primary';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  // Check if there's a promo prediction
  const promoPrediction = predictions.find(p => p.type === 'promo');

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <span className="text-sm font-medium text-foreground">AI Insights</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">AI Insights</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Predictions */}
      {predictions.length > 0 ? (
        <div className="space-y-3">
          {predictions.filter(p => p.type !== 'promo').map((prediction, index) => {
            const Icon = getIcon(prediction.type);
            return (
              <div
                key={index}
                className="bg-card/50 backdrop-blur-sm rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-secondary ${getIconColor(prediction.type)}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{prediction.title}</p>
                      <p className="text-lg font-bold text-foreground font-display">
                        {prediction.value}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium ${getConfidenceColor(prediction.confidence)}`}>
                    {prediction.confidence}% conf
                  </span>
                </div>
                
                <p className="text-xs text-muted-foreground">{prediction.insight}</p>
                
                {prediction.action && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                  >
                    {prediction.action}
                  </Button>
                )}
              </div>
            );
          })}

          {/* Promo Suggestion Card - Special styling */}
          {promoPrediction && (
            <div className="bg-gradient-to-r from-accent/20 to-primary/20 rounded-lg p-3 border border-accent/30 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-accent/20">
                    <Gift className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{promoPrediction.title}</p>
                    <p className="text-lg font-bold text-accent font-display">
                      {promoPrediction.value}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-medium ${getConfidenceColor(promoPrediction.confidence)}`}>
                  {promoPrediction.confidence}% conf
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground">{promoPrediction.insight}</p>
              
              {promoPrediction.promoSuggestion && (
                <div className="bg-card/50 rounded-md p-2 border border-border/50">
                  <p className="text-xs font-medium text-foreground">{promoPrediction.promoSuggestion.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{promoPrediction.promoSuggestion.description}</p>
                  <p className="text-[10px] text-accent mt-1">📅 {promoPrediction.promoSuggestion.timing}</p>
                </div>
              )}
              
              {onCreatePromo && (
                <Button
                  size="sm"
                  onClick={onCreatePromo}
                  className="w-full h-8 text-xs bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Create AI Promo
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No predictions available</p>
          <p className="text-xs text-muted-foreground">
            Add more booking data to enable AI insights
          </p>
        </div>
      )}

      {/* Quick Action for Promo if no promo prediction */}
      {predictions.length > 0 && !promoPrediction && onCreatePromo && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCreatePromo}
          className="w-full h-8 text-xs border-accent/30 text-accent hover:bg-accent/10"
        >
          <Gift className="w-3 h-3 mr-1" />
          Generate AI Promo Suggestions
        </Button>
      )}

      {/* AI Disclaimer */}
      <p className="text-[10px] text-muted-foreground text-center">
        Predictions powered by AI based on your venue data
      </p>
    </div>
  );
}
