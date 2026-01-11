import { memo, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { TrendSparkline } from './TrendSparkline';

interface StatItem {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  trendData?: number[];
}

interface StatsSummaryGridProps {
  items: StatItem[];
  columns?: 2 | 3;
}

export const StatsSummaryGrid = memo(function StatsSummaryGrid({ 
  items,
  columns = 3,
}: StatsSummaryGridProps) {
  return (
    <div className={`grid gap-2 sm:gap-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {items.map((item, index) => {
        const Icon = item.icon;
        
        return (
          <div 
            key={index}
            className="bg-card rounded-xl border border-border p-2 sm:p-3"
          >
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-1">
              <Icon 
                className="w-3.5 h-3.5 sm:w-4 sm:h-4" 
                style={{ color: item.iconColor || 'hsl(var(--muted-foreground))' }}
              />
            </div>
            <p className="text-base sm:text-xl font-bold text-foreground text-center break-words px-1">
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center">{item.label}</p>
            {item.sublabel && (
              <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 text-center mt-0.5">{item.sublabel}</p>
            )}
            {item.trendData && item.trendData.length > 0 && (
              <div className="flex justify-center mt-1.5 sm:mt-2">
                <TrendSparkline 
                  data={item.trendData} 
                  color={item.iconColor}
                  showTrend={false}
                  height={20}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
