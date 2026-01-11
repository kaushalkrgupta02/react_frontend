import { memo } from 'react';
import { Users, CheckCircle2, Banknote, Ticket } from 'lucide-react';
import { PassStats, formatPrice } from '@/types/venue-mode';

type StatusFilter = 'all' | 'active' | 'redeemed';

interface PassStatsCardsProps {
  stats: PassStats;
  selectedFilter?: StatusFilter;
  onFilterChange?: (filter: StatusFilter) => void;
}

export const PassStatsCards = memo(function PassStatsCards({ 
  stats, 
  selectedFilter = 'redeemed',
  onFilterChange 
}: PassStatsCardsProps) {
  const cards = [
    { 
      id: 'all' as StatusFilter, 
      label: 'Total', 
      value: stats.total, 
      icon: Ticket,
      iconColor: 'text-muted-foreground' 
    },
    { 
      id: 'active' as StatusFilter, 
      label: 'Active', 
      value: stats.active, 
      icon: Users,
      iconColor: 'text-green-500' 
    },
    { 
      id: 'redeemed' as StatusFilter, 
      label: 'Redeemed', 
      value: stats.used, 
      icon: CheckCircle2,
      iconColor: 'text-primary' 
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(({ id, label, value, icon: Icon, iconColor }) => (
        <button
          key={id}
          onClick={() => onFilterChange?.(id)}
          className={`bg-card rounded-xl border p-3 text-center transition-all ${
            selectedFilter === id 
              ? 'border-primary ring-1 ring-primary/20' 
              : 'border-border hover:border-primary/30'
          }`}
        >
          <div className={`flex items-center justify-center gap-1.5 mb-1 ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </button>
      ))}
    </div>
  );
});
