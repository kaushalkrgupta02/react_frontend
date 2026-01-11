import { useState, useMemo } from 'react';
import { Activity, Users, Zap, DollarSign, Clock } from 'lucide-react';
import { useAdminVenues } from '@/hooks/useAdminVenues';
import { useAdminBookings } from '@/hooks/useAdminBookings';
import { useAggregatedAnalytics } from '@/hooks/useVenueAnalytics';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import RevenueChart from './analytics/RevenueChart';
import CapacityHeatmap from './analytics/CapacityHeatmap';
import BookingFunnel from './analytics/BookingFunnel';
import FeedbackStatsCard from './analytics/FeedbackStatsCard';
import CrowdAnalyticsSection from './analytics/CrowdAnalyticsSection';
import CompetitorDensityCard from './analytics/CompetitorDensityCard';
import AudienceProximityCard from './analytics/AudienceProximityCard';
import CapacitySlider from './CapacitySlider';
import { WaitlistManagement } from './WaitlistManagement';

const statusOptions = [
  { value: 'quiet', label: 'Quiet', color: 'bg-blue-500' },
  { value: 'perfect', label: 'Perfect', color: 'bg-green-500' },
  { value: 'ideal', label: 'Ideal', color: 'bg-emerald-500' },
  { value: 'busy', label: 'Busy', color: 'bg-amber-500' },
  { value: 'too_busy', label: 'Too Busy', color: 'bg-red-500' },
] as const;

// Generate consistent mock data for demo when no real data exists
const generateMockRevenueData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const baseRevenues = [1200000, 1500000, 1800000, 2200000, 4500000, 5200000, 3800000];
  return days.map((date, i) => ({
    date,
    revenue: baseRevenues[i],
    bookings: Math.floor(baseRevenues[i] * 0.6),
    lineSkip: Math.floor(baseRevenues[i] * 0.4),
  }));
};

const generateMockHeatmapData = () => {
  const data = [];
  for (let day = 0; day < 7; day++) {
    for (const hour of [18, 19, 20, 21, 22, 23, 0, 1, 2]) {
      const isFriSat = day === 5 || day === 6;
      const isPeakHour = hour >= 22 || hour <= 1;
      const baseValue = isFriSat ? 65 : 35;
      const peakBonus = isPeakHour ? 25 : 0;
      const variation = (day * 3 + hour) % 15;
      data.push({ day, hour, value: Math.min(100, baseValue + peakBonus + variation) });
    }
  }
  return data;
};

interface VenueModeDashboardProps {
  selectedVenueId: string | null;
  selectedVenueName?: string;
}

