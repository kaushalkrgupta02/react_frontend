import { useState, useEffect } from 'react';
import { Search, UserPlus, User, Phone, Mail, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGuestProfiles } from '@/hooks/useGuestProfiles';

export interface SplitGuest {
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
  guest_user_id?: string;
  avatar_url?: string;
}

interface SplitGuestAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  splitCount: number;
  onConfirm: (guests: SplitGuest[]) => void;
  isGenerating?: boolean;
  venueId: string;
}

export function SplitGuestAssignmentDialog({
  open,
  onClose,
  splitCount,
  onConfirm,
  isGenerating = false,
  venueId
}: SplitGuestAssignmentDialogProps) {
  const { guests: venueGuests, createProfile } = useGuestProfiles(venueId);
  const [guests, setGuests] = useState<(SplitGuest | null)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  
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

  // Initialize guests array when splitCount changes
  useEffect(() => {
    if (open) {
      setGuests(Array(splitCount).fill(null));
      setCurrentIndex(0);
      resetForm();
    }
  }, [open, splitCount]);

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setManualName('');
    setManualPhone('');
    setManualEmail('');
    setActiveTab('search');
  };

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

      // Search app users by phone, name or email
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

      // Search venue guest profiles
      const filteredVenueGuests = venueGuests.filter((guest) => {
        const matchName = guest.guest_name?.toLowerCase().includes(query);
        const matchPhone = guest.guest_phone?.toLowerCase().includes(query);
        const matchEmail = guest.guest_email?.toLowerCase().includes(query);
        return matchName || matchPhone || matchEmail;
      });

      filteredVenueGuests.slice(0, 5).forEach((guest) => {
        // Avoid duplicates
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

  const handleSelectSearchResult = (result: typeof searchResults[0]) => {
    const newGuests = [...guests];
    newGuests[currentIndex] = {
      guest_name: result.name,
      guest_phone: result.phone,
      guest_email: result.email,
      guest_user_id: result.userId,
      avatar_url: result.avatar_url
    };
    setGuests(newGuests);

    // Move to next unassigned slot
    const nextEmpty = newGuests.findIndex((g, i) => i > currentIndex && g === null);
    if (nextEmpty >= 0) {
      setCurrentIndex(nextEmpty);
    } else {
      const firstEmpty = newGuests.findIndex(g => g === null);
      if (firstEmpty >= 0) {
        setCurrentIndex(firstEmpty);
      }
    }
    resetForm();
  };

  const handleAddManualGuest = async () => {
    if (!manualName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!manualPhone.trim()) {
      toast.error('Phone is required');
      return;
    }
    if (!manualEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsAddingGuest(true);
    try {
      // Save to database
      const newProfile = await createProfile.mutateAsync({
        venue_id: venueId,
        guest_name: manualName.trim(),
        guest_phone: manualPhone.trim() || null,
        guest_email: manualEmail.trim() || null
      });

      const newGuests = [...guests];
      newGuests[currentIndex] = {
        guest_name: manualName.trim(),
        guest_phone: manualPhone.trim() || undefined,
        guest_email: manualEmail.trim() || undefined
      };
      setGuests(newGuests);

      // Move to next unassigned slot
      const nextEmpty = newGuests.findIndex((g, i) => i > currentIndex && g === null);
      if (nextEmpty >= 0) {
        setCurrentIndex(nextEmpty);
      } else {
        const firstEmpty = newGuests.findIndex(g => g === null);
        if (firstEmpty >= 0) {
          setCurrentIndex(firstEmpty);
        }
      }
      resetForm();
      toast.success('Guest added');
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('A guest with this phone/email already exists');
      } else {
        console.error('Error creating guest:', error);
        toast.error('Failed to add guest');
      }
    } finally {
      setIsAddingGuest(false);
    }
  };

  const handleRemoveGuest = (index: number) => {
    const newGuests = [...guests];
    newGuests[index] = null;
    setGuests(newGuests);
    setCurrentIndex(index);
  };

  const handleConfirm = () => {
    const validGuests = guests.filter((g): g is SplitGuest => g !== null);
    if (validGuests.length !== splitCount) {
      toast.error(`Please assign guests to all ${splitCount} invoices`);
      return;
    }
    onConfirm(validGuests);
  };

  const assignedCount = guests.filter(g => g !== null).length;
  const allAssigned = assignedCount === splitCount;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Assign Guests to Invoices
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Guest Slots */}
          <div className="grid grid-cols-5 gap-2">
            {guests.map((guest, idx) => (
              <Button
                key={idx}
                variant={currentIndex === idx ? 'default' : guest ? 'secondary' : 'outline'}
                size="sm"
                className="h-auto py-2 flex flex-col gap-1 relative"
                onClick={() => {
                  setCurrentIndex(idx);
                  resetForm();
                }}
              >
                {guest ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] truncate max-w-full">
                      {guest.guest_name.split(' ')[0]}
                    </span>
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3 opacity-50" />
                    <span className="text-[10px]">#{idx + 1}</span>
                  </>
                )}
              </Button>
            ))}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {assignedCount} of {splitCount} guests assigned
          </div>

          <Separator />

          {/* Current slot assignment */}
          {!allAssigned && guests[currentIndex] === null && (
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium mb-2">
                Assign Guest #{currentIndex + 1}
              </div>
              
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'manual')}>
                <TabsList className="w-full">
                  <TabsTrigger value="search" className="flex-1">
                    <Search className="w-3 h-3 mr-1" />
                    App User
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex-1">
                    <UserPlus className="w-3 h-3 mr-1" />
                    Manual
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-3 mt-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search name, phone or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={isSearching}>
                      {isSearching ? '...' : <Search className="w-4 h-4" />}
                    </Button>
                  </div>

                  <ScrollArea className="max-h-40">
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <div 
                          key={result.id}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => handleSelectSearchResult(result)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={result.avatar_url} />
                            <AvatarFallback>
                              {result.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium">{result.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {result.phone || result.email || 'No contact info'}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {result.type === 'app_user' ? 'App User' : 'Guest'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
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
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Phone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Phone number"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddManualGuest} className="w-full" disabled={isAddingGuest || !manualName.trim() || !manualPhone.trim() || !manualEmail.trim()}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isAddingGuest ? 'Adding...' : 'Add Guest'}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Assigned guests list */}
          {(allAssigned || guests[currentIndex] !== null) && (
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {guests.map((guest, idx) => guest && (
                  <div 
                    key={idx} 
                    className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg"
                  >
                    <Badge variant="outline" className="shrink-0">#{idx + 1}</Badge>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={guest.avatar_url} />
                      <AvatarFallback>{guest.guest_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{guest.guest_name}</div>
                      {guest.guest_phone && (
                        <div className="text-xs text-muted-foreground">{guest.guest_phone}</div>
                      )}
                    </div>
                    {guest.guest_user_id && (
                      <Badge variant="secondary" className="text-xs shrink-0">App User</Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveGuest(idx)}
                      className="shrink-0"
                    >
                      Change
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!allAssigned || isGenerating}
            className="flex-1"
          >
            {isGenerating ? 'Creating...' : `Create ${splitCount} Invoices`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}