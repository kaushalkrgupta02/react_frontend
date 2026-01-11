import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
  lineSkip: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  isLoading?: boolean;
}

export default function RevenueChart({ data, isLoading }: RevenueChartProps) {
  const stats = useMemo(() => {
    if (data.length === 0) return { total: 0, change: 0, avgDaily: 0 };
    
    const total = data.reduce((sum, d) => sum + d.revenue, 0);
    const avgDaily = total / data.length;
    
    // Compare last 7 days to previous 7 days
    const recent = data.slice(-7).reduce((sum, d) => sum + d.revenue, 0);
    const previous = data.slice(-14, -7).reduce((sum, d) => sum + d.revenue, 0);
    const change = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
    
    return { total, change, avgDaily };
  }, [data]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}K`;
    return `Rp ${value}`;
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="h-40 bg-muted/50 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border space-y-4">
      {/* Header Stats */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-foreground font-display">
            {formatCurrency(stats.total)}
          </p>
          <p className="text-xs text-muted-foreground">
            Avg {formatCurrency(stats.avgDaily)}/day
          </p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
          stats.change >= 0 
            ? 'bg-green-500/10 text-green-400' 
            : 'bg-red-500/10 text-red-400'
        }`}>
          {stats.change >= 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {Math.abs(stats.change).toFixed(1)}%
        </div>
      </div>

      {/* Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(270, 85%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(270, 85%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(250, 15%, 18%)" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'hsl(250, 10%, 55%)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: 'hsl(250, 10%, 55%)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatCurrency(value).replace('Rp ', '')}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(250, 15%, 10%)',
                border: '1px solid hsl(250, 15%, 18%)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(0, 0%, 98%)' }}
              formatter={(value: number) => [formatCurrency(value), 'Revenue']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(270, 85%, 60%)"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Bookings</p>
          <p className="text-sm font-medium text-foreground">
            {formatCurrency(data.reduce((sum, d) => sum + d.bookings, 0))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Line Skip</p>
          <p className="text-sm font-medium text-foreground">
            {formatCurrency(data.reduce((sum, d) => sum + d.lineSkip, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}
