import { BookingGuest } from '@/hooks/useBookingGuests';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Check, X, Clock, Share2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuestListCardProps {
  guest: BookingGuest;
  onShare?: (guest: BookingGuest) => void;
  onRemove?: (guest: BookingGuest) => void;
  showActions?: boolean;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  },
  checked_in: {
    label: 'Checked In',
    icon: Check,
    className: 'bg-green-500/20 text-green-600 border-green-500/30',
  },
  no_show: {
    label: 'No Show',
    icon: X,
    className: 'bg-red-500/20 text-red-600 border-red-500/30',
  },
};

export function GuestListCard({ guest, onShare, onRemove, showActions = true }: GuestListCardProps) {
  const status = statusConfig[guest.check_in_status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;
  
  const displayName = guest.profile?.display_name || guest.guest_name || `Guest ${guest.guest_number}`;
  const isAppUser = !!guest.user_id;

  return (
    <div className="p-4 rounded-xl bg-card border flex items-center gap-3">
      {/* Avatar */}
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center',
        guest.is_primary ? 'bg-primary/20' : 'bg-muted'
      )}>
        <User className={cn(
          'w-5 h-5',
          guest.is_primary ? 'text-primary' : 'text-muted-foreground'
        )} />
      </div>

      {/* Guest Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{displayName}</span>
          {guest.is_primary && (
            <Badge variant="secondary" className="text-xs">
              Host
            </Badge>
          )}
          {isAppUser && (
            <Badge variant="outline" className="text-xs">
              App User
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {guest.profile?.phone || guest.guest_phone || 'No phone'}
        </p>
      </div>

      {/* Status Badge */}
      <Badge variant="outline" className={cn('text-xs', status.className)}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {status.label}
      </Badge>

      {/* Actions */}
      {showActions && !guest.is_primary && (
        <div className="flex gap-1">
          {onShare && !isAppUser && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onShare(guest)}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}
          {onRemove && guest.check_in_status === 'pending' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onRemove(guest)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
