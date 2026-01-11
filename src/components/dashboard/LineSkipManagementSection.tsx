import { useState } from 'react';
import { Zap, RotateCcw, Loader2 } from 'lucide-react';
import { useAdminVenues, AdminVenue } from '@/hooks/useAdminVenues';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function VenueLineSkipCard({
  venue,
  onUpdate,
  isUpdating,
}: {
  venue: AdminVenue;
  onUpdate: (settings: Partial<AdminVenue>) => Promise<void>;
  isUpdating: boolean;
}) {
  const [localPrice, setLocalPrice] = useState(venue.line_skip_price?.toString() || '');
  const [localLimit, setLocalLimit] = useState(venue.line_skip_daily_limit?.toString() || '');

  const remaining = venue.line_skip_daily_limit 
    ? Math.max(0, venue.line_skip_daily_limit - venue.line_skip_sold_count)
    : null;

  const handleToggle = async (enabled: boolean) => {
    await onUpdate({ line_skip_enabled: enabled });
  };

  const handlePriceUpdate = async () => {
    const price = parseFloat(localPrice);
    if (isNaN(price) || price < 0) {
      toast.error('Invalid price');
      return;
    }
    await onUpdate({ line_skip_price: price });
  };

  const handleLimitUpdate = async () => {
    const limit = parseInt(localLimit);
    if (isNaN(limit) || limit < 0) {
      toast.error('Invalid limit');
      return;
    }
    await onUpdate({ line_skip_daily_limit: limit });
  };

  const handleReset = async () => {
    await onUpdate({ line_skip_sold_count: 0 });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className={cn(
      'p-4 rounded-xl border transition-colors',
      venue.line_skip_enabled
        ? 'bg-card border-primary/30'
        : 'bg-card/50 border-border/50'
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            venue.line_skip_enabled ? 'bg-primary/20' : 'bg-secondary'
          )}>
            <Zap className={cn(
              'w-5 h-5',
              venue.line_skip_enabled ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{venue.name}</h4>
            <p className="text-xs text-muted-foreground">
              {venue.line_skip_enabled ? 'Entry Pass enabled' : 'Entry Pass disabled'}
            </p>
          </div>
        </div>
        <Switch
          checked={venue.line_skip_enabled}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
        />
      </div>

      {venue.line_skip_enabled && (
        <div className="space-y-4 pt-4 border-t border-border/50">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="font-semibold text-foreground text-sm">
                {venue.line_skip_price ? formatPrice(venue.line_skip_price) : '-'}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Sold</p>
              <p className="font-semibold text-foreground text-sm">
                {venue.line_skip_sold_count}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className={cn(
                'font-semibold text-sm',
                remaining === 0 ? 'text-destructive' : 'text-foreground'
              )}>
                {remaining ?? '∞'}
              </p>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Price (IDR)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={localPrice}
                  onChange={(e) => setLocalPrice(e.target.value)}
                  className="h-9"
                  disabled={isUpdating}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3"
                  onClick={handlePriceUpdate}
                  disabled={isUpdating}
                >
                  Save
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Daily Limit</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={localLimit}
                  onChange={(e) => setLocalLimit(e.target.value)}
                  className="h-9"
                  disabled={isUpdating}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3"
                  onClick={handleLimitUpdate}
                  disabled={isUpdating}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleReset}
            disabled={isUpdating || venue.line_skip_sold_count === 0}
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            Reset Sold Count
          </Button>
        </div>
      )}
    </div>
  );
}

export default function LineSkipManagementSection() {
  const { venues, isLoading, updateLineSkipSettings } = useAdminVenues();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdate = async (venueId: string, settings: Partial<AdminVenue>) => {
    setUpdatingId(venueId);
    const result = await updateLineSkipSettings(venueId, settings);
    setUpdatingId(null);

    if (result.success) {
      toast.success('Settings updated');
    } else {
      toast.error(result.error || 'Failed to update settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const lineSkipVenues = venues.filter(v => v.line_skip_enabled);
  const otherVenues = venues.filter(v => !v.line_skip_enabled);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Entry & VIP Pass Management</h2>
      </div>

      <div className="space-y-6">
        {lineSkipVenues.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Active</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {lineSkipVenues.map((venue) => (
                <VenueLineSkipCard
                  key={venue.id}
                  venue={venue}
                  onUpdate={(settings) => handleUpdate(venue.id, settings)}
                  isUpdating={updatingId === venue.id}
                />
              ))}
            </div>
          </div>
        )}

        {otherVenues.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Disabled</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {otherVenues.map((venue) => (
                <VenueLineSkipCard
                  key={venue.id}
                  venue={venue}
                  onUpdate={(settings) => handleUpdate(venue.id, settings)}
                  isUpdating={updatingId === venue.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
