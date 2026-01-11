import { memo } from 'react';
import { useDestinationOrders } from '@/hooks/useDestinationOrders';
import { PoweredBySimplify } from '@/components/branding';
import {
  DestinationDisplayScreenProps,
  DisplayHeader,
  EmptyState,
  LoadingState,
  OrderCard,
  getStatusCounts,
} from './destination-display';

function DestinationDisplayScreen({
  venueId,
  destination,
  title,
}: DestinationDisplayScreenProps) {
  const {
    orders,
    loading,
    updating,
    isMuted,
    lastRefresh,
    fetchOrders,
    updateItemStatus,
    toggleMute,
    getEstimateForItem,
  } = useDestinationOrders({ venueId, destination });

  if (loading) {
    return <LoadingState />;
  }

  const statusCounts = getStatusCounts(orders);

  return (
    <div className="min-h-screen bg-background p-4 pb-12 space-y-4">
      <DisplayHeader
        destination={destination}
        title={title}
        statusCounts={statusCounts}
        lastRefresh={lastRefresh}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onRefresh={fetchOrders}
      />

      {orders.length === 0 ? (
        <EmptyState destination={destination} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              updatingItemId={updating}
              onUpdateStatus={updateItemStatus}
              getEstimateForItem={getEstimateForItem}
            />
          ))}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 py-3 bg-background/90 backdrop-blur-sm border-t border-border">
        <PoweredBySimplify />
      </div>
    </div>
  );
}

export default memo(DestinationDisplayScreen);
