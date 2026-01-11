import { useMemo } from 'react';
import { Flame } from 'lucide-react';

interface HeatmapData {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  value: number; // 0-100 capacity percentage
}

interface CapacityHeatmapProps {
  data: HeatmapData[];
  isLoading?: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = ['6PM', '7PM', '8PM', '9PM', '10PM', '11PM', '12AM', '1AM', '2AM'];
const HOUR_VALUES = [18, 19, 20, 21, 22, 23, 0, 1, 2];

export default function CapacityHeatmap({ data, isLoading }: CapacityHeatmapProps) {
  const heatmapGrid = useMemo(() => {
    const grid: (number | null)[][] = DAYS.map(() => HOUR_VALUES.map(() => null));
    
    data.forEach(({ day, hour, value }) => {
      const hourIndex = HOUR_VALUES.indexOf(hour);
      if (hourIndex !== -1) {
        grid[day][hourIndex] = value;
      }
    });
    
    return grid;
  }, [data]);

  // Find peak times - must be before any early returns
  const peakTimes = useMemo(() => {
    const peaks: { day: string; hour: string; value: number }[] = [];
    heatmapGrid.forEach((dayData, dayIndex) => {
      dayData.forEach((value, hourIndex) => {
        if (value && value >= 80) {
          peaks.push({
            day: DAYS[dayIndex],
            hour: HOURS[hourIndex],
            value,
          });
        }
      });
    });
    return peaks.sort((a, b) => b.value - a.value).slice(0, 3);
  }, [heatmapGrid]);

  const getHeatColor = (value: number | null) => {
    if (value === null) return 'bg-muted/30';
    if (value >= 90) return 'bg-red-500';
    if (value >= 75) return 'bg-orange-500';
    if (value >= 60) return 'bg-amber-500';
    if (value >= 40) return 'bg-green-500';
    if (value >= 20) return 'bg-emerald-500';
    return 'bg-blue-500/50';
  };

  const getHeatGlow = (value: number | null) => {
    if (value === null) return '';
    if (value >= 90) return 'shadow-[0_0_8px_rgba(239,68,68,0.5)]';
    if (value >= 75) return 'shadow-[0_0_6px_rgba(249,115,22,0.4)]';
    return '';
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="h-48 bg-muted/50 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-foreground">Capacity Heatmap</span>
        </div>
        <span className="text-xs text-muted-foreground">Last 4 weeks</span>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[280px]">
          {/* Hour labels */}
          <div className="flex mb-1 pl-10">
            {HOURS.map((hour) => (
              <div key={hour} className="flex-1 text-center text-[10px] text-muted-foreground">
                {hour}
              </div>
            ))}
          </div>
          
          {/* Grid rows */}
          {DAYS.map((day, dayIndex) => (
            <div key={day} className="flex items-center gap-1 mb-1">
              <span className="w-9 text-xs text-muted-foreground text-right pr-2">{day}</span>
              <div className="flex-1 flex gap-[2px]">
                {heatmapGrid[dayIndex].map((value, hourIndex) => (
                  <div
                    key={hourIndex}
                    className={`flex-1 h-5 rounded-sm ${getHeatColor(value)} ${getHeatGlow(value)} transition-all duration-200`}
                    title={value !== null ? `${value}% capacity` : 'No data'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        <span>Low</span>
        <div className="flex gap-[2px]">
          <div className="w-4 h-3 rounded-sm bg-blue-500/50" />
          <div className="w-4 h-3 rounded-sm bg-emerald-500" />
          <div className="w-4 h-3 rounded-sm bg-green-500" />
          <div className="w-4 h-3 rounded-sm bg-amber-500" />
          <div className="w-4 h-3 rounded-sm bg-orange-500" />
          <div className="w-4 h-3 rounded-sm bg-red-500" />
        </div>
        <span>High</span>
      </div>

      {/* Peak Times */}
      {peakTimes.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">🔥 Peak Times</p>
          <div className="flex flex-wrap gap-2">
            {peakTimes.map((peak, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-orange-500/10 text-orange-400 text-xs rounded-lg"
              >
                {peak.day} {peak.hour}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
