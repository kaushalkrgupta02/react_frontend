import { useState } from 'react';
import { User, Search, Star, Phone, Calendar, Users, ChevronRight, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGuestProfiles, GuestProfile } from '@/hooks/useGuestProfiles';
import GuestProfileSheet from './GuestProfileSheet';
import GuestFormSheet from './GuestFormSheet';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface GuestListPanelProps {
  venueId: string | null;
}

const vipStatusColors: Record<string, string> = {
  regular: 'bg-muted text-muted-foreground',
  silver: 'bg-slate-400/20 text-slate-400',
  gold: 'bg-amber-400/20 text-amber-400',
  platinum: 'bg-purple-400/20 text-purple-400',
  vip: 'bg-red-400/20 text-red-400',
};

export default function GuestListPanel({ venueId }: GuestListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addGuestOpen, setAddGuestOpen] = useState(false);

  const { guests, isLoading } = useGuestProfiles(venueId);

  const filteredGuests = guests.filter(guest => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      guest.guest_name?.toLowerCase().includes(query) ||
      guest.guest_phone?.includes(query) ||
      guest.guest_email?.toLowerCase().includes(query) ||
      guest.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const handleSelectGuest = (guest: GuestProfile) => {
    setSelectedGuest(guest);
    setSheetOpen(true);
  };

  if (!venueId) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a venue to view guests
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search guests by name, phone, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddGuestOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <p className="text-2xl font-bold text-foreground">{guests.length}</p>
          <p className="text-xs text-muted-foreground">Total Guests</p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <p className="text-2xl font-bold text-amber-400">
            {guests.filter(g => g.vip_status !== 'regular').length}
          </p>
          <p className="text-xs text-muted-foreground">VIP Guests</p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <p className="text-2xl font-bold text-foreground">
            {guests.filter(g => g.total_visits >= 5).length}
          </p>
          <p className="text-xs text-muted-foreground">Regulars (5+)</p>
        </div>
      </div>

      {/* Guest List */}
      <ScrollArea className="h-[500px]">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No guests match your search' : 'No guest profiles yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGuests.map((guest) => (
              <button
                key={guest.id}
                onClick={() => handleSelectGuest(guest)}
                className="w-full p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {guest.guest_name || 'Guest'}
                        </p>
                        <Badge className={cn('text-[10px] px-1.5', vipStatusColors[guest.vip_status])}>
                          {guest.vip_status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {guest.guest_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {guest.guest_phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {guest.total_visits} visits
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
                {guest.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 pl-13">
                    {guest.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                    {guest.tags.length > 3 && (
                      <Badge variant="secondary" className="text-[10px]">
                        +{guest.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Guest Profile Sheet */}
      <GuestProfileSheet
        guest={selectedGuest}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        venueId={venueId || ''}
      />

      {/* Add Guest Sheet */}
      <GuestFormSheet
        open={addGuestOpen}
        onOpenChange={setAddGuestOpen}
        venueId={venueId || ''}
      />
    </div>
  );
}
