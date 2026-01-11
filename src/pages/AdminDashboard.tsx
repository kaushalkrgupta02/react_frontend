import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Shield, 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp,
  Percent,
  LayoutDashboard,
  UserCircle,
  Target,
  BarChart3,
  Brain,
  AlertTriangle,
  UsersRound,
  Sparkles,
  Key,
  Link2,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminVenues } from '@/hooks/useAdminVenues';
import { useAdminBookings } from '@/hooks/useAdminBookings';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import Customer360Panel from '@/components/venue-mode/analytics/Customer360Panel';
import Venue360Dashboard from '@/components/venue-mode/analytics/Venue360Dashboard';
import SmartMatchingPanel from '@/components/venue-mode/analytics/SmartMatchingPanel';
import AIInsightsPanel from '@/components/venue-mode/analytics/AIInsightsPanel';
import AIAccuracyPanel from '@/components/venue-mode/analytics/AIAccuracyPanel';
import NoShowRiskPanel from '@/components/venue-mode/analytics/NoShowRiskPanel';
import StaffingRecommendation from '@/components/venue-mode/analytics/StaffingRecommendation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CommissionPayoutPanel from '@/components/admin/CommissionPayoutPanel';
import ApiKeysConfigPanel from '@/components/admin/ApiKeysConfigPanel';
import { ProviderConnectionPanel } from '@/components/venue-mode/providers/ProviderConnectionPanel';
import TelecomSettingsSection from '@/components/venue-mode/telkomsel/TelecomSettingsSection';
import { useDemandForecast } from '@/hooks/useDemandForecast';

const adminTabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'customer360', label: 'Customer 360', icon: UserCircle },
  { id: 'venue360', label: 'Venue 360', icon: Building2 },
  { id: 'matching', label: 'Smart Matching', icon: Target },
  { id: 'ai-insights', label: 'AI Insights', icon: Brain },
  { id: 'ai-accuracy', label: 'AI Accuracy', icon: Sparkles },
  { id: 'no-show', label: 'No-Show Risk', icon: AlertTriangle },
  { id: 'staffing', label: 'Staffing', icon: UsersRound },
  { id: 'commissions', label: 'Commissions', icon: Percent },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'providers', label: 'Providers', icon: Link2 },
  { id: 'telecom', label: 'Telecom', icon: Phone },
];

// Hook for cross-venue stats
function useCrossVenueStats() {
  return useQuery({
    queryKey: ['cross-venue-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get total venues
      const { count: venueCount } = await supabase
        .from('venues')
        .select('*', { count: 'exact', head: true });

      // Get total bookings last 30 days
      const { count: bookingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo);

      // Get total users with segments
      const { count: customerCount } = await supabase
        .from('customer_segments')
        .select('*', { count: 'exact', head: true });

      // Get promo commissions
      const { data: commissions } = await supabase
        .from('promo_commissions')
        .select('commission_amount, status')
        .eq('status', 'pending');

      const pendingCommissions = commissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;

      // Get active promos
      const { count: activePromos } = await supabase
        .from('promos')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString());

      // Get line skip revenue
      const { data: venues } = await supabase
        .from('venues')
        .select('line_skip_sold_count, line_skip_price')
        .eq('line_skip_enabled', true);

      const totalLineSkipRevenue = venues?.reduce((sum, v) => 
        sum + ((v.line_skip_sold_count || 0) * (v.line_skip_price || 0)), 0) || 0;

      return {
        venueCount: venueCount || 0,
        bookingCount: bookingCount || 0,
        customerCount: customerCount || 0,
        pendingCommissions,
        activePromos: activePromos || 0,
        totalLineSkipRevenue,
      };
    },
  });
}

// Hook for venue performance ranking
function useVenuePerformance() {
  return useQuery({
    queryKey: ['venue-performance'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('venue_profiles')
        .select(`
          venue_id,
          total_revenue_30d,
          total_bookings_30d,
          avg_show_up_rate,
          promo_effectiveness_score,
          venues (name)
        `)
        .order('total_revenue_30d', { ascending: false })
        .limit(10);

      return profiles || [];
    },
  });
}

