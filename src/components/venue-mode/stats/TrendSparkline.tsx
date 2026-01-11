import { memo, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface TrendSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  showTrend?: boolean;
}

export const TrendSparkline = memo(function TrendSparkline({ 
  data, 
  color = 'hsl(var(--primary))',
  height = 32,
  showTrend = true,
}: TrendSparklineProps) {
  const chartData = useMemo(() => 
    data.map((value, index) => ({ value, index })), 
    [data]
  );

  const trend = useMemo(() => {
    if (data.length < 2) return 0;
    const first = data.slice(0, Math.floor(data.length / 2));
    const second = data.slice(Math.floor(data.length / 2));
    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
    const secondAvg = second.reduce((a, b) => a + b, 0) / second.length;
    if (firstAvg === 0) return secondAvg > 0 ? 100 : 0;
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }, [data]);

  const trendColor = trend >= 0 ? 'text-green-500' : 'text-red-500';
  const trendIcon = trend >= 0 ? '↑' : '↓';

  if (data.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div 
          className="bg-muted rounded" 
          style={{ width: 60, height }}
        />
        {showTrend && (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div style={{ width: 60, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${color.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#gradient-${color.replace(/[^a-zA-Z0-9]/g, '')})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {showTrend && data.length >= 2 && (
        <span className={`text-xs font-medium ${trendColor}`}>
          {trendIcon} {Math.abs(trend).toFixed(0)}%
        </span>
      )}
    </div>
  );
});
