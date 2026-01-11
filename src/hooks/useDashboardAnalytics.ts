import { useMemo } from 'react';
import { startOfDay, startOfWeek, startOfMonth, subDays, isAfter, parseISO, format, subWeeks } from 'date-fns';
import { useAdminBookings, AdminBooking } from './useAdminBookings';
import { useVenuePasses } from './useVenuePasses';
import { usePackagePurchases, PackagePurchase } from './usePackagePurchases';
import { useVenuePromos, VenuePromo } from './useVenuePromos';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface BookingOutcome {
  id: string;
  booking_id: string;
  venue_id: string;
  outcome: string;
  actual_party_size: number | null;
  spend_amount: number | null;
  arrived_at: string | null;
  feedback_rating: number | null;
  created_at: string;
}

export type DateRange = 'today' | 'week' | 'month' | 'custom';

interface PromoAnalytics {
  id: string;
  promo_id: string;
  impressions: number | null;
  clicks: number | null;
  redemptions: number | null;
  revenue_generated: number | null;
  conversion_rate: number | null;
  recorded_date: string;
}

interface PeriodStats {
  count: number;
  revenue: number;
  previousCount: number;
  previousRevenue: number;
  changePercent: number;
  revenueChangePercent: number;
}

interface KPIData {
  label: string;
  value: number;
  formattedValue: string;
  previousValue: number;
  changePercent: number;
  trend: 'up' | 'down' | 'neutral';
  color: string;
}

interface TrendDataPoint {
  date: string;
  bookings: number;
  passes: number;
  packages: number;
  promos: number;
  total: number;
}

export interface HeatmapData {
  day: number;
  hour: number;
  value: number;
}

export interface FunnelData {
  requests: number;
  confirmed: number;
  showed: number;
  noShow: number;
}

export interface WalkInStats {
  count: number;
  revenue: number;
  avgSpend: number;
  previousCount: number;
  changePercent: number;
}

export interface DashboardAnalytics {
  // Loading states
  isLoading: boolean;
  
  // Raw data
  bookings: AdminBooking[];
  passes: any[];
  packages: PackagePurchase[];
  promos: VenuePromo[];
  promoAnalytics: PromoAnalytics[];
  
  // KPI Cards
  kpis: {
    totalRevenue: KPIData;
    tableBookings: KPIData;
    passesSold: KPIData;
    packagesSold: KPIData;
    promosRedeemed: KPIData;
    walkIns: KPIData;
  };
  
  // Period breakdowns
  bookingStats: PeriodStats;
  passStats: PeriodStats;
  packageStats: PeriodStats;
  promoStats: PeriodStats;
  walkInStats: WalkInStats;
  
  // 7-day trend data
  trendData: TrendDataPoint[];
  
  // Revenue breakdown
  revenueBreakdown: {
    passes: number;
    packages: number;
    walkIns: number;
    total: number;
  };
  
  // Capacity Heatmap
  heatmapData: HeatmapData[];
  
  // Booking Funnel
  funnelData: FunnelData;
}

