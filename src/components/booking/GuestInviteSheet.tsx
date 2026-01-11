import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserPlus, Phone, Mail, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GuestInviteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteAppUser: (userId: string, profile: { display_name: string | null; phone: string | null }) => Promise<void>;
  onAddManualGuest: (guest: { name: string; phone: string; email?: string }) => Promise<void>;
  maxGuests: number;
  currentGuestCount: number;
}

export function GuestInviteSheet({
  open,
  onOpenChange,
  onInviteAppUser,
  onAddManualGuest,
  maxGuests,
  currentGuestCount,
}: GuestInviteSheetProps) {
  const [activeTab, setActiveTab] = useState<'app' | 'manual'>('app');
  const [searchPhone, setSearchPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    user_id: string;
    display_name: string | null;
    phone: string | null;
  } | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // Manual guest form
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  const remainingSlots = maxGuests - currentGuestCount;

  const handleSearchUser = async () => {
    if (!searchPhone.trim()) return;
    
    setIsSearching(true);
    setSearchResult(null);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, phone')
        .eq('phone', searchPhone.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('No user found with this phone number');
        } else {
          throw error;
        }
        return;
      }

      setSearchResult(data);
    } catch (error) {
      console.error('Error searching user:', error);
      toast.error('Failed to search for user');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInviteUser = async () => {
    if (!searchResult) return;
    
    setIsInviting(true);
    try {
      await onInviteAppUser(searchResult.user_id, {
        display_name: searchResult.display_name,
        phone: searchResult.phone,
      });
      toast.success('Guest invited successfully');
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Failed to invite guest');
    } finally {
      setIsInviting(false);
    }
  };

  const handleAddManual = async () => {
    if (!manualName.trim() || !manualPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    setIsInviting(true);
    try {
      await onAddManualGuest({
        name: manualName.trim(),
        phone: manualPhone.trim(),
        email: manualEmail.trim() || undefined,
      });
      toast.success('Guest added successfully');
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding manual guest:', error);
      toast.error('Failed to add guest');
    } finally {
      setIsInviting(false);
    }
  };

  const resetForm = () => {
    setSearchPhone('');
    setSearchResult(null);
    setManualName('');
    setManualPhone('');
    setManualEmail('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Add Guest</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {remainingSlots} of {maxGuests} spots available
          </p>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'app' | 'manual')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="app">App User</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="app" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="search-phone">Search by Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  id="search-phone"
                  placeholder="+62812345678"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={handleSearchUser}
                  disabled={isSearching || !searchPhone.trim()}
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {searchResult && (
              <div className="p-4 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {searchResult.display_name || 'App User'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {searchResult.phone}
                    </p>
                  </div>
                  <Button
                    onClick={handleInviteUser}
                    disabled={isInviting || remainingSlots <= 0}
                    size="sm"
                  >
                    {isInviting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Invite
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Invited users will see this booking in their app and receive a notification.
            </p>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="manual-name">Guest Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="manual-name"
                  placeholder="Enter guest name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="manual-phone"
                  placeholder="+62812345678"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-email">Email (optional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="manual-email"
                  type="email"
                  placeholder="guest@email.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleAddManual}
              disabled={isInviting || remainingSlots <= 0 || !manualName.trim() || !manualPhone.trim()}
            >
              {isInviting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Add Guest
            </Button>

            <p className="text-xs text-muted-foreground">
              Non-app guests will receive a shareable link to view their pass and can download the app to manage it.
            </p>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
