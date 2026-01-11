import { memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GroupedOrder } from './types';
import { getPriorityClass, getWaitTimeMinutes } from './utils';
import { OrderItemRow } from './OrderItemRow';

interface OrderCardProps {
  order: GroupedOrder;
  updatingItemId: string | null;
  onUpdateStatus: (itemId: string, newStatus: 'preparing' | 'ready' | 'served') => void;
  getEstimateForItem: (itemName: string) => number | undefined;
}

export const OrderCard = memo(function OrderCard({
  order,
  updatingItemId,
  onUpdateStatus,
  getEstimateForItem,
}: OrderCardProps) {
  return (
    <Card className={cn('overflow-hidden transition-all', getPriorityClass(order.createdAt))}>
      {/* Order Header */}
      <CardHeader className="bg-muted/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {order.isWalkIn ? (
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-xl font-bold">Walk-in</span>
              </div>
            ) : (
              <div className="text-3xl font-bold text-primary">T{order.tableNumber}</div>
            )}
            <Badge variant="outline" className="text-xs">
              #{order.orderNumber}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">{getWaitTimeMinutes(order.createdAt)}m ago</span>
          </div>
        </div>
      </CardHeader>

      {/* Order Items */}
      <CardContent className="p-0 divide-y divide-border">
        {order.items.map((item) => (
          <OrderItemRow
            key={item.id}
            item={item}
            estimatedMinutes={getEstimateForItem(item.item_name)}
            isUpdating={updatingItemId === item.id}
            onUpdateStatus={onUpdateStatus}
          />
        ))}
      </CardContent>
    </Card>
  );
});
