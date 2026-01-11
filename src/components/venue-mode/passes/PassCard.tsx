import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Ticket, Crown, Gift } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { VenuePass, formatPrice } from '@/types/venue-mode';

interface PassCardProps {
  pass: VenuePass;
  onClick: () => void;
}

export const PassCard = memo(function PassCard({ pass, onClick }: PassCardProps) {
  const isVip = pass.pass_type === 'vip';
  const isActive = pass.status === 'active';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-colors',
        isActive
          ? 'bg-card border-border hover:bg-secondary/50'
          : 'bg-muted/30 border-border/50'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
          isVip ? 'bg-yellow-500/20' : 'bg-primary/20'
        )}>
          {isVip ? (
            <Crown className={cn('w-6 h-6', isActive ? 'text-yellow-500' : 'text-muted-foreground')} />
          ) : (
            <Ticket className={cn('w-6 h-6', isActive ? 'text-primary' : 'text-muted-foreground')} />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {isVip ? 'VIP Pass' : 'Entry Pass'}
            </span>
            <Badge
              variant={isActive ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                isActive && 'bg-green-500/20 text-green-400 border-green-500/30'
              )}
            >
              {isActive ? 'Active' : 'Used'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pass.profile?.display_name || pass.profile?.phone || 'Guest'}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">
              {format(parseISO(pass.created_at), 'h:mm a')}
            </span>
            {isVip && (
              <span className={cn(
                'text-xs flex items-center gap-1',
                pass.free_item_claimed ? 'text-muted-foreground' : 'text-yellow-500'
              )}>
                <Gift className="w-3 h-3" />
                {pass.free_item_claimed ? 'Item claimed' : 'Free item'}
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-right">
          <p className="font-semibold text-foreground">
            {formatPrice(pass.price)}
          </p>
        </div>
      </div>
    </button>
  );
});
