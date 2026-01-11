import { useMemo } from 'react';
import { Users, CheckCircle2, Banknote, Ticket, Crown, TrendingUp } from 'lucide-react';
import { isToday, isThisWeek, isThisMonth, format, subDays } from 'date-fns';
import { StatsSummaryGrid, TimePeriodBreakdown, HorizontalBarChart, TopItemsList } from '../stats';
import { formatPrice } from '@/types/venue-mode';
import type { VenuePass, PassStats as PassStatsType } from '@/types/venue-mode';

interface PassStatsProps {
  passes: VenuePass[];
  stats: PassStatsType;
  isLoading: boolean;
}

export default function PassStats({ passes, stats, isLoading }: PassStatsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Time period breakdown
  const periodStats = useMemo(() => {
    const today = passes.filter(p => isToday(new Date(p.purchase_date)));
    const thisWeek = passes.filter(p => isThisWeek(new Date(p.purchase_date)));
    const thisMonth = passes.filter(p => isThisMonth(new Date(p.purchase_date)));

    return {
      todayCount: today.length,
      todayRevenue: today.reduce((sum, p) => sum + Number(p.price || 0), 0),
      weekCount: thisWeek.length,
      weekRevenue: thisWeek.reduce((sum, p) => sum + Number(p.price || 0), 0),
      monthCount: thisMonth.length,
      monthRevenue: thisMonth.reduce((sum, p) => sum + Number(p.price || 0), 0),
    };
  }, [passes]);

  // 7-day trend
  const trendData = useMemo(() => {
    const last7Days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const count = passes.filter(p => p.purchase_date === date).length;
      last7Days.push(count);
    }
    return last7Days;
  }, [passes]);

  // Revenue trend
  const revenueTrend = useMemo(() => {
    const last7Days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const revenue = passes
        .filter(p => p.purchase_date === date)
        .reduce((sum, p) => sum + Number(p.price || 0), 0);
      last7Days.push(revenue);
    }
    return last7Days;
  }, [passes]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <StatsSummaryGrid
        items={[
          {
            label: 'Total Sold',
            value: stats.total,
            icon: TrendingUp,
            iconColor: 'hsl(var(--primary))',
            trendData,
          },
          {
            label: 'Redeemed',
            value: stats.used,
            icon: CheckCircle2,
            iconColor: 'hsl(142, 71%, 45%)',
          },
          {
            label: 'Revenue',
            value: formatPrice(stats.revenue),
            icon: Banknote,
            iconColor: 'hsl(217, 91%, 60%)',
            trendData: revenueTrend,
          },
        ]}
      />

      {/* Time Period Breakdown */}
      <TimePeriodBreakdown
        title="Sales by Period"
        periods={[
          { label: 'Today', count: periodStats.todayCount, revenue: periodStats.todayRevenue },
          { label: 'This Week', count: periodStats.weekCount, revenue: periodStats.weekRevenue },
          { label: 'This Month', count: periodStats.monthCount, revenue: periodStats.monthRevenue },
        ]}
      />

      {/* Pass Type Breakdown */}
      <HorizontalBarChart
        title="Pass Types"
        items={[
          { label: 'Entry Pass', value: stats.entry, color: 'hsl(217, 91%, 60%)' },
          { label: 'VIP Pass', value: stats.vip, color: 'hsl(271, 91%, 65%)' },
        ]}
      />

      {/* Status Breakdown */}
      <HorizontalBarChart
        title="Pass Status"
        items={[
          { label: 'Active', value: stats.active, color: 'hsl(142, 71%, 45%)' },
          { label: 'Used', value: stats.used, color: 'hsl(var(--muted-foreground))' },
        ]}
      />

      {/* VIP Free Items */}
      {stats.vip > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">VIP Perks</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Free Items Claimed</p>
                <p className="text-sm text-muted-foreground">VIP welcome drinks</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-foreground">
              {stats.freeItemsClaimed}
              <span className="text-sm font-normal text-muted-foreground">/{stats.vip}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
