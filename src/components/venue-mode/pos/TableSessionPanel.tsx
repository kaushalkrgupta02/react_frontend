import { useState, useEffect, useCallback } from 'react';
import { 
  X, Plus, Clock, Users, ShoppingBag, Receipt, 
  Check, Ban, ChefHat, Utensils, DollarSign, Pencil,
  Search, UserPlus, User, Phone, Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VenueTable } from '@/hooks/useVenueTables';
import { TableSession, SessionOrder, useTableSessions } from '@/hooks/useTableSessions';
import { useSessionOrders } from '@/hooks/useSessionOrders';
import { useGuestProfiles, GuestProfile } from '@/hooks/useGuestProfiles';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import OrderTakingSheet from './OrderTakingSheet';
import BillingSheet from './BillingSheet';
// import { useMenus } from '@/hooks/useMenus';

interface SelectedGuest {
  name: string;
  phone?: string;
  email?: string;
  userId?: string;
  avatarUrl?: string;
  profileId?: string;
  isNewManualEntry?: boolean; // True only for manually entered new guests that need profile creation
}

interface TableSessionPanelProps {
  venueId: string;
  table: VenueTable | null;
  session: TableSession | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function TableSessionPanel({
  venueId,
  table,
  session: initialSession,
  open,
  onClose,
  onRefresh
}: TableSessionPanelProps) {
  // (Restored) No FastAPI menu fetch here
  const { openSession, closeSession, getSessionById } = useTableSessions(venueId);
  const { updateItemStatus } = useSessionOrders(initialSession?.id || null);
  const { guests: venueGuests, createProfile } = useGuestProfiles(venueId);
  
  const [session, setSession] = useState<TableSession | null>(initialSession);
  const [isOpeningSession, setIsOpeningSession] = useState(false);
  const [guestCount, setGuestCount] = useState(table?.seats || 2);
  const [showOrderSheet, setShowOrderSheet] = useState(false);
  const [showBillingSheet, setShowBillingSheet] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SessionOrder | null>(null);

  // Guest selection state
  const [selectedGuest, setSelectedGuest] = useState<SelectedGuest | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
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
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  // Refresh session data - memoized to avoid re-creating on each render
  const refreshSession = useCallback(async () => {
    if (session?.id) {
      const updated = await getSessionById(session.id);
      if (updated) setSession(updated);
    }
  }, [session?.id, getSessionById]);

  // Pre-fill guest count from session or table capacity
  useEffect(() => {
    if (initialSession) {
      setGuestCount(initialSession.guest_count);
    } else if (table) {
      setGuestCount(table.seats);
    }
  }, [initialSession, table]);

  useEffect(() => {
    setSession(initialSession);
    if (!initialSession) {
      setGuestCount(table?.seats || 2);
      setSelectedGuest(null);
      setSearchQuery('');
      setSearchResults([]);
      setManualName('');
      setManualPhone('');
      setManualEmail('');
      setActiveTab('search');
    }
  }, [initialSession, table]);

  // Refresh session data when panel opens to get latest orders
  useEffect(() => {
    if (open && initialSession?.id) {
      // Fetch fresh data from DB
      getSessionById(initialSession.id).then(updated => {
        if (updated) setSession(updated);
      });
    }
  }, [open, initialSession?.id, getSessionById]);

  // Realtime subscription for orders on this session
  useEffect(() => {
    if (!session?.id || !open) return;

    const channel = supabase
      .channel(`session-orders-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_orders',
          filter: `session_id=eq.${session.id}`
        },
        () => {
          // Refresh when orders change
          getSessionById(session.id).then(updated => {
            if (updated) setSession(updated);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_order_items'
        },
        () => {
          // Refresh when items change
          getSessionById(session.id).then(updated => {
            if (updated) setSession(updated);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, open, getSessionById]);

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

      // Search app users by phone or name
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

    try {
      // Create the guest profile in the database immediately
      const newProfile = await createProfile.mutateAsync({
        venue_id: venueId,
        guest_name: manualName.trim(),
        guest_phone: manualPhone.trim() || null,
        guest_email: manualEmail.trim() || null
      });

      setSelectedGuest({
        name: manualName.trim(),
        phone: manualPhone.trim() || undefined,
        email: manualEmail.trim() || undefined,
        profileId: newProfile?.id // Profile now exists in DB
      });

      toast.success('Guest added successfully');
    } catch (error: any) {
      // Handle duplicate phone/email constraint
      if (error?.code === '23505') {
        toast.error('A guest with this phone or email already exists. Try searching instead.');
      } else {
        console.error('Error creating guest profile:', error);
        toast.error('Failed to add guest');
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedGuest(null);
    setSearchQuery('');
    setSearchResults([]);
    setManualName('');
    setManualPhone('');
    setManualEmail('');
  };

  const handleOpenSession = async () => {
    if (!table) return;
    if (!selectedGuest) {
      toast.error('Please select or add a guest');
      return;
    }
    
    setIsOpeningSession(true);
    
    try {
      const newSession = await openSession({
        venue_id: venueId,
        table_id: table.id,
        guest_count: guestCount,
        guest_name: selectedGuest.name
      });
      
      if (newSession) {
        setSession(newSession);
        onRefresh();
      }
    } catch (error) {
      console.error('Error opening session:', error);
      toast.error('Failed to open session');
    } finally {
      setIsOpeningSession(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    
    const success = await closeSession(session.id);
    if (success) {
      onRefresh();
      onClose();
    }
  };

  const handleMarkServed = async (itemId: string) => {
    await updateItemStatus(itemId, 'served');
    await refreshSession();
  };

  // Calculate session totals
  const calculateTotals = () => {
    let subtotal = 0;
    let pendingItems = 0;
    let servedItems = 0;

    session?.orders?.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items?.forEach(item => {
          if (item.status !== 'cancelled') {
            subtotal += item.quantity * item.unit_price;
            if (item.status === 'served') servedItems += item.quantity;
            else pendingItems += item.quantity;
          }
        });
      }
    });

    return { subtotal, pendingItems, servedItems };
  };

  const { subtotal, pendingItems, servedItems } = session ? calculateTotals() : { subtotal: 0, pendingItems: 0, servedItems: 0 };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    preparing: 'bg-blue-500/20 text-blue-400',
    ready: 'bg-emerald-500/20 text-emerald-400',
    served: 'bg-muted text-muted-foreground',
    cancelled: 'bg-red-500/20 text-red-400'
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center justify-between">
              <span>
                {table?.table_number || 'Walk-in'}
                {table && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {table.seats} seats • {table.location_zone || 'Main'}
                  </span>
                )}
              </span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            {!session ? (
              /* Open New Session */
              <div className="p-4 space-y-4">
                <Card className="p-4 space-y-4">
                  <h3 className="font-semibold">Open New Session</h3>
                  
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
                            <Button onClick={handleSearch} disabled={isSearching} size="icon">
                              {isSearching ? '...' : <Search className="w-4 h-4" />}
                            </Button>
                          </div>

                          {searchResults.length > 0 && (
                            <ScrollArea className="max-h-40">
                              <div className="space-y-2">
                                {searchResults.map((result) => (
                                  <div 
                                    key={`${result.type}-${result.id}`}
                                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                                    onClick={() => handleSelectGuest(result)}
                                  >
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={result.avatar_url} />
                                      <AvatarFallback>{result.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate text-sm">{result.name}</div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {result.phone || result.email || 'No contact'}
                                      </div>
                                    </div>
                                    <Badge variant={result.type === 'app_user' ? 'secondary' : 'outline'} className="text-xs">
                                      {result.type === 'app_user' ? 'App' : 'Guest'}
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
                          <Button 
                            onClick={handleAddManualGuest} 
                            className="w-full"
                            disabled={!manualName.trim() || !manualPhone.trim() || !manualEmail.trim()}
                            variant="secondary"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Guest
                          </Button>
                        </TabsContent>
                      </Tabs>
                    )}
                  </div>

                  <Button 
                    onClick={handleOpenSession} 
                    disabled={isOpeningSession || !selectedGuest}
                    className="w-full"
                  >
                    {isOpeningSession ? 'Opening...' : 'Open Session'}
                  </Button>
                </Card>
              </div>
            ) : (
              /* Active Session View */
              <div className="p-4 space-y-4">
                {/* Session Info */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{session.guest_count} Guests</span>
                      {session.guest_name && (
                        <span className="text-muted-foreground">• {session.guest_name}</span>
                      )}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={session.status === 'billing' ? 'text-amber-400 border-amber-400/50' : ''}
                    >
                      {session.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Opened {formatDistanceToNow(new Date(session.opened_at), { addSuffix: true })}
                  </div>
                </Card>

                {/* Running Total */}
                <Card className="p-4 bg-primary/10 border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Running Total</div>
                      <div className="text-2xl font-bold">{subtotal.toLocaleString()} IDR</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">{servedItems} served</div>
                      {pendingItems > 0 && (
                        <div className="text-amber-400">{pendingItems} pending</div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Action Buttons */}


                {/* (Restored) No debug print for FastAPI menus */}

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => setShowOrderSheet(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Order
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowBillingSheet(true)}
                    disabled={subtotal === 0}
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Bill
                  </Button>
                </div>

                <Separator />

                {/* Orders List */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Orders
                  </h3>

                  {session.orders?.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      No orders yet. Tap "Add Order" to start.
                    </div>
                  )}

                  {session.orders?.map(order => (
                    <Card key={order.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Order #{order.order_number}</span>
                          {order.status !== 'cancelled' && order.status !== 'served' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditingOrder(order);
                                setShowOrderSheet(true);
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <Badge variant="outline" className={statusColors[order.status]}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {format(new Date(order.created_at), 'HH:mm')}
                      </div>

                      <div className="space-y-2">
                        {order.items?.map(item => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between py-1 border-b border-border/50 last:border-0"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.quantity}x</span>
                                <span>{item.item_name}</span>
                                {item.destination === 'bar' && (
                                  <Utensils className="w-3 h-3 text-blue-400" />
                                )}
                                {item.destination === 'kitchen' && (
                                  <ChefHat className="w-3 h-3 text-orange-400" />
                                )}
                              </div>
                              {item.notes && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {item.notes}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${statusColors[item.status]}`}
                              >
                                {item.status}
                              </Badge>
                              {item.status !== 'served' && item.status !== 'cancelled' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleMarkServed(item.id)}
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>

                <Separator />

                {/* Close Session */}
                {session.status === 'paid' && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleCloseSession}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Close Session
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Order Taking Sheet */}
      <OrderTakingSheet
        venueId={venueId}
        sessionId={session?.id || null}
        open={showOrderSheet}
        onClose={() => {
          setShowOrderSheet(false);
          setEditingOrder(null);
        }}
        onOrderSubmitted={() => {
          refreshSession();
          onRefresh();
          setEditingOrder(null);
        }}
        editingOrder={editingOrder}
      />

      {/* Billing Sheet */}
      {session && (
        <BillingSheet
          venueId={venueId}
          session={session}
          open={showBillingSheet}
          onClose={() => setShowBillingSheet(false)}
          onPaymentComplete={() => {
            refreshSession();
            onRefresh();
          }}
        />
      )}
    </>
  );
}
