import { useState, useEffect } from 'react';
import { Brain, Users, Target, TrendingUp, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useSegmentSummaries, useSegmentReach, usePredictedRedemption, useRunSegmentation, SegmentSummary } from '@/hooks/useCustomerSegments';

const SEGMENT_ICONS: Record<string, string> = {
  'High Spender': '💎',
  'Weekend Warrior': '🎉',
  'Promo Hunter': '🎯',
  'VIP Regular': '👑',
  'Casual Visitor': '☕',
  'At Risk': '⚠️',
  'New Customer': '🆕',
  'Loyal Customer': '❤️',
};

const SEGMENT_COLORS: Record<string, string> = {
  'High Spender': 'border-amber-500/50 bg-amber-500/10',
  'Weekend Warrior': 'border-purple-500/50 bg-purple-500/10',
  'Promo Hunter': 'border-green-500/50 bg-green-500/10',
  'VIP Regular': 'border-primary/50 bg-primary/10',
  'Casual Visitor': 'border-blue-500/50 bg-blue-500/10',
  'At Risk': 'border-red-500/50 bg-red-500/10',
  'New Customer': 'border-cyan-500/50 bg-cyan-500/10',
  'Loyal Customer': 'border-pink-500/50 bg-pink-500/10',
};

interface SmartTargetingPanelProps {
  selectedSegments: string[];
  onSegmentsChange: (segments: string[]) => void;
  discountType: string;
}

export default function SmartTargetingPanel({
  selectedSegments,
  onSegmentsChange,
  discountType,
}: SmartTargetingPanelProps) {
  const { data: segments = [], isLoading: segmentsLoading, refetch } = useSegmentSummaries();
  const { data: reachData } = useSegmentReach(selectedSegments);
  const { data: redemptionData } = usePredictedRedemption(discountType, selectedSegments);
  const runSegmentation = useRunSegmentation();

  const toggleSegment = (name: string) => {
    if (selectedSegments.includes(name)) {
      onSegmentsChange(selectedSegments.filter((s) => s !== name));
    } else {
      onSegmentsChange([...selectedSegments, name]);
    }
  };

  const selectAllHighValue = () => {
    const highValueSegments = segments
      .filter((s) => s.avgClv > 0 && s.avgPromoResponsiveness > 0.3)
      .map((s) => s.name);
    onSegmentsChange(highValueSegments);
  };

  const handleRefreshSegments = async () => {
    await runSegmentation.mutateAsync();
    refetch();
  };

  if (segmentsLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Smart Target Audience</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const hasSegments = segments.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Smart Target Audience</span>
          <Badge variant="outline" className="text-xs">AI-Powered</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefreshSegments}
          disabled={runSegmentation.isPending}
          className="h-7 px-2"
        >
          {runSegmentation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </Button>
      </div>

      {!hasSegments ? (
        <div className="p-4 bg-secondary/50 rounded-lg text-center space-y-3">
          <Sparkles className="w-8 h-8 mx-auto text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">No segments calculated yet</p>
            <p className="text-xs text-muted-foreground">
              Run AI segmentation to analyze your customers
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleRefreshSegments}
            disabled={runSegmentation.isPending}
          >
            {runSegmentation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-3 h-3 mr-2" />
                Run Segmentation
              </>
            )}
          </Button>
        </div>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllHighValue}
              className="text-xs"
            >
              <Target className="w-3 h-3 mr-1" />
              High-Value Segments
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSegmentsChange([])}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>

          {/* Segment Grid */}
          <div className="grid grid-cols-2 gap-2">
            {segments.map((segment) => (
              <button
                key={segment.name}
                onClick={() => toggleSegment(segment.name)}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  selectedSegments.includes(segment.name)
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/50'
                    : SEGMENT_COLORS[segment.name] || 'border-border bg-card hover:bg-secondary/50'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{SEGMENT_ICONS[segment.name] || '👤'}</span>
                    <span className="font-medium text-sm text-foreground">{segment.name}</span>
                  </div>
                  {selectedSegments.includes(segment.name) && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-[10px] text-primary-foreground">✓</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{segment.count} customers</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    <span>{Math.round(segment.avgPromoResponsiveness * 100)}% promo response</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Reach & Prediction Stats */}
          {selectedSegments.length > 0 && (
            <div className="p-3 bg-card rounded-lg border border-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estimated Reach</span>
                <span className="font-bold text-foreground">
                  {reachData?.reach || 0} customers
                </span>
              </div>
              <Progress
                value={reachData ? (reachData.reach / Math.max(reachData.total, 1)) * 100 : 0}
                className="h-2"
              />
              
              {redemptionData && (
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-primary" />
                    <span className="text-sm text-muted-foreground">Predicted Redemption</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-green-500">{redemptionData.rate}%</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({redemptionData.confidence}% confidence)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
