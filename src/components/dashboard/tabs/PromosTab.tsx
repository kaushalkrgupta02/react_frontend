import { useMemo } from 'react';
import { VenuePromo } from '@/hooks/useVenuePromos';
import { StatsSummaryGrid } from '@/components/venue-mode/stats/StatsSummaryGrid';
import { HorizontalBarChart } from '@/components/venue-mode/stats/HorizontalBarChart';
import { TopItemsList } from '@/components/venue-mode/stats/TopItemsList';
import { Card, CardContent } from '@/components/ui/card';
import { parseISO, isAfter, isBefore } from 'date-fns';
import { Loader2, Tag, Eye, MousePointer, CheckCircle } from 'lucide-react';
import { formatPrice } from '@/types/venue-mode';

interface PromoAnalytics {
  id: string;
  promo_id: string;
  impressions: number | null;
  clicks: number | null;
  redemptions: number | null;
  revenue_generated: number | null;
}

interface PromosTabProps {
  promos: VenuePromo[];
  promoAnalytics: PromoAnalytics[];
  isLoading: boolean;
}

export function PromosTab({ promos, promoAnalytics, isLoading }: PromosTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const stats = useMemo(() => {
    const now = new Date();
    const activePromos = promos.filter(p => {
      const startsAt = parseISO(p.starts_at);
      const endsAt = parseISO(p.ends_at);
      return p.is_active && isBefore(startsAt, now) && isAfter(endsAt, now);
    });
    
    return {
      total: promos.length,
      active: activePromos.length,
      impressions: promoAnalytics.reduce((sum, pa) => sum + (pa.impressions || 0), 0),
      clicks: promoAnalytics.reduce((sum, pa) => sum + (pa.clicks || 0), 0),
      redemptions: promoAnalytics.reduce((sum, pa) => sum + (pa.redemptions || 0), 0),
      revenue: promoAnalytics.reduce((sum, pa) => sum + (pa.revenue_generated || 0), 0),
    };
  }, [promos, promoAnalytics]);

  const topPromos = useMemo(() => {
    const redemptions: Record<string, { name: string; count: number }> = {};
    promoAnalytics.forEach(pa => {
      const promo = promos.find(p => p.id === pa.promo_id);
      if (promo && pa.redemptions) {
        redemptions[promo.id] = redemptions[promo.id] || { name: promo.title, count: 0 };
        redemptions[promo.id].count += pa.redemptions;
      }
    });
    return Object.values(redemptions).sort((a, b) => b.count - a.count).slice(0, 5).map(p => ({ name: p.name, value: p.count }));
  }, [promos, promoAnalytics]);

  if (promos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Tag className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Promos Yet</h3>
          <p className="text-sm text-muted-foreground">Create promos in Venue Mode to see analytics here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <StatsSummaryGrid
        items={[
          { label: 'Active Promos', value: stats.active, icon: Tag, iconColor: 'hsl(var(--primary))' },
          { label: 'Impressions', value: stats.impressions, icon: Eye },
          { label: 'Clicks', value: stats.clicks, icon: MousePointer },
          { label: 'Redemptions', value: stats.redemptions, icon: CheckCircle, iconColor: 'hsl(142, 76%, 36%)' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Avg Conversion Rate</p>
          <p className="text-2xl font-bold text-primary">
            {stats.impressions > 0 ? ((stats.redemptions / stats.impressions) * 100).toFixed(1) : '0'}%
          </p>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
          <p className="text-xs text-muted-foreground mb-1">Revenue Generated</p>
          <p className="text-2xl font-bold text-green-500">{formatPrice(stats.revenue)}</p>
        </div>
      </div>

      <HorizontalBarChart title="Promo Funnel" items={[
        { label: 'Impressions', value: stats.impressions, color: 'hsl(220, 90%, 56%)' },
        { label: 'Clicks', value: stats.clicks, color: 'hsl(45, 93%, 47%)' },
        { label: 'Redemptions', value: stats.redemptions, color: 'hsl(142, 76%, 36%)' },
      ]} />

      {topPromos.length > 0 && <TopItemsList title="Top by Redemptions" items={topPromos} />}
    </div>
  );
}
