import { useMemo } from 'react';
import { VenuePass, PassStats as PassStatsType } from '@/types/venue-mode';
import { StatsSummaryGrid } from '@/components/venue-mode/stats/StatsSummaryGrid';
import { TimePeriodBreakdown } from '@/components/venue-mode/stats/TimePeriodBreakdown';
import { HorizontalBarChart } from '@/components/venue-mode/stats/HorizontalBarChart';
import { startOfDay, startOfWeek, startOfMonth, parseISO, format } from 'date-fns';
import { Loader2, Ticket, DollarSign, CheckCircle, Sparkles } from 'lucide-react';
import { formatPrice } from '@/types/venue-mode';

interface PassesTabProps {
  passes: VenuePass[];
  stats: PassStatsType;
  isLoading: boolean;
}

export function PassesTab({ passes, stats, isLoading }: PassesTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const periodStats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    
    const todayPasses = passes.filter(p => parseISO(p.purchase_date) >= today);
    const weekPasses = passes.filter(p => parseISO(p.purchase_date) >= weekStart);
    const monthPasses = passes.filter(p => parseISO(p.purchase_date) >= monthStart);
    
    return {
      today: { count: todayPasses.length, revenue: todayPasses.reduce((sum, p) => sum + (Number(p.price) || 0), 0) },
      week: { count: weekPasses.length, revenue: weekPasses.reduce((sum, p) => sum + (Number(p.price) || 0), 0) },
      month: { count: monthPasses.length, revenue: monthPasses.reduce((sum, p) => sum + (Number(p.price) || 0), 0) },
    };
  }, [passes]);

  const trendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      return passes.filter(p => p.purchase_date === format(date, 'yyyy-MM-dd')).length;
    });
  }, [passes]);

  return (
    <div className="space-y-6">
      <StatsSummaryGrid
        items={[
          { label: 'Total Sold', value: stats.total, icon: Ticket, trendData },
          { label: 'Revenue', value: formatPrice(stats.revenue), icon: DollarSign },
          { label: 'Active', value: stats.active, icon: CheckCircle, iconColor: 'hsl(142, 76%, 36%)' },
          { label: 'VIP Passes', value: stats.vip, icon: Sparkles, iconColor: 'hsl(280, 85%, 65%)' },
        ]}
      />

      <TimePeriodBreakdown
        periods={[
          { label: 'Today', count: periodStats.today.count, revenue: periodStats.today.revenue },
          { label: 'This Week', count: periodStats.week.count, revenue: periodStats.week.revenue },
          { label: 'This Month', count: periodStats.month.count, revenue: periodStats.month.revenue },
        ]}
        showRevenue
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HorizontalBarChart title="Pass Types" items={[
          { label: 'Entry Pass', value: stats.entry, color: 'hsl(220, 90%, 56%)' },
          { label: 'VIP Pass', value: stats.vip, color: 'hsl(280, 85%, 65%)' },
        ]} />
        <HorizontalBarChart title="Pass Status" items={[
          { label: 'Active', value: stats.active, color: 'hsl(142, 76%, 36%)' },
          { label: 'Used', value: stats.used, color: 'hsl(220, 14%, 46%)' },
        ]} />
      </div>
    </div>
  );
}
