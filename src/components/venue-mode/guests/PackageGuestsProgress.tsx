import { useState, useEffect } from 'react';
import { Users, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PackageGuest {
  id: string;
  guest_number: number;
  guest_name: string | null;
  is_primary: boolean | null;
  redemption_status: string | null;
}

interface PackageGuestsProgressProps {
  purchaseId: string;
  guestCount: number | null;
  compact?: boolean;
}

export default function PackageGuestsProgress({ 
  purchaseId, 
  guestCount,
  compact = false 
}: PackageGuestsProgressProps) {
  const [guests, setGuests] = useState<PackageGuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchGuests = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('package_guests')
        .select('id, guest_number, guest_name, is_primary, redemption_status')
        .eq('purchase_id', purchaseId)
        .order('guest_number', { ascending: true });
      
      if (!error && data) {
        setGuests(data);
      }
      setIsLoading(false);
    };

    fetchGuests();
  }, [purchaseId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 border border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
        <span>Loading guests...</span>
      </div>
    );
  }

  const fullyRedeemed = guests.filter(g => g.redemption_status === 'fully_redeemed').length;
  const partiallyRedeemed = guests.filter(g => g.redemption_status === 'partially_redeemed').length;
  const pending = guests.filter(g => g.redemption_status === 'pending' || !g.redemption_status).length;
  const totalGuests = guests.length || guestCount || 1;

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'fully_redeemed': return 'bg-green-500';
      case 'partially_redeemed': return 'bg-yellow-500';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'fully_redeemed': return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'partially_redeemed': return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      default: return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'fully_redeemed': return 'Redeemed';
      case 'partially_redeemed': return 'Partial';
      default: return 'Pending';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">
            {fullyRedeemed + partiallyRedeemed}/{totalGuests}
          </span>
        </div>
        {/* Mini progress dots */}
        <div className="flex gap-0.5">
          {guests.slice(0, 6).map((guest) => (
            <div
              key={guest.id}
              className={`w-2 h-2 rounded-full ${getStatusColor(guest.redemption_status)}`}
              title={`${guest.guest_name || `Guest ${guest.guest_number}`}: ${getStatusLabel(guest.redemption_status)}`}
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
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-foreground font-medium">{fullyRedeemed}</span>
          </div>
          {partiallyRedeemed > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-foreground font-medium">{partiallyRedeemed}</span>
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
        {fullyRedeemed > 0 && (
          <div 
            className="bg-green-500 transition-all"
            style={{ width: `${(fullyRedeemed / totalGuests) * 100}%` }}
          />
        )}
        {partiallyRedeemed > 0 && (
          <div 
            className="bg-yellow-500 transition-all"
            style={{ width: `${(partiallyRedeemed / totalGuests) * 100}%` }}
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
                {getStatusIcon(guest.redemption_status)}
                <span className={guest.redemption_status === 'fully_redeemed' ? 'text-foreground' : 'text-muted-foreground'}>
                  {guest.guest_name || `Guest ${guest.guest_number}`}
                  {guest.is_primary && (
                    <span className="ml-1 text-primary">(Primary)</span>
                  )}
                </span>
              </div>
              <span className={`${
                guest.redemption_status === 'fully_redeemed' ? 'text-green-500' :
                guest.redemption_status === 'partially_redeemed' ? 'text-yellow-500' :
                'text-muted-foreground'
              }`}>
                {getStatusLabel(guest.redemption_status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
