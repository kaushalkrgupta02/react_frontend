import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Settings2, Building2, Megaphone, Ticket, Package, Users, Wallet, ScanLine, UtensilsCrossed, LogOut, ChefHat, Wine } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import VenueModeAnalytics from '@/components/venue-mode/VenueModeAnalytics';
import VenueModeBookings from '@/components/venue-mode/VenueModeBookings';
import VenueModePreferences from '@/components/venue-mode/VenueModePreferences';
import VenueModePromosOperations from '@/components/venue-mode/promo/VenueModePromosOperations';
import VenueModePasses from '@/components/venue-mode/VenueModePasses';
import { VenueModePackages } from '@/components/venue-mode/packages';
import { GuestListPanel } from '@/components/venue-mode/crm';
import { DepositManagementPanel } from '@/components/venue-mode/deposits';
import UnifiedCheckIn from '@/components/venue-mode/UnifiedCheckIn';
import VenueModePOS from '@/components/venue-mode/pos/VenueModePOS';
import { DestinationDisplayScreen } from '@/components/venue-mode/pos';
import { useAdminVenues } from '@/hooks/useAdminVenues';
import { useUserRole } from '@/hooks/useUserRole';
import { useStaffProfile } from '@/hooks/useStaffProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TabType = 'checkin' | 'pos' | 'dashboard' | 'bookings' | 'passes' | 'packages' | 'promos' | 'guests' | 'deposits' | 'preferences' | 'kitchen' | 'bar';

// Map routes to tabs
const routeToTab: Record<string, TabType> = {
  '/': 'checkin',
  '/tables': 'bookings',
  '/orders': 'pos',
  '/guests': 'guests',
  '/passes': 'passes',
  '/packages': 'packages',
  '/promos': 'promos',
  '/deposits': 'deposits',
  '/settings': 'preferences',
  '/queue': 'pos',
  '/kitchen': 'kitchen',
  '/bar': 'bar',
};

// Map tabs back to routes for navigation
const tabToRoute: Record<TabType, string> = {
  checkin: '/',
  bookings: '/tables',
  pos: '/orders',
  guests: '/guests',
  passes: '/passes',
  packages: '/packages',
  promos: '/promos',
  deposits: '/deposits',
  preferences: '/settings',
  dashboard: '/analytics',
  kitchen: '/kitchen',
  bar: '/bar',
};

