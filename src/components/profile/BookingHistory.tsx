import { useNavigate } from 'react-router-dom';
import { useBookings, Booking } from '@/hooks/useBookings';
import { CalendarCheck, Clock, Users, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

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
    label: 'Cancelled',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  declined: {
    label: 'Declined',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

function BookingCard({ booking }: { booking: Booking }) {
  const navigate = useNavigate();
  const status = statusConfig[booking.status] || statusConfig.pending;
  const bookingDate = parseISO(booking.booking_date);

  return (
    <button
      onClick={() => navigate(`/booking/${booking.id}`)}
      className="w-full text-left p-4 bg-card rounded-xl border border-border/50 hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Venue Image */}
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
          {booking.venue?.cover_image_url ? (
            <img
              src={booking.venue.cover_image_url}
              alt={booking.venue?.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CalendarCheck className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {booking.venue?.name || 'Venue'}
            </h3>
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0',
                status.className
              )}
            >
              {status.label}
            </span>
          </div>

          {/* Booking Reference */}
          {booking.booking_reference && (
            <p className="text-xs text-primary font-mono mt-0.5">
              {booking.booking_reference}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarCheck className="w-3.5 h-3.5" />
              {format(bookingDate, 'EEE, MMM d')}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {booking.party_size}
            </span>
            {booking.arrival_window && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {booking.arrival_window === 'before_10pm' && 'Before 10pm'}
                {booking.arrival_window === '10_to_11pm' && '10–11pm'}
                {booking.arrival_window === 'after_11pm' && 'After 11pm'}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function BookingHistory() {
  const { bookings, isLoading } = useBookings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
          <CalendarCheck className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No reservations yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your booking requests will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}
