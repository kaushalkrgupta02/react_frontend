import { useState } from 'react';
import { Users, Bell, Check, X, Clock, Phone, MessageSquare, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWaitlist } from '@/hooks/useWaitlist';
import { useVenues } from '@/hooks/useVenues';
import { formatDistanceToNow } from 'date-fns';

interface WaitlistManagementProps {
  selectedVenueId?: string;
  selectedVenueName?: string;
}

export function WaitlistManagement({ selectedVenueId: propVenueId, selectedVenueName: propVenueName }: WaitlistManagementProps) {
  const { data: venues = [] } = useVenues();
  const [localSelectedVenueId, setLocalSelectedVenueId] = useState<string>('');
  
  // Use prop venue ID if provided, otherwise use local selection
  const effectiveVenueId = propVenueId || localSelectedVenueId;
  const selectedVenue = venues.find(v => v.id === effectiveVenueId);
  const effectiveVenueName = propVenueName || selectedVenue?.name;
  
  const { 
    entries, 
    isLoading, 
    avgTurnoverMinutes,
    getEstimatedWaitMinutes,
    formatWaitTime,
    notifyGuest, 
    seatGuest, 
    removeFromWaitlist 
  } = useWaitlist(effectiveVenueId || undefined);

  const getWaitTime = (createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: false });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Waitlist
          </CardTitle>
          {/* Only show venue selector if no venue is pre-selected */}
          {!propVenueId && (
            <Select value={localSelectedVenueId} onValueChange={setLocalSelectedVenueId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!effectiveVenueId ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Select a venue to manage its waitlist
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">No one on the waitlist</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {entries.map((entry) => (
                <div 
                  key={entry.id} 
                  className={`p-4 rounded-lg border ${
                    entry.notified_at 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">#{entry.position}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{entry.party_size} guests</span>
                          {entry.notified_at && (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                              <Bell className="h-3 w-3 mr-1" />
                              Notified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Waiting {getWaitTime(entry.created_at)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Timer className="h-3 w-3" />
                          Est. {formatWaitTime(getEstimatedWaitMinutes(entry.position || 1))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {entry.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Phone className="h-3 w-3" />
                      {entry.phone}
                    </div>
                  )}

                  {entry.notes && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                      <MessageSquare className="h-3 w-3 mt-0.5" />
                      {entry.notes}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!entry.notified_at ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => notifyGuest(entry.id, selectedVenue?.name || 'Venue')}
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        Notify
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => seatGuest(entry.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Seat
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => removeFromWaitlist(entry.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {effectiveVenueId && entries.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total waiting</span>
              <span className="font-medium">{entries.length} parties</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total guests</span>
              <span className="font-medium">
                {entries.reduce((sum, e) => sum + e.party_size, 0)} people
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg. turnover</span>
              <span className="font-medium">
                {avgTurnoverMinutes ? `~${avgTurnoverMinutes} min` : 'Calculating...'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
