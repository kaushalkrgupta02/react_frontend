import { useState, useEffect } from 'react';
import { Users, UserCheck, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchVenueGuests } from '@/lib/guestApi';

interface BookingGuest {
  id: string;
  guest_number: number;
  guest_name: string | null;
  is_primary: boolean | null;
  check_in_status: string | null;
  checked_in_at: string | null;
}

interface BookingGuestsProgressProps {
  bookingId: string;
  partySize: number;
  compact?: boolean;
}

export default function BookingGuestsProgress({ 
  bookingId, 
  partySize,
  compact = false 
}: BookingGuestsProgressProps) {
  const [guests, setGuests] = useState<BookingGuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchGuestsFastapi = async () => {
      setIsLoading(true);
      try {
        // NOTE: You may need to adjust the API call to filter by bookingId if your FastAPI endpoint supports it
        // For now, we assume fetchVenueGuests returns all guests for the venue, and you filter by bookingId if needed
        // If bookingId is not available in the guest object, you may need a new endpoint or backend change
        // Replace 'venueId' with the actual venueId available in your component/context
        const venueId = '';
        const allGuests = await fetchVenueGuests(venueId);
        const filtered = allGuests.filter((g: any) => g.booking_id === bookingId);
        setGuests(filtered);
      } catch (e) {
        setGuests([]);
      }
      setIsLoading(false);
    };
    fetchGuestsFastapi();
  }, [bookingId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 border border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
        <span>Loading guests...</span>
      </div>
    );
  }

  const checkedIn = guests.filter(g => g.check_in_status === 'checked_in').length;
  const noShow = guests.filter(g => g.check_in_status === 'no_show').length;
  const pending = guests.filter(g => g.check_in_status === 'pending' || !g.check_in_status).length;
  const totalGuests = guests.length || partySize;

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'checked_in': return 'bg-green-500';
      case 'no_show': return 'bg-amber-500';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'checked_in': return <UserCheck className="w-3 h-3 text-green-500" />;
      case 'no_show': return <AlertTriangle className="w-3 h-3 text-amber-500" />;
      default: return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">
            {checkedIn}/{totalGuests}
          </span>
        </div>
        {/* Mini progress dots */}
        <div className="flex gap-0.5">
          {guests.slice(0, 6).map((guest) => (
            <div
              key={guest.id}
              className={`w-2 h-2 rounded-full ${getStatusColor(guest.check_in_status)}`}
              title={`${guest.guest_name || `Guest ${guest.guest_number}`}: ${guest.check_in_status || 'pending'}`}
            />
          ))}
          {guests.length > 6 && (
            <span className="text-xs text-muted-foreground">+{guests.length - 6}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm hover:bg-secondary/30 rounded p-1 -m-1 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-green-500" />
            <span className="text-foreground font-medium">{checkedIn}</span>
          </div>
          {noShow > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-foreground font-medium">{noShow}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{pending}</span>
          </div>
          <span className="text-xs text-muted-foreground">of {totalGuests} guests</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Progress bar */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
        {checkedIn > 0 && (
          <div 
            className="bg-green-500 transition-all"
            style={{ width: `${(checkedIn / totalGuests) * 100}%` }}
          />
        )}
        {noShow > 0 && (
          <div 
            className="bg-amber-500 transition-all"
            style={{ width: `${(noShow / totalGuests) * 100}%` }}
          />
        )}
      </div>

      {/* Expanded guest list */}
      {expanded && guests.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-border">
          {guests.map((guest) => (
            <div
              key={guest.id}
              className="flex items-center justify-between text-xs py-1"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(guest.check_in_status)}
                <span className={guest.check_in_status === 'checked_in' ? 'text-foreground' : 'text-muted-foreground'}>
                  {guest.guest_name || `Guest ${guest.guest_number}`}
                  {guest.is_primary && (
                    <span className="ml-1 text-primary">(Primary)</span>
                  )}
                </span>
              </div>
              <span className={`capitalize ${
                guest.check_in_status === 'checked_in' ? 'text-green-500' :
                guest.check_in_status === 'no_show' ? 'text-amber-500' :
                'text-muted-foreground'
              }`}>
                {guest.check_in_status?.replace('_', ' ') || 'pending'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
