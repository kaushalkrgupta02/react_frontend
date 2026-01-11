import { useMemo } from 'react';
import { Tag, TrendingUp, Percent, Banknote, CheckCircle2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { StatsSummaryGrid, HorizontalBarChart, TopItemsList } from '../stats';
import { formatPrice } from '@/types/venue-mode';

interface PromoPerformanceData {
  id: string;
  title: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  redemptions: number;
  revenue: number;
  conversionRate: number;
}

interface PromoStatsProps {
  promoPerformance: PromoPerformanceData[];
  isLoading: boolean;
}

export default function PromoStats({ promoPerformance, isLoading }: PromoStatsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate totals
  const totals = useMemo(() => {
    const totalRedemptions = promoPerformance.reduce((sum, p) => sum + p.redemptions, 0);
    const totalRevenue = promoPerformance.reduce((sum, p) => sum + p.revenue, 0);
    const totalImpressions = promoPerformance.reduce((sum, p) => sum + p.impressions, 0);
    const totalClicks = promoPerformance.reduce((sum, p) => sum + p.clicks, 0);
    const avgConversion = promoPerformance.length > 0
      ? promoPerformance.reduce((sum, p) => sum + p.conversionRate, 0) / promoPerformance.length
      : 0;

    return {
      totalRedemptions,
      totalRevenue,
      totalImpressions,
      totalClicks,
      avgConversion,
      activeCount: promoPerformance.filter(p => p.isActive).length,
    };
  }, [promoPerformance]);

  // Top performing promos
  const topPromos = useMemo(() => {
    return promoPerformance
      .map(p => ({
        name: p.title,
        value: p.redemptions,
        subtitle: `${p.conversionRate.toFixed(1)}% conversion`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [promoPerformance]);

  // Top by revenue
  const topByRevenue = useMemo(() => {
    return promoPerformance
      .filter(p => p.revenue > 0)
      .map(p => ({
        name: p.title,
        value: p.revenue,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [promoPerformance]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <StatsSummaryGrid
        items={[
          {
            label: 'Redemptions',
            value: totals.totalRedemptions,
            icon: CheckCircle2,
            iconColor: 'hsl(142, 71%, 45%)',
          },
          {
            label: 'Avg Conversion',
            value: `${totals.avgConversion.toFixed(1)}%`,
            icon: Percent,
            iconColor: 'hsl(217, 91%, 60%)',
          },
          {
            label: 'Revenue',
            value: formatPrice(totals.totalRevenue),
            icon: Banknote,
            iconColor: 'hsl(var(--primary))',
          },
        ]}
      />

      {/* Funnel Breakdown */}
      <HorizontalBarChart
        title="Promo Funnel"
        items={[
          { label: 'Impressions', value: totals.totalImpressions, color: 'hsl(217, 91%, 60%)' },
          { label: 'Clicks', value: totals.totalClicks, color: 'hsl(271, 91%, 65%)' },
          { label: 'Redemptions', value: totals.totalRedemptions, color: 'hsl(142, 71%, 45%)' },
        ]}
      />

      {/* Top Performing Promos */}
      {topPromos.length > 0 && (
        <TopItemsList
          title="Top Performing Promos"
          items={topPromos}
          icon={TrendingUp}
          valueLabel="redemptions"
        />
      )}

      {/* Top by Revenue */}
      {topByRevenue.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Top Revenue Generators
            </h3>
          </div>
          <div className="divide-y divide-border">
            {topByRevenue.map((item, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="font-medium text-foreground text-sm">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-primary">
                  {formatPrice(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {promoPerformance.length === 0 && (
        <div className="text-center py-8">
          <Tag className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">No Promo Data</h3>
          <p className="text-sm text-muted-foreground">
            Promo analytics will appear here once promos are running
          </p>
        </div>
      )}
    </div>
  );
}