// Hook for commission data
function useCommissionData() {
  return useQuery({
    queryKey: ['commission-data'],
    queryFn: async () => {
      const { data: commissions } = await supabase
        .from('promo_commissions')
        .select(`
          *,
          promos (title, venue_id),
          venues (name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      return commissions || [];
    },
  });
}

// TEMP: Enable test mode for development - remove for production
const DEV_BYPASS_ADMIN_CHECK = true;

// Wrapper component for AI Insights Panel (fetches data from demand forecast)
function AIInsightsPanelWrapper({ venueId }: { venueId: string }) {
  const { data, isLoading, refetch } = useDemandForecast(venueId);
  
  const predictions = data?.predictions?.map((p: any) => ({
    type: p.type as 'demand' | 'staffing' | 'noShow' | 'promo' | 'revenue',
    title: p.title,
    value: p.value,
    confidence: p.confidence,
    insight: p.insight,
    action: p.action,
    promoSuggestion: p.promoSuggestion,
  })) || [];

  return (
    <AIInsightsPanel 
      predictions={predictions} 
      isLoading={isLoading} 
      onRefresh={refetch}
    />
  );
}

// Wrapper component for No-Show Risk Panel
function NoShowRiskPanelWrapper({ venueId }: { venueId: string }) {
  const { data, isLoading } = useDemandForecast(venueId);
  
  const bookings = data?.noShowRiskBookings?.map((b) => ({
    bookingId: b.bookingId,
    bookingRef: b.bookingRef,
    partySize: b.partySize,
    riskLevel: b.riskLevel,
    riskScore: b.riskScore,
    riskFactors: b.riskFactors || [],
    suggestedAction: b.suggestedAction || '',
  })) || [];

  return (
    <NoShowRiskPanel 
      bookings={bookings} 
      isLoading={isLoading}
    />
  );
}

// Wrapper component for Staffing Recommendation
function StaffingRecommendationWrapper({ venueId }: { venueId: string }) {
  const { data, isLoading } = useDemandForecast(venueId);
  
  const staffingPrediction = data?.predictions?.find((p) => p.type === 'staffing');
  const demandPrediction = data?.predictions?.find((p) => p.type === 'demand');
  
  // Parse staffing value like "12-15 staff"
  const staffMatch = staffingPrediction?.value?.match(/(\d+)/);
  const totalStaff = staffMatch ? parseInt(staffMatch[1]) : 0;
  
  // Parse expected guests from demand or metadata
  const guestMatch = demandPrediction?.value?.match(/(\d+)/);
  const expectedGuests = guestMatch ? parseInt(guestMatch[1]) : 0;

  return (
    <StaffingRecommendation
      totalStaff={totalStaff}
      confidence={staffingPrediction?.confidence || 0}
      expectedGuests={expectedGuests}
      isLoading={isLoading}
    />
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { venues, isLoading: venuesLoading } = useAdminVenues();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useCrossVenueStats();
  const { data: venuePerformance, isLoading: performanceLoading } = useVenuePerformance();
  const { data: commissions, isLoading: commissionsLoading } = useCommissionData();

  // Set first venue as default for 360 views
  const activeVenueId = selectedVenueId || venues[0]?.id;
  const activeVenueName = venues.find(v => v.id === activeVenueId)?.name;

  if (roleLoading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin && !DEV_BYPASS_ADMIN_CHECK) {
    return (
      <div className="min-h-full bg-background p-6">
        <div className="text-center py-20">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need admin privileges to access this page.</p>
          <Button onClick={() => navigate('/profile')}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/30 px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">Nightly Admin</h1>
              <p className="text-xs text-muted-foreground">Cross-venue analytics</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg overflow-x-auto">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Venue Selector for 360 views */}
        {(activeTab === 'customer360' || activeTab === 'venue360' || activeTab === 'matching' || activeTab === 'providers' || activeTab === 'telecom') && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Viewing:</span>
            <Select value={activeVenueId || ''} onValueChange={setSelectedVenueId}>
              <SelectTrigger className="w-64">
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
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Cross-Venue Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Building2 className="w-4 h-4" />
                    <span className="text-xs">Total Venues</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats?.venueCount || 0}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Segmented Customers</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats?.customerCount || 0}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs">Bookings (30d)</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats?.bookingCount || 0}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Line Skip Revenue</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      Rp {(stats?.totalLineSkipRevenue || 0).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Percent className="w-4 h-4" />
                    <span className="text-xs">Pending Commissions</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-primary">
                      Rp {(stats?.pendingCommissions || 0).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-xs">Active Promos</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats?.activePromos || 0}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Venue Performance Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Venue Performance (30d)
                </CardTitle>
                <CardDescription>Top performing venues by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : venuePerformance && venuePerformance.length > 0 ? (
                  <div className="space-y-2">
                    {venuePerformance.map((vp: any, index: number) => (
                      <div
                        key={vp.venue_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedVenueId(vp.venue_id);
                          setActiveTab('venue360');
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-yellow-950' :
                            index === 1 ? 'bg-gray-300 text-gray-800' :
                            index === 2 ? 'bg-amber-600 text-amber-50' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-medium text-foreground">{vp.venues?.name || 'Unknown'}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">
                            Rp {(vp.total_revenue_30d || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {vp.total_bookings_30d || 0} bookings • {((vp.avg_show_up_rate || 0) * 100).toFixed(0)}% show rate
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No venue data available. Run venue profiler to generate insights.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActiveTab('customer360')}
                >
                  <UserCircle className="w-5 h-5" />
                  <span className="text-xs">Customer 360</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActiveTab('venue360')}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="text-xs">Venue 360</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActiveTab('matching')}
                >
                  <Target className="w-5 h-5" />
                  <span className="text-xs">Smart Matching</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => navigate('/venue-mode')}
                >
                  <Shield className="w-5 h-5" />
                  <span className="text-xs">Venue Mode</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Customer 360 Tab */}
        {activeTab === 'customer360' && activeVenueId && (
          <Customer360Panel venueId={activeVenueId} />
        )}

        {/* Venue 360 Tab */}
        {activeTab === 'venue360' && activeVenueId && (
          <Venue360Dashboard venueId={activeVenueId} venueName={activeVenueName} />
        )}

        {/* Smart Matching Tab */}
        {activeTab === 'matching' && activeVenueId && (
          <SmartMatchingPanel venueId={activeVenueId} venueName={activeVenueName} />
        )}

        {/* AI Insights Tab */}
        {activeTab === 'ai-insights' && activeVenueId && (
          <AIInsightsPanelWrapper venueId={activeVenueId} />
        )}

        {/* AI Accuracy Tab */}
        {activeTab === 'ai-accuracy' && (
          <AIAccuracyPanel venueId={activeVenueId} />
        )}

        {/* No-Show Risk Tab */}
        {activeTab === 'no-show' && activeVenueId && (
          <NoShowRiskPanelWrapper venueId={activeVenueId} />
        )}

        {/* Staffing Tab */}
        {activeTab === 'staffing' && activeVenueId && (
          <StaffingRecommendationWrapper venueId={activeVenueId} />
        )}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && (
          <CommissionPayoutPanel />
        )}

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <ApiKeysConfigPanel />
        )}

        {/* Providers Tab */}
        {activeTab === 'providers' && activeVenueId && (
          <ProviderConnectionPanel venueId={activeVenueId} />
        )}
        {activeTab === 'providers' && !activeVenueId && (
          <Card>
            <CardContent className="py-8 text-center">
              <Link2 className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Select a venue to manage provider connections</p>
            </CardContent>
          </Card>
        )}

        {/* Telecom Tab */}
        {activeTab === 'telecom' && (
          <TelecomSettingsSection venues={venues} selectedVenueId={selectedVenueId} />
        )}
      </div>
    </div>
  );
}
