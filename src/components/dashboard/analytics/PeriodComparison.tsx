import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PeriodStats {
  count: number;
  revenue: number;
  previousCount: number;
  previousRevenue: number;
  changePercent: number;
  revenueChangePercent: number;
}

interface PeriodComparisonProps {
  bookingStats: PeriodStats;
  passStats: PeriodStats;
  packageStats: PeriodStats;
  promoStats: PeriodStats;
  isLoading?: boolean;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `Rp ${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `Rp ${(amount / 1000).toFixed(0)}K`;
  }
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function StatRow({ 
  label, 
  current, 
  previous, 
  changePercent,
  isRevenue = false,
}: { 
  label: string; 
  current: number; 
  previous: number; 
  changePercent: number;
  isRevenue?: boolean;
}) {
  const TrendIcon = changePercent > 0 ? TrendingUp : changePercent < 0 ? TrendingDown : Minus;
  const trendColor = changePercent > 0 ? 'text-green-500' : changePercent < 0 ? 'text-red-500' : 'text-muted-foreground';
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {isRevenue ? formatCurrency(current) : current}
        </span>
        <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>{Math.abs(changePercent)}%</span>
        </div>
      </div>
    </div>
  );
}

export function PeriodComparison({ 
  bookingStats, 
  passStats, 
  packageStats, 
  promoStats,
  isLoading 
}: PeriodComparisonProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Period Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Period Comparison</CardTitle>
        <p className="text-xs text-muted-foreground">vs. previous period</p>
      </CardHeader>
      <CardContent className="space-y-0">
        <StatRow 
          label="Table Bookings" 
          current={bookingStats.count} 
          previous={bookingStats.previousCount}
          changePercent={bookingStats.changePercent}
        />
        <StatRow 
          label="Passes Sold" 
          current={passStats.count} 
          previous={passStats.previousCount}
          changePercent={passStats.changePercent}
        />
        <StatRow 
          label="Pass Revenue" 
          current={passStats.revenue} 
          previous={passStats.previousRevenue}
          changePercent={passStats.revenueChangePercent}
          isRevenue
        />
        <StatRow 
          label="Packages Sold" 
          current={packageStats.count} 
          previous={packageStats.previousCount}
          changePercent={packageStats.changePercent}
        />
        <StatRow 
          label="Package Revenue" 
          current={packageStats.revenue} 
          previous={packageStats.previousRevenue}
          changePercent={packageStats.revenueChangePercent}
          isRevenue
        />
        <StatRow 
          label="Promos Redeemed" 
          current={promoStats.count} 
          previous={promoStats.previousCount}
          changePercent={promoStats.changePercent}
        />
      </CardContent>
    </Card>
  );
}