function calculatePeriodStats<T>(
  items: T[],
  getDate: (item: T) => string,
  getRevenue: (item: T) => number,
  startDate: Date,
  previousStartDate: Date
): PeriodStats {
  const now = new Date();
  
  const currentItems = items.filter(item => {
    const itemDate = parseISO(getDate(item));
    return isAfter(itemDate, startDate) || itemDate.getTime() === startDate.getTime();
  });
  
  const previousItems = items.filter(item => {
    const itemDate = parseISO(getDate(item));
    return isAfter(itemDate, previousStartDate) && itemDate < startDate;
  });
  
  const count = currentItems.length;
  const revenue = currentItems.reduce((sum, item) => sum + getRevenue(item), 0);
  const previousCount = previousItems.length;
  const previousRevenue = previousItems.reduce((sum, item) => sum + getRevenue(item), 0);
  
  const changePercent = previousCount > 0 
    ? Math.round(((count - previousCount) / previousCount) * 100) 
    : count > 0 ? 100 : 0;
    
  const revenueChangePercent = previousRevenue > 0 
    ? Math.round(((revenue - previousRevenue) / previousRevenue) * 100) 
    : revenue > 0 ? 100 : 0;
  
  return { count, revenue, previousCount, previousRevenue, changePercent, revenueChangePercent };
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `Rp ${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `Rp ${(amount / 1000).toFixed(0)}K`;
  }
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export function useDashboardAnalytics(
  venueId: string | null,
  dateRange: DateRange = 'week',
  customStartDate?: Date,
  customEndDate?: Date
): DashboardAnalytics {
  // Calculate date ranges
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  
  let startDate: Date;
  let endDate: Date = now;
  
  switch (dateRange) {
    case 'today':
      startDate = today;
      break;
    case 'week':
      startDate = weekStart;
      break;
    case 'month':
      startDate = monthStart;
      break;
    case 'custom':
      startDate = customStartDate || weekStart;
      endDate = customEndDate || now;
      break;
    default:
      startDate = weekStart;
  }
  
  // Fetch data using existing hooks
  const { bookings, isLoading: bookingsLoading } = useAdminBookings(venueId, { 
    startDate: subDays(startDate, 30), // Get extra data for trend calculation
    endDate 
  });
  
  const { passes, isLoading: passesLoading, stats: passStats } = useVenuePasses(venueId, {
    startDate: subDays(startDate, 30),
    endDate
  });
  
  const { purchases: packages, isLoading: packagesLoading } = usePackagePurchases(venueId, {
    startDate: subDays(startDate, 30),
    endDate
  });
  
  const { data: promos = [], isLoading: promosLoading } = useVenuePromos(venueId || undefined);
  
  // Fetch promo analytics
  const { data: promoAnalytics = [] } = useQuery({
    queryKey: ['promo-analytics', venueId, startDate.toISOString()],
    queryFn: async () => {
      if (!venueId) return [];
      const { data, error } = await supabase
        .from('promo_analytics')
        .select('*')
        .eq('venue_id', venueId)
        .gte('recorded_date', format(subDays(startDate, 30), 'yyyy-MM-dd'))
        .order('recorded_date', { ascending: false });
      
      if (error) throw error;
      return data as PromoAnalytics[];
    },
    enabled: !!venueId,
  });
  
  // Fetch booking outcomes for accurate funnel data
  const { data: bookingOutcomes = [] } = useQuery({
    queryKey: ['booking-outcomes', venueId, startDate.toISOString()],
    queryFn: async () => {
      if (!venueId) return [];
      const { data, error } = await supabase
        .from('booking_outcomes')
        .select('*')
        .eq('venue_id', venueId)
        .gte('created_at', format(subDays(startDate, 30), 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BookingOutcome[];
    },
    enabled: !!venueId,
  });
  
  // Fetch venue analytics for capacity heatmap
  const { data: venueAnalytics = [] } = useQuery({
    queryKey: ['venue-analytics-heatmap', venueId],
    queryFn: async () => {
      if (!venueId) return [];
      const { data, error } = await supabase
        .from('venue_analytics')
        .select('day_of_week, hour_of_day, capacity_percentage')
        .eq('venue_id', venueId)
        .order('recorded_at', { ascending: false })
        .limit(500); // Get recent analytics data
      
      if (error) throw error;
      return data;
    },
    enabled: !!venueId,
  });
  
  // Fetch walk-in sessions (table_sessions where table_id IS NULL)
  const { data: walkInSessions = [], isLoading: walkInsLoading } = useQuery({
    queryKey: ['walk-in-sessions', venueId, startDate.toISOString()],
    queryFn: async () => {
      if (!venueId) return [];
      const { data, error } = await supabase
        .from('table_sessions')
        .select('*, session_invoices(total_amount, status)')
        .eq('venue_id', venueId)
        .is('table_id', null)
        .gte('opened_at', format(subDays(startDate, 30), 'yyyy-MM-dd'))
        .order('opened_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!venueId,
  });
  
  const isLoading = bookingsLoading || passesLoading || packagesLoading || promosLoading || walkInsLoading;
  
  // Calculate analytics
  const analytics = useMemo(() => {
    const previousStartDate = subWeeks(startDate, 1);
    
    // Filter to current period
    const currentBookings = bookings.filter(b => {
      const date = parseISO(b.booking_date);
      return date >= startDate && date <= endDate;
    });
    
    const currentPasses = passes.filter(p => {
      const date = parseISO(p.purchase_date);
      return date >= startDate && date <= endDate;
    });
    
    const currentPackages = packages.filter(p => {
      const date = parseISO(p.purchased_at);
      return date >= startDate && date <= endDate;
    });
    
    // Calculate period stats
    const bookingPeriodStats = calculatePeriodStats(
      bookings,
      b => b.booking_date,
      () => 0, // Bookings don't have direct revenue
      startDate,
      previousStartDate
    );
    
    const passPeriodStats = calculatePeriodStats(
      passes,
      p => p.purchase_date,
      p => Number(p.price) || 0,
      startDate,
      previousStartDate
    );
    
    const packagePeriodStats = calculatePeriodStats(
      packages,
      p => p.purchased_at,
      p => Number(p.total_paid) || 0,
      startDate,
      previousStartDate
    );
    
    // Promo redemptions from analytics
    const currentPromoAnalytics = promoAnalytics.filter(pa => {
      const date = parseISO(pa.recorded_date);
      return date >= startDate && date <= endDate;
    });
    
    const totalRedemptions = currentPromoAnalytics.reduce((sum, pa) => sum + (pa.redemptions || 0), 0);
    const previousPromoAnalytics = promoAnalytics.filter(pa => {
      const date = parseISO(pa.recorded_date);
      return date >= previousStartDate && date < startDate;
    });
    const previousRedemptions = previousPromoAnalytics.reduce((sum, pa) => sum + (pa.redemptions || 0), 0);
    
    const promoChangePercent = previousRedemptions > 0 
      ? Math.round(((totalRedemptions - previousRedemptions) / previousRedemptions) * 100)
      : totalRedemptions > 0 ? 100 : 0;
    
    // Revenue calculations
    const passRevenue = currentPasses.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const packageRevenue = currentPackages.reduce((sum, p) => sum + (Number(p.total_paid) || 0), 0);
    const totalRevenue = passRevenue + packageRevenue;
    
    const previousPassRevenue = passPeriodStats.previousRevenue;
    const previousPackageRevenue = packagePeriodStats.previousRevenue;
    const previousTotalRevenue = previousPassRevenue + previousPackageRevenue;
    
    const revenueChangePercent = previousTotalRevenue > 0 
      ? Math.round(((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100)
      : totalRevenue > 0 ? 100 : 0;
    
    // KPI Data
    const kpis = {
      totalRevenue: {
        label: 'Total Revenue',
        value: totalRevenue,
        formattedValue: formatCurrency(totalRevenue),
        previousValue: previousTotalRevenue,
        changePercent: revenueChangePercent,
        trend: revenueChangePercent > 0 ? 'up' as const : revenueChangePercent < 0 ? 'down' as const : 'neutral' as const,
        color: 'primary',
      },
      tableBookings: {
        label: 'Table Bookings',
        value: currentBookings.length,
        formattedValue: currentBookings.length.toString(),
        previousValue: bookingPeriodStats.previousCount,
        changePercent: bookingPeriodStats.changePercent,
        trend: bookingPeriodStats.changePercent > 0 ? 'up' as const : bookingPeriodStats.changePercent < 0 ? 'down' as const : 'neutral' as const,
        color: 'blue',
      },
      passesSold: {
        label: 'Passes Sold',
        value: currentPasses.length,
        formattedValue: currentPasses.length.toString(),
        previousValue: passPeriodStats.previousCount,
        changePercent: passPeriodStats.changePercent,
        trend: passPeriodStats.changePercent > 0 ? 'up' as const : passPeriodStats.changePercent < 0 ? 'down' as const : 'neutral' as const,
        color: 'green',
      },
      packagesSold: {
        label: 'Packages Sold',
        value: currentPackages.length,
        formattedValue: currentPackages.length.toString(),
        previousValue: packagePeriodStats.previousCount,
        changePercent: packagePeriodStats.changePercent,
        trend: packagePeriodStats.changePercent > 0 ? 'up' as const : packagePeriodStats.changePercent < 0 ? 'down' as const : 'neutral' as const,
        color: 'purple',
      },
      promosRedeemed: {
        label: 'Promos Redeemed',
        value: totalRedemptions,
        formattedValue: totalRedemptions.toString(),
        previousValue: previousRedemptions,
        changePercent: promoChangePercent,
        trend: promoChangePercent > 0 ? 'up' as const : promoChangePercent < 0 ? 'down' as const : 'neutral' as const,
        color: 'orange',
      },
      walkIns: (() => {
        // Filter walk-ins to current period
        const currentWalkIns = walkInSessions.filter(w => {
          const date = parseISO(w.opened_at);
          return date >= startDate && date <= endDate;
        });
        
        const previousWalkIns = walkInSessions.filter(w => {
          const date = parseISO(w.opened_at);
          return date >= previousStartDate && date < startDate;
        });
        
        const walkInCount = currentWalkIns.length;
        const previousWalkInCount = previousWalkIns.length;
        const walkInChangePercent = previousWalkInCount > 0 
          ? Math.round(((walkInCount - previousWalkInCount) / previousWalkInCount) * 100)
          : walkInCount > 0 ? 100 : 0;
        
        return {
          label: 'Walk-ins',
          value: walkInCount,
          formattedValue: walkInCount.toString(),
          previousValue: previousWalkInCount,
          changePercent: walkInChangePercent,
          trend: walkInChangePercent > 0 ? 'up' as const : walkInChangePercent < 0 ? 'down' as const : 'neutral' as const,
          color: 'cyan',
        };
      })(),
    };
    
    // 7-day trend data
    const trendData: TrendDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const displayDate = format(date, 'EEE');
      
      const dayBookings = bookings.filter(b => b.booking_date === dateStr).length;
      const dayPasses = passes.filter(p => p.purchase_date === dateStr).length;
      const dayPackages = packages.filter(p => format(parseISO(p.purchased_at), 'yyyy-MM-dd') === dateStr).length;
      const dayPromos = promoAnalytics
        .filter(pa => pa.recorded_date === dateStr)
        .reduce((sum, pa) => sum + (pa.redemptions || 0), 0);
      
      trendData.push({
        date: displayDate,
        bookings: dayBookings,
        passes: dayPasses,
        packages: dayPackages,
        promos: dayPromos,
        total: dayBookings + dayPasses + dayPackages,
      });
    }
    
    // Capacity Heatmap data - use venue_analytics if available, otherwise derive from bookings
    const heatmapData: HeatmapData[] = [];
    const HOUR_VALUES = [18, 19, 20, 21, 22, 23, 0, 1, 2];
    
    if (venueAnalytics.length > 0) {
      // Use actual venue analytics data - aggregate by day/hour
      const analyticsMap: Record<string, number[]> = {};
      
      venueAnalytics.forEach(va => {
        if (va.day_of_week !== null && va.hour_of_day !== null && va.capacity_percentage !== null) {
          const key = `${va.day_of_week}-${va.hour_of_day}`;
          if (!analyticsMap[key]) {
            analyticsMap[key] = [];
          }
          analyticsMap[key].push(va.capacity_percentage);
        }
      });
      
      // Generate heatmap with averaged capacity data
      for (let day = 0; day < 7; day++) {
        for (const hour of HOUR_VALUES) {
          const key = `${day}-${hour}`;
          const values = analyticsMap[key];
          const value = values && values.length > 0 
            ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) 
            : 0;
          heatmapData.push({ day, hour, value });
        }
      }
    } else {
      // Fallback: derive from booking data
      const heatmapCounts: Record<string, number> = {};
      
      bookings.forEach(b => {
        const bookingDate = parseISO(b.booking_date);
        const day = bookingDate.getDay();
        
        let hour = 21;
        if (b.arrival_window) {
          const match = b.arrival_window.match(/(\d{1,2})/);
          if (match) {
            hour = parseInt(match[1], 10);
          }
        }
        
        const key = `${day}-${hour}`;
        heatmapCounts[key] = (heatmapCounts[key] || 0) + 1;
      });
      
      const maxBookings = Math.max(...Object.values(heatmapCounts), 1);
      
      for (let day = 0; day < 7; day++) {
        for (const hour of HOUR_VALUES) {
          const key = `${day}-${hour}`;
          const count = heatmapCounts[key] || 0;
          const value = Math.round((count / maxBookings) * 100);
          heatmapData.push({ day, hour, value });
        }
      }
    }
    
    // Booking Funnel data - use actual booking_outcomes when available
    const requests = currentBookings.length;
    const confirmed = currentBookings.filter(b => b.status === 'confirmed').length;
    
    // Get booking IDs for current period
    const currentBookingIds = new Set(currentBookings.map(b => b.id));
    const relevantOutcomes = bookingOutcomes.filter(o => currentBookingIds.has(o.booking_id));
    
    // Use actual outcomes data if available, otherwise estimate
    const showedFromOutcomes = relevantOutcomes.filter(o => o.outcome === 'showed' || o.outcome === 'completed').length;
    const noShowFromOutcomes = relevantOutcomes.filter(o => o.outcome === 'no_show').length;
    
    // If we have outcome data, use it; otherwise estimate from confirmed bookings
    const hasOutcomeData = relevantOutcomes.length > 0;
    const showed = hasOutcomeData ? showedFromOutcomes : Math.round(confirmed * 0.85);
    const noShow = hasOutcomeData ? noShowFromOutcomes : confirmed - showed;
    
    const funnelData: FunnelData = { requests, confirmed, showed, noShow };
    
    // Calculate walk-in stats
    const currentWalkIns = walkInSessions.filter(w => {
      const date = parseISO(w.opened_at);
      return date >= startDate && date <= endDate;
    });
    
    const previousWalkIns = walkInSessions.filter(w => {
      const date = parseISO(w.opened_at);
      return date >= previousStartDate && date < startDate;
    });
    
    const walkInRevenue = currentWalkIns.reduce((sum, w) => {
      const invoices = w.session_invoices || [];
      return sum + invoices.reduce((invSum: number, inv: any) => 
        invSum + (inv.status === 'paid' ? (inv.total_amount || 0) : 0), 0);
    }, 0);
    
    const walkInStats: WalkInStats = {
      count: currentWalkIns.length,
      revenue: walkInRevenue,
      avgSpend: currentWalkIns.length > 0 ? Math.round(walkInRevenue / currentWalkIns.length) : 0,
      previousCount: previousWalkIns.length,
      changePercent: previousWalkIns.length > 0 
        ? Math.round(((currentWalkIns.length - previousWalkIns.length) / previousWalkIns.length) * 100)
        : currentWalkIns.length > 0 ? 100 : 0,
    };
    
    return {
      kpis,
      bookingStats: bookingPeriodStats,
      passStats: passPeriodStats,
      packageStats: packagePeriodStats,
      promoStats: {
        count: totalRedemptions,
        revenue: currentPromoAnalytics.reduce((sum, pa) => sum + (pa.revenue_generated || 0), 0),
        previousCount: previousRedemptions,
        previousRevenue: previousPromoAnalytics.reduce((sum, pa) => sum + (pa.revenue_generated || 0), 0),
        changePercent: promoChangePercent,
        revenueChangePercent: 0,
      },
      walkInStats,
      trendData,
      revenueBreakdown: {
        passes: passRevenue,
        packages: packageRevenue,
        walkIns: walkInRevenue,
        total: totalRevenue + walkInRevenue,
      },
      heatmapData,
      funnelData,
    };
  }, [bookings, passes, packages, promos, promoAnalytics, bookingOutcomes, venueAnalytics, walkInSessions, startDate, endDate]);
  
  return {
    isLoading,
    bookings,
    passes,
    packages,
    promos,
    promoAnalytics,
    ...analytics,
  };
}
