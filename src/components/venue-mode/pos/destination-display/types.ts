export type ItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  status: ItemStatus;
  notes: string | null;
  modifiers: Record<string, unknown> | null;
  destination: string | null;
  created_at: string;
  served_at: string | null;
  session_order_id: string;
  menu_item_id: string | null;
}

export interface GroupedOrder {
  orderId: string;
  orderNumber: number;
  tableNumber: string | null;
  isWalkIn: boolean;
  guestName: string | null;
  createdAt: string;
  items: OrderItem[];
}

export type DestinationType = 'kitchen' | 'bar';

export interface DestinationDisplayScreenProps {
  venueId: string;
  destination: DestinationType;
  title: string;
}

export interface StatusCounts {
  pending: number;
  preparing: number;
  ready: number;
}
