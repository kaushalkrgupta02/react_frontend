import { memo } from 'react';
import { LucideIcon, Clock, Calendar, CalendarDays } from 'lucide-react';
import { formatPrice } from '@/types/venue-mode';

interface PeriodData {
  label: string;
  count: number;
  revenue?: number;
  icon?: LucideIcon;
  iconColor?: string;
}

interface TimePeriodBreakdownProps {
  periods: PeriodData[];
  title?: string;
  showRevenue?: boolean;
}

const defaultPeriodIcons: Record<string, { icon: LucideIcon; color: string }> = {
  'Today': { icon: Clock, color: 'hsl(217, 91%, 60%)' },
  'This Week': { icon: Calendar, color: 'hsl(142, 71%, 45%)' },
  'This Month': { icon: CalendarDays, color: 'hsl(271, 91%, 65%)' },
};

export const TimePeriodBreakdown = memo(function TimePeriodBreakdown({ 
  periods,
  title,
  showRevenue = true,
}: TimePeriodBreakdownProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
      {title && (
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">{title}</h3>
      )}
      <div className="space-y-2 sm:space-y-3">
        {periods.map((period, index) => {
          const defaultIcon = defaultPeriodIcons[period.label];
          const Icon = period.icon || defaultIcon?.icon || Clock;
          const iconColor = period.iconColor || defaultIcon?.color || 'hsl(var(--muted-foreground))';
          
          return (
            <div 
              key={index}
              className="flex items-center gap-2 sm:gap-3"
            >
              <div 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${iconColor}20` }}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: iconColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">{period.label}</p>
                <p className="text-base sm:text-lg font-bold text-foreground">{period.count.toLocaleString()}</p>
              </div>
              {showRevenue && period.revenue !== undefined && (
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Revenue</p>
                  <p className="text-xs sm:text-sm font-medium text-primary whitespace-nowrap">{formatPrice(period.revenue)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
