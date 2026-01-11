import { Tag, Eye, MousePointer, Gift, TrendingUp } from 'lucide-react';

interface PromoStats {
  id: string;
  title: string;
  impressions: number;
  clicks: number;
  redemptions: number;
  revenue: number;
  conversionRate: number;
  isActive: boolean;
}

interface PromoPerformanceCardProps {
  promos: PromoStats[];
  isLoading?: boolean;
}

export default function PromoPerformanceCard({ promos, isLoading }: PromoPerformanceCardProps) {
  const formatNumber = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}K`;
    return `Rp ${value}`;
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const activePromos = promos.filter(p => p.isActive);
  const totalRevenue = promos.reduce((sum, p) => sum + p.revenue, 0);
  const totalRedemptions = promos.reduce((sum, p) => sum + p.redemptions, 0);

  return (
    <div className="bg-card rounded-xl p-4 border border-border space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Tag className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-foreground">Promo Performance</span>
        </div>
        <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full">
          {activePromos.length} active
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <Gift className="w-4 h-4 text-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{totalRedemptions}</p>
          <p className="text-[10px] text-muted-foreground">Total Redemptions</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
          <p className="text-[10px] text-muted-foreground">Revenue Generated</p>
        </div>
      </div>

      {/* Individual Promos */}
      {promos.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {promos.slice(0, 5).map((promo) => (
            <div
              key={promo.id}
              className="p-3 bg-secondary/30 rounded-lg space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground truncate flex-1">
                  {promo.title}
                </span>
                {promo.isActive ? (
                  <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded">
                    Active
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] rounded">
                    Ended
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {formatNumber(promo.impressions)}
                </div>
                <div className="flex items-center gap-1">
                  <MousePointer className="w-3 h-3" />
                  {formatNumber(promo.clicks)}
                </div>
                <div className="flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  {promo.redemptions}
                </div>
                <span className={`ml-auto font-medium ${
                  promo.conversionRate >= 5 ? 'text-green-400' : 'text-foreground'
                }`}>
                  {promo.conversionRate.toFixed(1)}% CVR
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <Tag className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No promos yet</p>
          <p className="text-xs text-muted-foreground">Create your first promo with AI</p>
        </div>
      )}
    </div>
  );
}
