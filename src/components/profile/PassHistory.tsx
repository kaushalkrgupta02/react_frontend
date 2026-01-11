import { useNavigate } from 'react-router-dom';
import { useLineSkipPasses, LineSkipPass } from '@/hooks/useLineSkipPasses';
import { Zap, Loader2, CheckCircle2, XCircle, Clock, Crown, Ticket, QrCode } from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const statusConfig = {
  active: {
    label: 'Active',
    icon: CheckCircle2,
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  used: {
    label: 'Used',
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-border',
  },
  refunded: {
    label: 'Refunded',
    icon: XCircle,
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

function PassCard({ pass }: { pass: LineSkipPass }) {
  const navigate = useNavigate();
  const status = statusConfig[pass.status] || statusConfig.active;
  const StatusIcon = status.icon;
  const purchaseDate = parseISO(pass.purchase_date);
  const isActiveToday = pass.status === 'active' && isToday(purchaseDate);
  const isVip = pass.pass_type === 'vip';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className={cn(
      'p-4 rounded-xl border transition-colors',
      isActiveToday 
        ? 'bg-primary/10 border-primary/30'
        : 'bg-card border-border/50'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center',
          isVip ? 'bg-yellow-500/20' : 'bg-primary/20'
        )}>
          {isVip ? (
            <Crown className={cn('w-6 h-6', isActiveToday ? 'text-yellow-500' : 'text-muted-foreground')} />
          ) : (
            <Ticket className={cn('w-6 h-6', isActiveToday ? 'text-primary' : 'text-muted-foreground')} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground truncate">
                {pass.venue?.name || 'Venue'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isVip ? 'VIP Pass' : 'Entry Pass'}
              </p>
            </div>
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 flex items-center gap-1',
              status.className
            )}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {format(purchaseDate, 'EEE, MMM d')}
            </span>
            <span className="font-medium text-foreground">
              {formatPrice(pass.price)}
            </span>
          </div>

          {isActiveToday && (
            <Button
              size="sm"
              className="w-full mt-3"
              onClick={() => navigate(`/pass/${pass.id}`)}
            >
              <QrCode className="w-4 h-4 mr-2" />
              View Pass
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PassHistory() {
  const { passes, isLoading } = useLineSkipPasses();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (passes.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
          <Zap className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No passes yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your Entry and VIP passes will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {passes.map((pass) => (
        <PassCard key={pass.id} pass={pass} />
      ))}
    </div>
  );
}
