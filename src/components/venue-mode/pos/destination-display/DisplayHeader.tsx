import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Bell, BellOff, ChefHat, Wine } from 'lucide-react';
import type { DestinationType, StatusCounts } from './types';
import { formatRefreshTime } from './utils';

interface DisplayHeaderProps {
  destination: DestinationType;
  title: string;
  statusCounts: StatusCounts;
  lastRefresh: Date;
  isMuted: boolean;
  onToggleMute: () => void;
  onRefresh: () => void;
}

export const DisplayHeader = memo(function DisplayHeader({
  destination,
  title,
  statusCounts,
  lastRefresh,
  isMuted,
  onToggleMute,
  onRefresh,
}: DisplayHeaderProps) {
  const Icon = destination === 'bar' ? Wine : ChefHat;

  return (
    <div className="flex items-center justify-between bg-card rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Icon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Updated {formatRefreshTime(lastRefresh)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Status Counts */}
        <div className="flex gap-2">
          <Badge
            variant="secondary"
            className="px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          >
            {statusCounts.pending} Pending
          </Badge>
          <Badge
            variant="secondary"
            className="px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          >
            {statusCounts.preparing} Preparing
          </Badge>
          <Badge
            variant="secondary"
            className="px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          >
            {statusCounts.ready} Ready
          </Badge>
        </div>

        {/* Mute Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleMute}
          className="h-10 w-10"
        >
          {isMuted ? (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Bell className="h-5 w-5 text-primary" />
          )}
        </Button>

        {/* Refresh */}
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className="h-10 w-10"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
});
