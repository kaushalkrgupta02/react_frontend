import { useState, useEffect } from 'react';
import { Users, Search, UserPlus, User, Phone, Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTableSessions } from '@/hooks/useTableSessions';
import { useGuestProfiles, GuestProfile } from '@/hooks/useGuestProfiles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SelectedGuest {
  name: string;
  phone?: string;
  email?: string;
  userId?: string;
  avatarUrl?: string;
  profileId?: string;
}

interface WalkInSessionDialogProps {
  venueId: string;
  open: boolean;
  onClose: () => void;
  onSessionCreated: (sessionId: string) => void;
}

export default function WalkInSessionDialog({
  venueId,
  open,
  onClose,
  onSessionCreated
}: WalkInSessionDialogProps) {
  const { openSession } = useTableSessions(venueId);
  const { guests: venueGuests, createProfile } = useGuestProfiles(venueId);
  
  const [guestCount, setGuestCount] = useState(2);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
  
  // Selected guest state
  const [selectedGuest, setSelectedGuest] = useState<SelectedGuest | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    type: 'app_user' | 'venue_guest';
    id: string;
    name: string;
    phone?: string;
    email?: string;
    avatar_url?: string;
    userId?: string;
  }>>([]);
  
  // Manual entry state
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setGuestCount(2);
      setSelectedGuest(null);
      setActiveTab('search');
      setSearchQuery('');
      setSearchResults([]);
      setManualName('');
      setManualPhone('');
      setManualEmail('');
    }
  }, [open]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Enter a search term');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    const query = searchQuery.trim().toLowerCase();

    try {
      const results: typeof searchResults = [];

      // Search app users by phone
      const { data: appUsers } = await supabase
        .from('profiles')
        .select('user_id, display_name, phone, avatar_url')
        .or(`phone.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(5);

      if (appUsers) {
        appUsers.forEach((user) => {
          results.push({
            type: 'app_user',
            id: user.user_id,
            name: user.display_name || 'Unknown',
            phone: user.phone || undefined,
            avatar_url: user.avatar_url || undefined,
            userId: user.user_id
          });
        });
      }

      // Search venue guest profiles by name, phone, or email
      const filteredVenueGuests = venueGuests.filter((guest) => {
        const matchName = guest.guest_name?.toLowerCase().includes(query);
        const matchPhone = guest.guest_phone?.toLowerCase().includes(query);
        const matchEmail = guest.guest_email?.toLowerCase().includes(query);
        return matchName || matchPhone || matchEmail;
      });

      filteredVenueGuests.slice(0, 5).forEach((guest) => {
        // Avoid duplicates if guest has a user_id that was already found in app users
        if (guest.user_id && results.some(r => r.userId === guest.user_id)) {
          return;
        }
        results.push({
          type: 'venue_guest',
          id: guest.id,
          name: guest.guest_name || 'Unknown Guest',
          phone: guest.guest_phone || undefined,
          email: guest.guest_email || undefined,
          userId: guest.user_id || undefined
        });
      });

      if (results.length === 0) {
        toast.error('No guests found. Try manual entry.');
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching guests:', error);
      toast.error('Failed to search guests');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectGuest = (result: typeof searchResults[0]) => {
    setSelectedGuest({
      name: result.name,
      phone: result.phone,
      email: result.email,
      userId: result.userId,
      avatarUrl: result.avatar_url,
      profileId: result.type === 'venue_guest' ? result.id : undefined
    });
  };

  const handleAddManualGuest = () => {
    if (!manualName.trim()) {
      toast.error('Guest name is required');
      return;
    }

    setSelectedGuest({
      name: manualName.trim(),
      phone: manualPhone.trim() || undefined,
      email: manualEmail.trim() || undefined
    });
  };

  const handleClearSelection = () => {
    setSelectedGuest(null);
    setSearchQuery('');
    setSearchResults([]);
    setManualName('');
    setManualPhone('');
    setManualEmail('');
  };

  const handleCreate = async () => {
    if (!selectedGuest) {
      toast.error('Please select or add a guest');
      return;
    }

    setIsCreating(true);

    try {
      // If it's a new manual guest without a profile, create a venue guest profile
      if (!selectedGuest.profileId && !selectedGuest.userId) {
        await createProfile.mutateAsync({
          venue_id: venueId,
          guest_name: selectedGuest.name,
          guest_phone: selectedGuest.phone,
          guest_email: selectedGuest.email
        });
      }

      const session = await openSession({
        venue_id: venueId,
        guest_count: guestCount,
        guest_name: selectedGuest.name
      });

      if (session) {
        if (session.table) {
          toast.success(`Session opened and assigned table ${session.table.table_number}`);
        } else {
          toast.success('Session opened (no table assigned)');
        }
        onSessionCreated(session.id);
        onClose();
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Open Walk-in Session
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Number of Guests */}
          <div className="space-y-2">
            <Label>Number of Guests</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
              >
                -
              </Button>
              <Input
                type="number"
                value={guestCount}
                onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                className="w-20 text-center"
                min={1}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setGuestCount(guestCount + 1)}
              >
                +
              </Button>
            </div>
          </div>

          <Separator />

          {/* Guest Selection */}
          <div className="space-y-2">
            <Label>Primary Guest *</Label>
            
            {selectedGuest ? (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedGuest.avatarUrl} />
                  <AvatarFallback>{selectedGuest.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{selectedGuest.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {selectedGuest.phone || selectedGuest.email || 'No contact info'}
                  </div>
                </div>
                {selectedGuest.userId && (
                  <Badge variant="secondary" className="shrink-0">App User</Badge>
                )}
                <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                  Change
                </Button>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'manual')}>
                <TabsList className="w-full">
                  <TabsTrigger value="search" className="flex-1">
                    <Search className="w-3 h-3 mr-1" />
                    Search
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex-1">
                    <UserPlus className="w-3 h-3 mr-1" />
                    New Guest
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-3 mt-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by name, phone, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={isSearching}>
                      {isSearching ? '...' : <Search className="w-4 h-4" />}
                    </Button>
                  </div>

                  {searchResults.length > 0 && (
                    <ScrollArea className="max-h-48">
                      <div className="space-y-2">
                        {searchResults.map((result) => (
                          <div 
                            key={`${result.type}-${result.id}`}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => handleSelectGuest(result)}
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={result.avatar_url} />
                              <AvatarFallback>{result.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{result.name}</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {result.phone || result.email || 'No contact'}
                              </div>
                            </div>
                            <Badge variant={result.type === 'app_user' ? 'secondary' : 'outline'}>
                              {result.type === 'app_user' ? 'App User' : 'Guest'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Guest name"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Phone (optional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Phone number"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Email (optional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddManualGuest} 
                    className="w-full"
                    disabled={!manualName.trim()}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Guest
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isCreating || !selectedGuest}
            className="flex-1"
          >
            {isCreating ? 'Opening...' : 'Open Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
