import type { GroupedOrder, StatusCounts } from './types';

/**
 * Calculate wait time in minutes from a timestamp
 */
export function getWaitTimeMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

/**
 * Get CSS classes for priority-based border styling
 */
export function getPriorityClass(createdAt: string): string {
  const minutes = getWaitTimeMinutes(createdAt);
  if (minutes >= 15) return 'border-l-4 border-l-destructive animate-pulse';
  if (minutes >= 10) return 'border-l-4 border-l-orange-500';
  if (minutes >= 5) return 'border-l-4 border-l-yellow-500';
  return 'border-l-4 border-l-green-500';
}

/**
 * Calculate status counts from grouped orders
 */
export function getStatusCounts(orders: GroupedOrder[]): StatusCounts {
  const counts: StatusCounts = { pending: 0, preparing: 0, ready: 0 };
  
  orders.forEach(order => {
    order.items.forEach(item => {
      if (item.status in counts) {
        counts[item.status as keyof StatusCounts]++;
      }
    });
  });
  
  return counts;
}

/**
 * Format timestamp to locale time string
 */
export function formatRefreshTime(date: Date): string {
  return date.toLocaleTimeString();
}