export default function VenueModeDashboard({ selectedVenueId, selectedVenueName }: VenueModeDashboardProps) {
  const { venues, isLoading: venuesLoading, updateVenueStatus, updateLineSkipSettings } = useAdminVenues();
  const { bookings, isLoading: bookingsLoading } = useAdminBookings(selectedVenueId);
  const [updatingVenueId, setUpdatingVenueId] = useState<string | null>(null);

  // Use selected venue from props, fallback to first venue
  const primaryVenueId = selectedVenueId || venues[0]?.id;
  const primaryVenueName = selectedVenueName || venues[0]?.name;
  
  // Get the selected venue data for stats
  const selectedVenue = venues.find(v => v.id === primaryVenueId);

  // Get aggregated analytics from the new tables
  const {
    revenueData: realRevenueData,
    heatmapData: realHeatmapData,
    funnelData: realFunnelData,
    isLoading: analyticsLoading,
    hasData,
  } = useAggregatedAnalytics(primaryVenueId);

  const today = new Date().toISOString().split('T')[0];

  // Calculate stats
  const todayBookings = bookings.filter(b => b.booking_date === today);
  const pendingCount = todayBookings.filter(b => b.status === 'pending').length;
  const confirmedCount = todayBookings.filter(b => b.status === 'confirmed').length;
  const totalRequests = todayBookings.length;
  const acceptedRequests = todayBookings.filter(b => b.status === 'confirmed').length;

  // Pass stats - only for selected venue (combine entry + VIP)
  const entryRevenue = selectedVenue && selectedVenue.entry_pass_enabled && selectedVenue.entry_pass_price
    ? selectedVenue.entry_pass_sold_count * selectedVenue.entry_pass_price
    : 0;
  const vipRevenue = selectedVenue && selectedVenue.vip_pass_enabled && selectedVenue.vip_pass_price
    ? selectedVenue.vip_pass_sold_count * selectedVenue.vip_pass_price
    : 0;
  const totalLineSkipRevenue = entryRevenue + vipRevenue;

  const totalLineSkipSold = (selectedVenue?.entry_pass_sold_count || 0) + (selectedVenue?.vip_pass_sold_count || 0);

  // Use real data if available, otherwise use demo data
  const revenueData = useMemo(() => {
    return hasData && realRevenueData.length > 0 ? realRevenueData : generateMockRevenueData();
  }, [hasData, realRevenueData]);

  const heatmapData = useMemo(() => {
    return hasData && realHeatmapData.length > 0 ? realHeatmapData : generateMockHeatmapData();
  }, [hasData, realHeatmapData]);

  const funnelData = useMemo(() => {
    if (hasData && (realFunnelData.showed > 0 || realFunnelData.noShow > 0)) {
      return realFunnelData;
    }
    return {
      requests: totalRequests || 25,
      confirmed: acceptedRequests || 18,
      showed: Math.floor((acceptedRequests || 18) * 0.85),
      noShow: Math.floor((acceptedRequests || 18) * 0.15),
    };
  }, [hasData, realFunnelData, totalRequests, acceptedRequests]);

  const handleStatusChange = async (venueId: string, status: typeof statusOptions[number]['value']) => {
    setUpdatingVenueId(venueId);
    const result = await updateVenueStatus(venueId, status);
    if (result.success) {
      toast.success('Status updated');
    } else {
      toast.error(result.error || 'Failed to update status');
    }
    setUpdatingVenueId(null);
  };

  const handleEntryPassToggle = async (venueId: string, enabled: boolean) => {
    setUpdatingVenueId(venueId);
    const result = await updateLineSkipSettings(venueId, { entry_pass_enabled: enabled });
    if (result.success) {
      toast.success(enabled ? 'Entry Pass enabled' : 'Entry Pass disabled');
    } else {
      toast.error(result.error || 'Failed to update');
    }
    setUpdatingVenueId(null);
  };

  if (venuesLoading || bookingsLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Data Source Indicator */}
      {!hasData && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <p className="text-xs text-amber-400">
            📊 Showing demo data. Real analytics will appear as venue activity is tracked.
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Pending</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">requests tonight</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Confirmed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{confirmedCount}</p>
          <p className="text-xs text-muted-foreground">bookings tonight</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-xs">Passes</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalLineSkipSold}</p>
          <p className="text-xs text-muted-foreground">sold today</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-foreground">Rp {totalLineSkipRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">passes today</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <RevenueChart data={revenueData} isLoading={analyticsLoading} />

      {/* Capacity Heatmap & Booking Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CapacityHeatmap data={heatmapData} isLoading={analyticsLoading} />
        <BookingFunnel data={funnelData} isLoading={analyticsLoading} />
      </div>

      {/* Guest Feedback */}
      <FeedbackStatsCard venueId={primaryVenueId} />

      {/* Crowd Analytics from Telkomsel */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-medium text-foreground mb-4">📍 Live Crowd Analytics</h3>
        <CrowdAnalyticsSection venueId={primaryVenueId} />
      </div>

      {/* Competitor & Audience Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CompetitorDensityCard venueId={primaryVenueId} />
        <AudienceProximityCard venueId={primaryVenueId} />
      </div>

      {/* Live Capacity Slider */}
      {primaryVenueId && primaryVenueName && (
        <CapacitySlider venueId={primaryVenueId} venueName={primaryVenueName} />
      )}

      {/* Waitlist Management */}
      <WaitlistManagement selectedVenueId={primaryVenueId} selectedVenueName={primaryVenueName} />

      {/* Venue Controls - Only show for selected venue */}
      {selectedVenue && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Venue Controls
          </h3>
          
          {(() => {
            const venue = selectedVenue;
            const currentStatus = statusOptions.find(s => s.value === venue.status);
            const remaining = venue.line_skip_daily_limit 
              ? venue.line_skip_daily_limit - venue.line_skip_sold_count 
              : null;

            return (
              <div className="bg-card rounded-xl p-4 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">{venue.name}</h4>
                  <div className={`px-2 py-0.5 rounded-full text-xs text-white ${currentStatus?.color || 'bg-gray-500'}`}>
                    {currentStatus?.label || venue.status}
                  </div>
                </div>

                {/* Status Buttons */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Crowd Status</p>
                  <div className="flex flex-wrap gap-1">
                    {statusOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleStatusChange(venue.id, option.value)}
                        disabled={updatingVenueId === venue.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          venue.status === option.value
                            ? `${option.color} text-white`
                            : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Entry Pass Control */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-sm text-foreground">Entry Pass Sales</p>
                    {venue.entry_pass_enabled && (
                      <p className="text-xs text-muted-foreground">
                        {venue.entry_pass_sold_count} sold
                        {venue.entry_pass_daily_limit && ` • ${venue.entry_pass_daily_limit - venue.entry_pass_sold_count} remaining`}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={venue.entry_pass_enabled}
                    onCheckedChange={(checked) => handleEntryPassToggle(venue.id, checked)}
                    disabled={updatingVenueId === venue.id}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
