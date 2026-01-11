import { useMemo } from 'react';
import { PackagePurchase } from '@/hooks/usePackagePurchases';
import { StatsSummaryGrid } from '@/components/venue-mode/stats/StatsSummaryGrid';
import { TimePeriodBreakdown } from '@/components/venue-mode/stats/TimePeriodBreakdown';
import { HorizontalBarChart } from '@/components/venue-mode/stats/HorizontalBarChart';
import { TopItemsList } from '@/components/venue-mode/stats/TopItemsList';
import { startOfDay, startOfWeek, startOfMonth, parseISO, format } from 'date-fns';
import { Loader2, Package, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { formatPrice } from '@/types/venue-mode';

interface PackagesTabProps {
  purchases: PackagePurchase[];
  isLoading: boolean;
}

export function PackagesTab({ purchases, isLoading }: PackagesTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const stats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    
    const todayPurchases = purchases.filter(p => parseISO(p.purchased_at) >= today);
    const weekPurchases = purchases.filter(p => parseISO(p.purchased_at) >= weekStart);
    const monthPurchases = purchases.filter(p => parseISO(p.purchased_at) >= monthStart);
    
    return {
      total: purchases.length,
      totalRevenue: purchases.reduce((sum, p) => sum + (Number(p.total_paid) || 0), 0),
      active: purchases.filter(p => p.status === 'active').length,
      partiallyRedeemed: purchases.filter(p => p.status === 'partially_redeemed').length,
      fullyRedeemed: purchases.filter(p => p.status === 'fully_redeemed').length,
      today: { count: todayPurchases.length, revenue: todayPurchases.reduce((sum, p) => sum + (Number(p.total_paid) || 0), 0) },
      week: { count: weekPurchases.length, revenue: weekPurchases.reduce((sum, p) => sum + (Number(p.total_paid) || 0), 0) },
      month: { count: monthPurchases.length, revenue: monthPurchases.reduce((sum, p) => sum + (Number(p.total_paid) || 0), 0) },
    };
  }, [purchases]);

  const trendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      const dateStr = format(date, 'yyyy-MM-dd');
      return purchases.filter(p => format(parseISO(p.purchased_at), 'yyyy-MM-dd') === dateStr).length;
    });
  }, [purchases]);

  const topPackages = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    purchases.forEach(p => {
      const name = p.package?.name || 'Unknown';
      counts[name] = counts[name] || { name, count: 0 };
      counts[name].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5).map(p => ({ name: p.name, value: p.count }));
  }, [purchases]);

  return (
    <div className="space-y-6">
      <StatsSummaryGrid
        items={[
          { label: 'Total Sold', value: stats.total, icon: Package, trendData },
          { label: 'Revenue', value: formatPrice(stats.totalRevenue), icon: DollarSign },
          { label: 'Active', value: stats.active, icon: CheckCircle, iconColor: 'hsl(142, 76%, 36%)' },
          { label: 'In Progress', value: stats.partiallyRedeemed, icon: Clock, iconColor: 'hsl(45, 93%, 47%)' },
        ]}
      />

      <TimePeriodBreakdown
        periods={[
          { label: 'Today', count: stats.today.count, revenue: stats.today.revenue },
          { label: 'This Week', count: stats.week.count, revenue: stats.week.revenue },
          { label: 'This Month', count: stats.month.count, revenue: stats.month.revenue },
        ]}
        showRevenue
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HorizontalBarChart title="Redemption Status" items={[
          { label: 'Active', value: stats.active, color: 'hsl(142, 76%, 36%)' },
          { label: 'Partially Used', value: stats.partiallyRedeemed, color: 'hsl(45, 93%, 47%)' },
          { label: 'Fully Redeemed', value: stats.fullyRedeemed, color: 'hsl(220, 14%, 46%)' },
        ]} />
        {topPackages.length > 0 && <TopItemsList title="Top Selling Packages" items={topPackages} />}
      </div>
    </div>
  );
}
