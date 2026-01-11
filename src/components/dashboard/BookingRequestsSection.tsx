import { useState } from 'react';
import { CalendarCheck, Users, Clock, MessageSquare, Check, X, Loader2 } from 'lucide-react';
import { useAdminBookings, AdminBooking } from '@/hooks/useAdminBookings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const statusConfig = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  cancelled: {
    label: 'Declined',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

const arrivalLabels: Record<string, string> = {
  before_10pm: 'Before 10pm',
  '10_to_11pm': '10–11pm',
  after_11pm: 'After 11pm',
};

function BookingCard({ 
  booking, 
  onConfirm, 
  onDecline,
  isUpdating 
}: { 
  booking: AdminBooking;
  onConfirm: () => void;
  onDecline: () => void;
  isUpdating: boolean;
}) {
  const status = statusConfig[booking.status] || statusConfig.pending;
  const bookingDate = parseISO(booking.booking_date);

  return (
    <div className="p-4 bg-card rounded-xl border border-border/50">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="font-semibold text-foreground">
            {booking.venue?.name || 'Unknown Venue'}
          </h4>
          <p className="text-sm text-muted-foreground">
            {format(bookingDate, 'EEE, MMM d, yyyy')}
          </p>
        </div>
        <span
          className={cn(
            'text-xs font-medium px-2 py-1 rounded-full border',
            status.className
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{booking.party_size} guests</span>
        </div>
        {booking.arrival_window && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{arrivalLabels[booking.arrival_window] || booking.arrival_window}</span>
          </div>
        )}
      </div>

      {booking.special_requests && (
        <div className="p-2 rounded-lg bg-secondary/50 mb-3">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{booking.special_requests}</span>
          </div>
        </div>
      )}

      {booking.status === 'pending' && (
        <div className="flex gap-2 pt-2 border-t border-border/50">
          <Button
            size="sm"
            className="flex-1"
            onClick={onConfirm}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Confirm
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onDecline}
            disabled={isUpdating}
          >
            <X className="w-4 h-4 mr-1" />
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}

export default function BookingRequestsSection() {
  const { bookings, isLoading, updateBookingStatus } = useAdminBookings();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    setUpdatingId(bookingId);
    const result = await updateBookingStatus(bookingId, status);
    setUpdatingId(null);

    if (result.success) {
      toast.success(status === 'confirmed' ? 'Booking confirmed!' : 'Booking declined');
    } else {
      toast.error(result.error || 'Failed to update booking');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const otherBookings = bookings.filter(b => b.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarCheck className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Booking Requests</h2>
        {pendingBookings.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
            {pendingBookings.length} pending
          </span>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-card border border-border/50">
          <CalendarCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No booking requests yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingBookings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Pending</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {pendingBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onConfirm={() => handleUpdateStatus(booking.id, 'confirmed')}
                    onDecline={() => handleUpdateStatus(booking.id, 'cancelled')}
                    isUpdating={updatingId === booking.id}
                  />
                ))}
              </div>
            </div>
          )}

          {otherBookings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">History</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {otherBookings.slice(0, 10).map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onConfirm={() => {}}
                    onDecline={() => {}}
                    isUpdating={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
