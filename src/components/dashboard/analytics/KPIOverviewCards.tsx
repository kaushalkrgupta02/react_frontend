import { TrendingUp, TrendingDown, Minus, DollarSign, CalendarCheck, Ticket, Package, Tag, Footprints } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPIData {
  label: string;
  value: number;
  formattedValue: string;
  previousValue: number;
  changePercent: number;
  trend: 'up' | 'down' | 'neutral';
  color: string;
}

interface KPIOverviewCardsProps {
  kpis: {
    totalRevenue: KPIData;
    tableBookings: KPIData;
    passesSold: KPIData;
    packagesSold: KPIData;
    promosRedeemed: KPIData;
    walkIns: KPIData;
  };
  isLoading?: boolean;
}

const iconMap: Record<string, any> = {
  totalRevenue: DollarSign,
  tableBookings: CalendarCheck,
  passesSold: Ticket,
  packagesSold: Package,
  promosRedeemed: Tag,
  walkIns: Footprints,
};

const colorMap: Record<string, string> = {
  primary: 'from-primary/20 to-primary/5 border-primary/20',
  blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
  green: 'from-green-500/20 to-green-500/5 border-green-500/20',
  purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
  orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/20',
  cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20',
};

const iconColorMap: Record<string, string> = {
  primary: 'text-primary',
  blue: 'text-blue-500',
  green: 'text-green-500',
  purple: 'text-purple-500',
  orange: 'text-orange-500',
  cyan: 'text-cyan-500',
};

export function KPIOverviewCards({ kpis, isLoading }: KPIOverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 w-20 bg-muted rounded mb-2" />
            <div className="h-8 w-16 bg-muted rounded mb-2" />
            <div className="h-3 w-12 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  const kpiEntries = Object.entries(kpis) as [string, KPIData][];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {kpiEntries.map(([key, kpi]) => {
        const Icon = iconMap[key];
        const colorClass = colorMap[kpi.color as keyof typeof colorMap] || colorMap.primary;
        const iconColorClass = iconColorMap[kpi.color as keyof typeof iconColorMap] || iconColorMap.primary;
        
        const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;
        const trendColor = kpi.trend === 'up' ? 'text-green-500' : kpi.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
        
        return (
          <Card
            key={key}
            className={cn(
              'p-4 bg-gradient-to-br border transition-all hover:scale-[1.02]',
              colorClass
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium truncate">
                {kpi.label}
              </span>
              <Icon className={cn('h-4 w-4', iconColorClass)} />
            </div>
            
            <div className="text-2xl font-bold text-foreground mb-1">
              {kpi.formattedValue}
            </div>
            
            <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(kpi.changePercent)}%</span>
              <span className="text-muted-foreground">vs last period</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
