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
    <div className="bg-card rounded-lg p-3 sm:p-4 shadow-sm space-y-3">
      {/* Top Row - Title and Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">{title}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Updated {formatRefreshTime(lastRefresh)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleMute}
            className="h-8 w-8 sm:h-10 sm:w-10"
          >
            {isMuted ? (
              <BellOff className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            ) : (
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            className="h-8 w-8 sm:h-10 sm:w-10"
          >
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>

      {/* Status Counts - Full Width Row */}
      <div className="flex gap-1.5 sm:gap-2">
        <Badge
          variant="secondary"
          className="flex-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 justify-center"
        >
          <span className="truncate">{statusCounts.pending} Pending</span>
        </Badge>
        <Badge
          variant="secondary"
          className="flex-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 justify-center"
        >
          <span className="truncate">{statusCounts.preparing} Preparing</span>
        </Badge>
        <Badge
          variant="secondary"
          className="flex-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 justify-center"
        >
          <span className="truncate">{statusCounts.ready} Ready</span>
        </Badge>
      </div>
    </div>
  );
});