export default function VenueModePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { venues, isLoading: venuesLoading } = useAdminVenues();
  const { roles, isManager, isAdmin, isVenueManager, isReception, isWaitress, isKitchen, isBar } = useUserRole();
  const { staffProfile, venueId: staffVenueId } = useStaffProfile();
  const { user } = useAuth();
  
  // Determine active tab from current route - Kitchen/Bar roles have special handling
  const getActiveTab = (): TabType => {
    // Kitchen role: always show kitchen
    if (isKitchen && !isManager && !isAdmin && !isVenueManager) {
      return 'kitchen';
    }
    // Bar role: always show bar
    if (isBar && !isManager && !isAdmin && !isVenueManager) {
      return 'bar';
    }
    return routeToTab[location.pathname] || 'checkin';
  };
  
  const activeTab = getActiveTab();
  
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  // Set venue from staff profile or default to first venue
  useEffect(() => {
    if (staffVenueId) {
      setSelectedVenueId(staffVenueId);
    } else if (venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id);
    }
  }, [venues, selectedVenueId, staffVenueId]);

  // Redirect waitress to Orders tab by default, kitchen to kitchen, bar to bar
  useEffect(() => {
    const isOnlyKitchen = isKitchen && !isManager && !isAdmin && !isVenueManager;
    const isOnlyBar = isBar && !isManager && !isAdmin && !isVenueManager;
    
    if (isOnlyKitchen && location.pathname !== '/kitchen') {
      navigate('/kitchen', { replace: true });
    } else if (isOnlyBar && location.pathname !== '/bar') {
      navigate('/bar', { replace: true });
    } else if (isWaitress && location.pathname === '/') {
      navigate('/orders', { replace: true });
    }
  }, [isWaitress, isKitchen, isBar, isManager, isAdmin, isVenueManager, location.pathname, navigate]);

  // Get role label
  const getRoleLabel = () => {
    if (isAdmin) return 'Admin';
    if (isVenueManager) return 'Venue Manager';
    if (isManager) return 'Manager';
    if (roles.includes('reception')) return 'Reception';
    if (roles.includes('waitress')) return 'Waitress';
    if (roles.includes('kitchen')) return 'Kitchen';
    if (roles.includes('bar')) return 'Bar';
    return 'Staff';
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to logout');
    } else {
      navigate('/auth');
    }
  };

  // Get display name from staff profile or user email
  const displayName = staffProfile?.display_name || user?.email?.split('@')[0] || 'User';

  const selectedVenue = venues.find(v => v.id === selectedVenueId);
  const roleLabel = getRoleLabel();
  const canSelectVenue = isAdmin || isVenueManager || isManager || !staffVenueId;

  // Check if user is ONLY kitchen or bar (not also a manager)
  const isOnlyKitchen = isKitchen && !isManager && !isAdmin && !isVenueManager;
  const isOnlyBar = isBar && !isManager && !isAdmin && !isVenueManager;

  // Define all tabs with role restrictions
  const allTabs: { id: TabType; label: string; icon: typeof ScanLine; managerOnly?: boolean; kitchenOnly?: boolean; barOnly?: boolean }[] = [
    { id: 'checkin', label: 'Check In', icon: ScanLine },
    { id: 'pos', label: 'Orders', icon: UtensilsCrossed },
    { id: 'bookings', label: 'Tables', icon: CalendarCheck },
    { id: 'passes', label: 'Passes', icon: Ticket },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'promos', label: 'Promos', icon: Megaphone },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'deposits', label: 'Deposits', icon: Wallet, managerOnly: true },
    { id: 'dashboard', label: 'Analytics', icon: LayoutDashboard, managerOnly: true },
    { id: 'preferences', label: 'Settings', icon: Settings2, managerOnly: true },
    { id: 'kitchen', label: 'Kitchen', icon: ChefHat, kitchenOnly: true },
    { id: 'bar', label: 'Bar', icon: Wine, barOnly: true },
  ];

  // Filter tabs based on role
  const canAccessManagerTabs = isAdmin || isVenueManager || isManager;
  
  // Kitchen only sees Kitchen tab
  // Bar only sees Bar tab
  // Others see filtered tabs based on their role
  const tabs = (() => {
    if (isOnlyKitchen) {
      return allTabs.filter(tab => tab.id === 'kitchen');
    }
    if (isOnlyBar) {
      return allTabs.filter(tab => tab.id === 'bar');
    }
    // For other roles, filter out kitchen/bar only tabs and manager-only tabs if not manager
    return allTabs.filter(tab => {
      if (tab.kitchenOnly || tab.barOnly) return false;
      if (tab.managerOnly && !canAccessManagerTabs) return false;
      return true;
    });
  })();

  return (
    <div className="min-h-screen bg-background dark flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Venue Branding */}
            <div className="flex items-center gap-3">
              {selectedVenue?.cover_image_url ? (
                <img 
                  src={selectedVenue.cover_image_url} 
                  alt={selectedVenue.name} 
                  className="w-10 h-10 rounded-lg object-cover border border-border"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  {selectedVenue?.name || 'Venue Manager'}
                </h1>
                <p className="text-xs text-muted-foreground">Welcome, {displayName}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Venue Selector - only for managers/admins or if no staff profile */}
        {canSelectVenue && venues.length > 0 && (
          <div className="px-4 pb-3">
            <Select value={selectedVenueId || ''} onValueChange={setSelectedVenueId}>
              <SelectTrigger className="w-full bg-card border-border">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="Select venue..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                {venues.map(venue => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </header>

      {/* Tab Navigation - horizontal scroll for mobile */}
      <nav className="bg-background border-b border-border overflow-x-auto">
        <div className="flex min-w-max px-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(tabToRoute[id])}
              className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {venuesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'checkin' && <UnifiedCheckIn key={selectedVenueId || 'default'} venueId={selectedVenueId} />}
            {activeTab === 'pos' && <VenueModePOS key={selectedVenueId || 'default'} venueId={selectedVenueId} />}
            {activeTab === 'dashboard' && <VenueModeAnalytics key={selectedVenueId || 'default'} selectedVenueId={selectedVenueId} />}
            {activeTab === 'bookings' && <VenueModeBookings key={selectedVenueId || 'default'} selectedVenueId={selectedVenueId} />}
            {activeTab === 'passes' && <VenueModePasses key={selectedVenueId || 'default'} selectedVenueId={selectedVenueId} />}
            {activeTab === 'packages' && <VenueModePackages key={selectedVenueId || 'default'} selectedVenueId={selectedVenueId} />}
            {activeTab === 'promos' && <VenueModePromosOperations key={selectedVenueId || 'default'} selectedVenueId={selectedVenueId} />}
            {activeTab === 'guests' && selectedVenueId && <GuestListPanel venueId={selectedVenueId} />}
            {activeTab === 'deposits' && selectedVenueId && <DepositManagementPanel venueId={selectedVenueId} />}
            {activeTab === 'preferences' && <VenueModePreferences key={selectedVenueId || 'default'} selectedVenueId={selectedVenueId} />}
            {activeTab === 'kitchen' && selectedVenueId && <DestinationDisplayScreen venueId={selectedVenueId} destination="kitchen" title="Kitchen Orders" />}
            {activeTab === 'bar' && selectedVenueId && <DestinationDisplayScreen venueId={selectedVenueId} destination="bar" title="Bar Orders" />}
          </>
        )}
      </div>
    </div>
  );
}
