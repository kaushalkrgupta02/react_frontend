import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendDataPoint {
  date: string;
  bookings: number;
  passes: number;
  packages: number;
  promos: number;
  total: number;
}

interface CombinedRevenueChartProps {
  data: TrendDataPoint[];
  isLoading?: boolean;
}

export function CombinedRevenueChart({ data, isLoading }: CombinedRevenueChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">7-Day Activity Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">7-Day Activity Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="bookings" 
                stroke="hsl(220, 90%, 56%)" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Tables"
              />
              <Line 
                type="monotone" 
                dataKey="passes" 
                stroke="hsl(142, 76%, 36%)" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Passes"
              />
              <Line 
                type="monotone" 
                dataKey="packages" 
                stroke="hsl(280, 85%, 65%)" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Packages"
              />
              <Line 
                type="monotone" 
                dataKey="promos" 
                stroke="hsl(25, 95%, 53%)" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Promos"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
