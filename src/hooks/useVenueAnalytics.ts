import { useQuery } from '@tanstack/react-query';
import { fetchVenuePromoAnalytics } from '@/lib/promosApi';
import { supabase } from '@/integrations/supabase/client';

interface VenueAnalytics {
  id: string;
  venue_id: string;
  recorded_at: string;
  footfall_count: number;
  capacity_percentage: number;
  revenue_estimate: number;
  peak_hour_flag: boolean;
  day_of_week: number;
  hour_of_day: number;
}

interface BookingOutcome {
  id: string;
  booking_id: string;
  venue_id: string;
  outcome: 'showed' | 'no_show' | 'cancelled' | 'partial';
  actual_party_size: number | null;
  spend_amount: number | null;
  arrived_at: string | null;
  created_at: string;
}

interface PromoAnalytics {
  id: string;
  promo_id: string;
  venue_id: string | null;
  impressions: number;
  clicks: number;
  redemptions: number;
  revenue_generated: number;
  conversion_rate: number;
  recorded_date: string;
}

export function useVenueAnalytics(venueId?: string, days: number = 30) {
  return useQuery({
    queryKey: ['venue-analytics', venueId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('venue_analytics')
        .select('*')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (venueId) {
        query = query.eq('venue_id', venueId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as VenueAnalytics[];
    },
    enabled: true,
  });
}

export function useBookingOutcomes(venueId?: string, days: number = 30) {
  return useQuery({
    queryKey: ['booking-outcomes', venueId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('booking_outcomes')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (venueId) {
        query = query.eq('venue_id', venueId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BookingOutcome[];
    },
    enabled: true,
  });
}

export function usePromoAnalytics(venueId?: string) {
  return useQuery({
    queryKey: ['promo-analytics', venueId],
    queryFn: async () => {
      if (!venueId) return [];
      try {
        const data = await fetchVenuePromoAnalytics(venueId);
        return (data || []) as (PromoAnalytics & { promo: { id: string; title: string; is_active: boolean } | null })[];
      } catch (error) {
        console.error('Error fetching promo analytics via API:', error);
        throw error;
      }
    },
    enabled: !!venueId,
  });
}

// Helper to aggregate analytics data for charts
export function useAggregatedAnalytics(venueId?: string) {
  const { data: venueAnalytics, isLoading: analyticsLoading } = useVenueAnalytics(venueId, 14);
  const { data: bookingOutcomes, isLoading: outcomesLoading } = useBookingOutcomes(venueId, 30);
  const { data: promoAnalytics, isLoading: promoLoading } = usePromoAnalytics(venueId);

  // Aggregate revenue by day
  const revenueData = (() => {
    if (!venueAnalytics || venueAnalytics.length === 0) return [];
    
    const byDay: Record<string, { revenue: number; bookings: number; lineSkip: number }> = {};
    
    venueAnalytics.forEach((a) => {
      const date = new Date(a.recorded_at).toLocaleDateString('en-US', { weekday: 'short' });
      if (!byDay[date]) {
        byDay[date] = { revenue: 0, bookings: 0, lineSkip: 0 };
      }
      byDay[date].revenue += a.revenue_estimate || 0;
    });

    return Object.entries(byDay).map(([date, values]) => ({
      date,
      revenue: values.revenue,
      bookings: Math.floor(values.revenue * 0.6),
      lineSkip: Math.floor(values.revenue * 0.4),
    }));
  })();

  // Aggregate capacity heatmap
  const heatmapData = (() => {
    if (!venueAnalytics || venueAnalytics.length === 0) return [];
    
    const byDayHour: Record<string, { total: number; count: number }> = {};
    
    venueAnalytics.forEach((a) => {
      if (a.day_of_week !== null && a.hour_of_day !== null) {
        const key = `${a.day_of_week}-${a.hour_of_day}`;
        if (!byDayHour[key]) {
          byDayHour[key] = { total: 0, count: 0 };
        }
        byDayHour[key].total += a.capacity_percentage || 0;
        byDayHour[key].count += 1;
      }
    });

    return Object.entries(byDayHour).map(([key, values]) => {
      const [day, hour] = key.split('-').map(Number);
      return {
        day,
        hour,
        value: Math.round(values.total / values.count),
      };
    });
  })();

  // Aggregate booking funnel
  const funnelData = (() => {
    if (!bookingOutcomes) return { requests: 0, confirmed: 0, showed: 0, noShow: 0 };
    
    const showed = bookingOutcomes.filter(o => o.outcome === 'showed').length;
    const noShow = bookingOutcomes.filter(o => o.outcome === 'no_show').length;
    const cancelled = bookingOutcomes.filter(o => o.outcome === 'cancelled').length;
    const total = bookingOutcomes.length;
    
    return {
      requests: total + Math.floor(total * 0.3), // Estimate total requests
      confirmed: total,
      showed,
      noShow,
    };
  })();

  // Aggregate promo performance
  const promoPerformance = (() => {
    if (!promoAnalytics) return [];
    
    // Group by promo
    const byPromo: Record<string, {
      id: string;
      title: string;
      isActive: boolean;
      impressions: number;
      clicks: number;
      redemptions: number;
      revenue: number;
    }> = {};

    promoAnalytics.forEach((pa) => {
      if (pa.promo) {
        const promoId = pa.promo.id;
        if (!byPromo[promoId]) {
          byPromo[promoId] = {
            id: promoId,
            title: pa.promo.title,
            isActive: pa.promo.is_active,
            impressions: 0,
            clicks: 0,
            redemptions: 0,
            revenue: 0,
          };
        }
        byPromo[promoId].impressions += pa.impressions || 0;
        byPromo[promoId].clicks += pa.clicks || 0;
        byPromo[promoId].redemptions += pa.redemptions || 0;
        byPromo[promoId].revenue += pa.revenue_generated || 0;
      }
    });

    return Object.values(byPromo).map((p) => ({
      ...p,
      conversionRate: p.impressions > 0 ? (p.redemptions / p.impressions) * 100 : 0,
    }));
  })();

  return {
    revenueData,
    heatmapData,
    funnelData,
    promoPerformance,
    isLoading: analyticsLoading || outcomesLoading || promoLoading,
    hasData: (venueAnalytics?.length || 0) > 0 || (bookingOutcomes?.length || 0) > 0,
  };
}
