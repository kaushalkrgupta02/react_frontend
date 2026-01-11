import { useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { useAdminVenues, AdminVenue } from '@/hooks/useAdminVenues';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusOptions: { value: AdminVenue['status']; label: string; color: string }[] = [
  { value: 'quiet', label: 'Quiet', color: 'bg-status-quiet' },
  { value: 'perfect', label: 'Perfect', color: 'bg-status-perfect' },
  { value: 'ideal', label: 'Ideal', color: 'bg-status-ideal' },
  { value: 'busy', label: 'Busy', color: 'bg-status-busy' },
  { value: 'too_busy', label: 'Too Busy', color: 'bg-status-too-busy' },
];

function VenueStatusCard({
  venue,
  onStatusChange,
  isUpdating,
}: {
  venue: AdminVenue;
  onStatusChange: (status: AdminVenue['status']) => Promise<void>;
  isUpdating: boolean;
}) {
  const currentStatus = statusOptions.find(s => s.value === venue.status);

  return (
    <div className="p-4 rounded-xl bg-card border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-foreground">{venue.name}</h4>
        {isUpdating && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
      </div>

      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            disabled={isUpdating}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5',
              venue.status === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', option.color)} />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function VenueStatusSection() {
  const { venues, isLoading, updateVenueStatus } = useAdminVenues();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (venueId: string, status: AdminVenue['status']) => {
    setUpdatingId(venueId);
    const result = await updateVenueStatus(venueId, status);
    setUpdatingId(null);

    if (result.success) {
      toast.success('Status updated');
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Venue Status Control</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => (
          <VenueStatusCard
            key={venue.id}
            venue={venue}
            onStatusChange={(status) => handleStatusChange(venue.id, status)}
            isUpdating={updatingId === venue.id}
          />
        ))}
      </div>
    </div>
  );
}
