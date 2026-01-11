import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Timer, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderItem } from './types';

interface OrderItemRowProps {
  item: OrderItem;
  estimatedMinutes?: number;
  isUpdating: boolean;
  onUpdateStatus: (itemId: string, newStatus: 'preparing' | 'ready' | 'served') => void;
}

export const OrderItemRow = memo(function OrderItemRow({
  item,
  estimatedMinutes,
  isUpdating,
  onUpdateStatus,
}: OrderItemRowProps) {
  return (
    <div
      className={cn(
        'p-4 transition-colors',
        item.status === 'preparing' && 'bg-blue-50/50 dark:bg-blue-950/20',
        item.status === 'ready' && 'bg-green-50/50 dark:bg-green-950/20'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-primary">{item.quantity}×</span>
            <span className="text-lg font-semibold truncate">{item.item_name}</span>
          </div>

          {/* AI Estimated Time */}
          {item.status === 'pending' && estimatedMinutes && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
              <Timer className="h-3.5 w-3.5" />
              <span>~{estimatedMinutes} min</span>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="flex items-start gap-1.5 mt-2 p-2 bg-muted/50 rounded text-sm">
              <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item.notes}</span>
            </div>
          )}

          {/* Modifiers */}
          {item.modifiers && Object.keys(item.modifiers).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(item.modifiers).map(([key, value]) => (
                <Badge key={key} variant="secondary" className="text-xs">
                  {key}: {String(value)}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <Badge
          variant={
            item.status === 'pending'
              ? 'secondary'
              : item.status === 'preparing'
              ? 'default'
              : 'outline'
          }
          className={cn(
            'capitalize flex-shrink-0',
            item.status === 'ready' && 'bg-green-500 text-white hover:bg-green-600'
          )}
        >
          {item.status}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        {item.status === 'pending' && (
          <Button
            className="flex-1 h-12 text-base font-medium"
            onClick={() => onUpdateStatus(item.id, 'preparing')}
            disabled={isUpdating}
          >
            {isUpdating ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Start'}
          </Button>
        )}

        {item.status === 'preparing' && (
          <Button
            className="flex-1 h-12 text-base font-medium bg-green-600 hover:bg-green-700"
            onClick={() => onUpdateStatus(item.id, 'ready')}
            disabled={isUpdating}
          >
            {isUpdating ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Ready'}
          </Button>
        )}

        {item.status === 'ready' && (
          <Button
            variant="outline"
            className="flex-1 h-12 text-base font-medium border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
            onClick={() => onUpdateStatus(item.id, 'served')}
            disabled={isUpdating}
          >
            {isUpdating ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Served'}
          </Button>
        )}
      </div>
    </div>
  );
});
