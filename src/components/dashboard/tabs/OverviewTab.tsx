import { KPIOverviewCards } from '../analytics/KPIOverviewCards';
import { CombinedRevenueChart } from '../analytics/CombinedRevenueChart';
import { PeriodComparison } from '../analytics/PeriodComparison';
import CapacityHeatmap from '@/components/venue-mode/analytics/CapacityHeatmap';
import BookingFunnel from '@/components/venue-mode/analytics/BookingFunnel';
import { DashboardAnalytics } from '@/hooks/useDashboardAnalytics';

interface OverviewTabProps {
  analytics: DashboardAnalytics;
}

export function OverviewTab({ analytics }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KPIOverviewCards kpis={analytics.kpis} isLoading={analytics.isLoading} />
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CombinedRevenueChart 
          data={analytics.trendData} 
          isLoading={analytics.isLoading} 
        />
        <PeriodComparison
          bookingStats={analytics.bookingStats}
          passStats={analytics.passStats}
          packageStats={analytics.packageStats}
          promoStats={analytics.promoStats}
          isLoading={analytics.isLoading}
        />
      </div>
      
      {/* Capacity Heatmap & Booking Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CapacityHeatmap 
          data={analytics.heatmapData} 
          isLoading={analytics.isLoading} 
        />
        <BookingFunnel 
          data={analytics.funnelData} 
          isLoading={analytics.isLoading} 
        />
      </div>
      
      {/* Revenue Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
          <p className="text-xs text-muted-foreground mb-1">Pass Revenue</p>
          <p className="text-xl font-bold text-green-500">
            Rp {analytics.revenueBreakdown.passes.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
          <p className="text-xs text-muted-foreground mb-1">Package Revenue</p>
          <p className="text-xl font-bold text-purple-500">
            Rp {analytics.revenueBreakdown.packages.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20">
          <p className="text-xs text-muted-foreground mb-1">Walk-in Revenue</p>
          <p className="text-xl font-bold text-cyan-500">
            Rp {analytics.revenueBreakdown.walkIns.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {analytics.walkInStats.count} guests • Avg Rp {analytics.walkInStats.avgSpend.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-primary">
            Rp {analytics.revenueBreakdown.total.toLocaleString('id-ID')}
          </p>
        </div>
      </div>
    </div>
  );
}
