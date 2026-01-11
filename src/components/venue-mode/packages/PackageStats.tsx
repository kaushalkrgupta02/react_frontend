import { Package, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { PackagePurchase } from '@/hooks/usePackagePurchases';
import { formatPrice } from '@/types/venue-mode';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';

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
  const todayPurchases = purchases.filter(p => isToday(new Date(p.purchased_at)));
  const weekPurchases = purchases.filter(p => isThisWeek(new Date(p.purchased_at)));
  const monthPurchases = purchases.filter(p => isThisMonth(new Date(p.purchased_at)));

  const todayRevenue = todayPurchases.reduce((sum, p) => sum + (p.total_paid || 0), 0);
  const weekRevenue = weekPurchases.reduce((sum, p) => sum + (p.total_paid || 0), 0);
  const monthRevenue = monthPurchases.reduce((sum, p) => sum + (p.total_paid || 0), 0);

  const activeCount = purchases.filter(p => p.status === 'active').length;
  const partialCount = purchases.filter(p => p.status === 'partially_redeemed').length;
  const completedCount = purchases.filter(p => p.status === 'fully_redeemed').length;

  // Package popularity
  const packageCounts = purchases.reduce((acc, p) => {
    const name = p.package?.name || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const popularPackages = Object.entries(packageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const stats = [
    {
      label: 'Today',
      value: todayPurchases.length,
      revenue: todayRevenue,
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'This Week',
      value: weekPurchases.length,
      revenue: weekRevenue,
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'This Month',
      value: monthPurchases.length,
      revenue: monthRevenue,
      icon: Package,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sales Stats */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Package Sales</h3>
        <div className="grid gap-3">
          {stats.map((stat) => (
            <div 
              key={stat.label}
              className="bg-card rounded-xl p-4 border border-border flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold text-foreground">{stat.value} packages</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-lg font-medium text-primary">{formatPrice(stat.revenue)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Breakdown */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Redemption Status</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
              <Package className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{partialCount}</p>
            <p className="text-xs text-muted-foreground">Partial</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>
      </div>

      {/* Popular Packages */}
      {popularPackages.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Popular Packages</h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {popularPackages.map(([name, count], index) => (
              <div 
                key={name}
                className={`flex items-center justify-between p-3 ${
                  index !== popularPackages.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="font-medium text-foreground">{name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{count} sold</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
