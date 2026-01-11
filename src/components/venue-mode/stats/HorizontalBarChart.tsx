import { memo } from 'react';
import { LucideIcon } from 'lucide-react';

interface BarItem {
  label: string;
  value: number;
  color?: string;
  icon?: LucideIcon;
}

interface HorizontalBarChartProps {
  items: BarItem[];
  title?: string;
  showValues?: boolean;
  maxValue?: number;
}

export const HorizontalBarChart = memo(function HorizontalBarChart({ 
  items, 
  title,
  showValues = true,
  maxValue: providedMaxValue,
}: HorizontalBarChartProps) {
  const maxValue = providedMaxValue ?? Math.max(...items.map(i => i.value), 1);

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        {title && (
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
        )}
        <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
      )}
      <div className="space-y-3">
        {items.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const Icon = item.icon;
          
          return (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-foreground">{item.label}</span>
                </div>
                {showValues && (
                  <span className="font-medium text-foreground">{item.value.toLocaleString()}</span>
                )}
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: item.color || 'hsl(var(--primary))',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
