import { useState, forwardRef, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Ticket, 
  Crown, 
  Gift, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  User, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { playSuccessSound, playErrorSound } from '@/lib/audioFeedback';
import { VenuePass, formatPrice } from '@/types/venue-mode';
import { toast } from 'sonner';

interface PassCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pass: VenuePass | null;
  onRedeem: (passId: string, claimFreeItem?: boolean) => Promise<void>;
}

const PassCheckInDialog = forwardRef<HTMLDivElement, PassCheckInDialogProps>(function PassCheckInDialog({
  open,
  onOpenChange,
  pass,
  onRedeem,
}, ref) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [claimFreeItem, setClaimFreeItem] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = useCallback(async () => {
    if (!pass) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const isVip = pass.pass_type === 'vip';
      await onRedeem(pass.id, isVip && claimFreeItem);
      playSuccessSound();
      onOpenChange(false);
    } catch (err) {
      console.error('Error redeeming pass:', err);
      playErrorSound();
      const errorMessage = err instanceof Error ? err.message : 'Failed to redeem pass';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
      setClaimFreeItem(false);
    }
  }, [pass, claimFreeItem, onRedeem, onOpenChange]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setClaimFreeItem(false);
      setError(null);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  // Return null but still render Dialog for proper cleanup
  if (!pass) {
    return (
      <Dialog open={false} onOpenChange={handleOpenChange}>
        <DialogContent ref={ref} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pass Check-In</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const isVip = pass.pass_type === 'vip';
  const isActive = pass.status === 'active';
  const freeItem = pass.venue?.vip_pass_free_item || 'Free drink';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent ref={ref} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isVip ? (
              <Crown className="w-5 h-5 text-yellow-500" />
            ) : (
              <Ticket className="w-5 h-5 text-primary" />
            )}
            {isVip ? 'VIP Pass' : 'Entry Pass'} Check-In
          </DialogTitle>
          <DialogDescription>
            Review pass details and confirm check-in
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Pass Status Badge */}
          <div className="flex justify-center">
            <Badge
              variant={isActive ? 'default' : 'secondary'}
              className={cn(
                'text-sm px-4 py-1',
                isActive && 'bg-green-500/20 text-green-400 border-green-500/30',
                pass.status === 'used' && 'bg-muted text-muted-foreground'
              )}
            >
              {isActive ? 'Active' : pass.status === 'used' ? 'Already Used' : pass.status}
            </Badge>
          </div>

          {/* Pass Details */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center',
                isVip ? 'bg-yellow-500/20' : 'bg-primary/20'
              )}>
                {isVip ? (
                  <Crown className="w-6 h-6 text-yellow-500" />
                ) : (
                  <Ticket className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {pass.venue?.name || 'Venue'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isVip ? 'VIP Pass' : 'Entry Pass'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  {formatPrice(pass.price)}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{pass.profile?.display_name || pass.profile?.phone || 'Guest'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{format(parseISO(pass.purchase_date), 'EEEE, MMMM d, yyyy')}</span>
              </div>
            </div>

            {/* VIP Free Item */}
            {isVip && (
              <div className={cn(
                'border-t border-border pt-3',
                pass.free_item_claimed && 'opacity-50'
              )}>
                <div className="flex items-center gap-2 text-sm">
                  <Gift className={cn(
                    'w-4 h-4',
                    pass.free_item_claimed ? 'text-muted-foreground' : 'text-yellow-500'
                  )} />
                  <span className={cn(
                    'font-medium',
                    pass.free_item_claimed ? 'text-muted-foreground line-through' : 'text-yellow-500'
                  )}>
                    {freeItem}
                  </span>
                  {pass.free_item_claimed && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Claimed
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* VIP Free Item Claim Option */}
          {isVip && isActive && !pass.free_item_claimed && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Checkbox
                id="claim-free-item"
                checked={claimFreeItem}
                onCheckedChange={(checked) => setClaimFreeItem(checked === true)}
                disabled={isProcessing}
              />
              <label
                htmlFor="claim-free-item"
                className="text-sm font-medium text-yellow-500 cursor-pointer flex-1"
              >
                Mark free item as claimed
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            {isActive ? (
              <Button
                className="flex-1"
                onClick={handleRedeem}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Redeem Pass
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="flex-1"
                disabled
              >
                <XCircle className="w-4 h-4 mr-2" />
                Already Used
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default PassCheckInDialog;
