import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, Crown } from 'lucide-react';
import { PassFilterType, PassStats } from '@/types/venue-mode';

interface PassFilterTabsProps {
  filter: PassFilterType;
  onFilterChange: (filter: PassFilterType) => void;
  stats: PassStats;
}

export const PassFilterTabs = memo(function PassFilterTabs({ 
  filter, 
  onFilterChange, 
  stats 
}: PassFilterTabsProps) {
  return (
    <Tabs value={filter} onValueChange={(v) => onFilterChange(v as PassFilterType)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="all" className="flex items-center gap-1.5">
          All
          <Badge variant="secondary" className="ml-1 text-xs">
            {stats.total}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="entry" className="flex items-center gap-1.5">
          <Ticket className="w-3.5 h-3.5" />
          Entry
          <Badge variant="secondary" className="ml-1 text-xs">
            {stats.entry}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="vip" className="flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5" />
          VIP
          <Badge variant="secondary" className="ml-1 text-xs">
            {stats.vip}
          </Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
});
