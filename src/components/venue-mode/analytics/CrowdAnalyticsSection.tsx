import { useState, useMemo } from 'react';
import { Users, TrendingUp, Clock, Calendar, Radio } from 'lucide-react';
import { useVenueCrowdAnalytics, useVenueCrowd } from '@/hooks/useVenueCrowd';
import CrowdDensityBadge from '@/components/venue-mode/analytics/CrowdDensityBadge';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, parseISO, startOfHour, getHours, getDay } from 'date-fns';

interface CrowdAnalyticsSectionProps {
  venueId: string | null;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CrowdAnalyticsSection({ venueId }: CrowdAnalyticsSectionProps) {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('7d');
  
  const { crowdData } = useVenueCrowd(venueId);
  const { snapshots, peakHours, isLoading } = useVenueCrowdAnalytics(
    venueId, 
    period === 'today' ? 1 : period === '7d' ? 7 : 30
  );

  // Generate mock data if no real data
  const chartData = useMemo(() => {
    if (snapshots.length > 0) {
      return snapshots.map(s => ({
        time: format(parseISO(s.snapshot_at), 'HH:mm'),
        date: format(parseISO(s.snapshot_at), 'MM/dd'),
        density: s.population_density || 0,
        level: s.crowd_level
      }));
    }

    // Mock data for demo
    const mockData = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const hour = (now.getHours() - 24 + i + 24) % 24;
      let density = 0;
      
      // Simulate typical nightlife pattern
      if (hour >= 18 && hour < 21) density = 50 + Math.random() * 50;
      else if (hour >= 21 && hour < 24) density = 150 + Math.random() * 100;
      else if (hour >= 0 && hour < 3) density = 200 + Math.random() * 100;
      else if (hour >= 3 && hour < 6) density = 50 + Math.random() * 50;
      else density = 10 + Math.random() * 20;
      
      mockData.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        date: format(now, 'MM/dd'),
        density: Math.round(density),
        level: density > 200 ? 'packed' : density > 150 ? 'very_busy' : density > 100 ? 'busy' : density > 50 ? 'moderate' : 'quiet'
      });
    }
    return mockData;
  }, [snapshots]);

  // Hourly heatmap data
  const heatmapData = useMemo(() => {
    const data: { day: number; hour: number; density: number }[] = [];
    
    // Generate mock heatmap
    for (let day = 0; day < 7; day++) {
      for (let hour = 18; hour < 24; hour++) {
        let baseDensity = 50;
        // Weekend evenings busier
        if (day === 5 || day === 6) baseDensity += 100;
        // Peak hours
        if (hour >= 22) baseDensity += 80;
        else if (hour >= 20) baseDensity += 40;
        
        data.push({
          day,
          hour,
          density: baseDensity + Math.round(Math.random() * 50)
        });
      }
      for (let hour = 0; hour < 4; hour++) {
        let baseDensity = 100;
        if (day === 5 || day === 6) baseDensity += 120;
        if (hour < 2) baseDensity += 50;
        
        data.push({
          day,
          hour,
          density: baseDensity + Math.round(Math.random() * 50)
        });
      }
    }
    
    return data;
  }, []);

  if (!venueId) {
    return (
      <div className="text-center py-8">
        <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">Select a venue to view crowd analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary animate-pulse" />
            Live Crowd Status
          </h4>
        </div>
        
        <CrowdDensityBadge
          crowdLevel={crowdData?.crowd_level || 'moderate'}
          density={crowdData?.population_density || 127}
          confidence={crowdData?.confidence || 0.85}
          variant="full"
        />
        
        {crowdData?.snapshot_at && (
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {format(parseISO(crowdData.snapshot_at), 'HH:mm')}
          </p>
        )}
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(['today', '7d', '30d'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : '30 Days'}
          </button>
        ))}
      </div>

      {/* Crowd Trend Chart */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-foreground">Crowd Pattern</h4>
        </div>
        
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="crowdGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="density"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#crowdGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak Hours */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-foreground">Peak Hours</h4>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '1st Peak', time: '23:00 - 01:00', density: 245 },
            { label: '2nd Peak', time: '21:00 - 23:00', density: 178 },
            { label: '3rd Peak', time: '01:00 - 02:00', density: 156 },
          ].map((peak, i) => (
            <div key={i} className="p-3 bg-secondary/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">{peak.label}</p>
              <p className="text-sm font-semibold text-foreground mt-1">{peak.time}</p>
              <p className="text-xs text-primary mt-0.5">~{peak.density} avg</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Heatmap */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-foreground">Weekly Pattern</h4>
        </div>
        
        <div className="overflow-x-auto">
          <div className="grid grid-cols-8 gap-1 min-w-[400px]">
            <div className="text-xs text-muted-foreground" />
            {dayNames.map(day => (
              <div key={day} className="text-xs text-muted-foreground text-center py-1">
                {day}
              </div>
            ))}
            
            {[18, 20, 22, 0, 2].map(hour => (
              <>
                <div key={`label-${hour}`} className="text-xs text-muted-foreground pr-2">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {dayNames.map((_, dayIndex) => {
                  const cell = heatmapData.find(d => d.day === dayIndex && d.hour === hour);
                  const density = cell?.density || 0;
                  const intensity = Math.min(density / 300, 1);
                  
                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className="aspect-square rounded"
                      style={{
                        backgroundColor: `hsl(var(--primary) / ${0.1 + intensity * 0.8})`
                      }}
                      title={`${dayNames[dayIndex]} ${hour}:00 - ~${density} people`}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 mt-3">
          <span className="text-xs text-muted-foreground">Quiet</span>
          <div className="flex gap-0.5">
            {[0.2, 0.4, 0.6, 0.8, 1].map(i => (
              <div
                key={i}
                className="w-4 h-4 rounded"
                style={{ backgroundColor: `hsl(var(--primary) / ${i})` }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Packed</span>
        </div>
      </div>
    </div>
  );
}
