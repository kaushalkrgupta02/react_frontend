import { useMemo } from 'react';
import { Package, TrendingUp, CheckCircle, Clock, Banknote } from 'lucide-react';
import { isToday, isThisWeek, isThisMonth, format, subDays } from 'date-fns';
import { StatsSummaryGrid, TimePeriodBreakdown, HorizontalBarChart, TopItemsList } from '../stats';
import { formatPrice } from '@/types/venue-mode';
import type { PackagePurchase } from '@/hooks/usePackagePurchases';

interface PackageStatsProps {
  purchases: PackagePurchase[];
  isLoading: boolean;
}

export default function PackageStats({ purchases, isLoading }: PackageStatsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate stats
  const stats = useMemo(() => {
    const today = purchases.filter(p => isToday(new Date(p.purchased_at)));
    const thisWeek = purchases.filter(p => isThisWeek(new Date(p.purchased_at)));
    const thisMonth = purchases.filter(p => isThisMonth(new Date(p.purchased_at)));

    return {
      total: purchases.length,
      totalRevenue: purchases.reduce((sum, p) => sum + (p.total_paid || 0), 0),
      todayCount: today.length,
      todayRevenue: today.reduce((sum, p) => sum + (p.total_paid || 0), 0),
      weekCount: thisWeek.length,
      weekRevenue: thisWeek.reduce((sum, p) => sum + (p.total_paid || 0), 0),
      monthCount: thisMonth.length,
      monthRevenue: thisMonth.reduce((sum, p) => sum + (p.total_paid || 0), 0),
      active: purchases.filter(p => p.status === 'active').length,
      partial: purchases.filter(p => p.status === 'partially_redeemed').length,
      completed: purchases.filter(p => p.status === 'fully_redeemed').length,
    };
  }, [purchases]);

  // 7-day trend
  const trendData = useMemo(() => {
    const last7Days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const count = purchases.filter(p => 
        format(new Date(p.purchased_at), 'yyyy-MM-dd') === date
      ).length;
      last7Days.push(count);
    }
    return last7Days;
  }, [purchases]);

  // Revenue trend
  const revenueTrend = useMemo(() => {
    const last7Days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const revenue = purchases
        .filter(p => format(new Date(p.purchased_at), 'yyyy-MM-dd') === date)
        .reduce((sum, p) => sum + (p.total_paid || 0), 0);
      last7Days.push(revenue);
    }
    return last7Days;
  }, [purchases]);

  // Popular packages
  const popularPackages = useMemo(() => {
    const counts: Record<string, number> = {};
    purchases.forEach(p => {
      const name = p.package?.name || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [purchases]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <StatsSummaryGrid
        items={[
          {
            label: 'Packages Sold',
            value: stats.total,
            icon: TrendingUp,
            iconColor: 'hsl(var(--primary))',
            trendData,
          },
          {
            label: 'Active',
            value: stats.active,
            icon: Clock,
            iconColor: 'hsl(142, 71%, 45%)',
          },
          {
            label: 'Revenue',
            value: formatPrice(stats.totalRevenue),
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
          { label: 'Today', count: stats.todayCount, revenue: stats.todayRevenue },
          { label: 'This Week', count: stats.weekCount, revenue: stats.weekRevenue },
          { label: 'This Month', count: stats.monthCount, revenue: stats.monthRevenue },
        ]}
      />

      {/* Redemption Status */}
      <HorizontalBarChart
        title="Redemption Status"
        items={[
          { label: 'Active', value: stats.active, color: 'hsl(142, 71%, 45%)' },
          { label: 'Partially Used', value: stats.partial, color: 'hsl(38, 92%, 50%)' },
          { label: 'Fully Redeemed', value: stats.completed, color: 'hsl(var(--muted-foreground))' },
        ]}
      />

      {/* Popular Packages */}
      {popularPackages.length > 0 && (
        <TopItemsList
          title="Top Selling Packages"
          items={popularPackages}
          icon={Package}
          valueLabel="sold"
        />
      )}
    </div>
  );
}
