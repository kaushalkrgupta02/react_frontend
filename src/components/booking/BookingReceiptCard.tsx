import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Users, Clock, MessageSquare, Copy, Check, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BookingReceiptCardProps {
  booking: {
    id: string;
    booking_reference: string;
    booking_date: string;
    party_size: number;
    arrival_window: string | null;
    special_requests: string | null;
    status: 'pending' | 'confirmed' | 'cancelled' | 'declined';
    venue?: {
      id: string;
      name: string;
      cover_image_url: string | null;
      address?: string | null;
    };
  };
}

const arrivalWindowLabels: Record<string, string> = {
  'before_10pm': 'Before 10pm',
  '10_to_11pm': '10–11pm',
  'after_11pm': 'After 11pm',
};

export default function BookingReceiptCard({ booking }: BookingReceiptCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const bookingDate = parseISO(booking.booking_date);

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(booking.booking_reference);
      setCopied(true);
      toast.success('Reference copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      {/* Venue Header */}
      <button
        onClick={() => booking.venue && navigate(`/venue/${booking.venue.id}`)}
        className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
          {booking.venue?.cover_image_url ? (
            <img
              src={booking.venue.cover_image_url}
              alt={booking.venue?.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CalendarCheck className="w-7 h-7 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-lg truncate">
            {booking.venue?.name || 'Venue'}
          </h3>
          {booking.venue?.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{booking.venue.address}</span>
            </p>
          )}
        </div>
      </button>

      <div className="h-px bg-border/50" />

      {/* Booking Reference */}
      <div className="p-4 bg-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Booking Reference</p>
            <p className="text-xl font-mono font-bold text-primary mt-1">
              {booking.booking_reference}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={handleCopyReference}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Booking Details */}
      <div className="p-4 space-y-3">
        <DetailRow
          icon={CalendarCheck}
          label="Date"
          value={format(bookingDate, 'EEEE, MMMM d, yyyy')}
        />
        <DetailRow
          icon={Users}
          label="Party Size"
          value={`${booking.party_size} ${booking.party_size === 1 ? 'guest' : 'guests'}`}
        />
        {booking.arrival_window && (
          <DetailRow
            icon={Clock}
            label="Arrival Window"
            value={arrivalWindowLabels[booking.arrival_window] || booking.arrival_window}
          />
        )}
        {booking.special_requests && (
          <DetailRow
            icon={MessageSquare}
            label="Special Requests"
            value={booking.special_requests}
            multiline
          />
        )}
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  multiline = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className={cn("flex gap-3", multiline && "flex-col")}>
      <div className="flex items-center gap-2 text-muted-foreground min-w-[100px]">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className={cn("text-sm font-medium text-foreground", !multiline && "ml-auto text-right")}>
        {value}
      </span>
    </div>
  );
}