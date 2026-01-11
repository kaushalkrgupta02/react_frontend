import { memo } from 'react';
import { LucideIcon } from 'lucide-react';

interface TopItem {
  name: string;
  value: number;
  subtitle?: string;
}

interface TopItemsListProps {
  title: string;
  items: TopItem[];
  icon?: LucideIcon;
  valueLabel?: string;
  maxItems?: number;
  showBars?: boolean;
}

export const TopItemsList = memo(function TopItemsList({ 
  title, 
  items, 
  icon: Icon,
  valueLabel = '',
  maxItems = 5,
  showBars = true,
}: TopItemsListProps) {
  const displayItems = items.slice(0, maxItems);
  const maxValue = Math.max(...displayItems.map(i => i.value), 1);

  if (displayItems.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
        <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          {title}
        </h3>
      </div>
      <div className="divide-y divide-border">
        {displayItems.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          
          return (
            <div 
              key={index}
              className="relative flex items-center justify-between p-3"
            >
              {showBars && (
                <div 
                  className="absolute inset-y-0 left-0 bg-primary/5 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              )}
              <div className="relative flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                <div>
                  <span className="font-medium text-foreground text-sm">{item.name}</span>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  )}
                </div>
              </div>
              <span className="relative text-sm text-muted-foreground font-medium">
                {item.value.toLocaleString()}{valueLabel && ` ${valueLabel}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
