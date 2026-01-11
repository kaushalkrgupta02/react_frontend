import { useMemo } from 'react';
import { Users, UserCheck, AlertTriangle, Clock, Banknote, TrendingUp } from 'lucide-react';
import { isToday, isThisWeek, isThisMonth, parseISO, format, subDays } from 'date-fns';
import { StatsSummaryGrid, TimePeriodBreakdown, HorizontalBarChart, TopItemsList } from '../stats';
import { formatPrice } from '@/types/venue-mode';
import type { AdminBooking } from '@/hooks/useAdminBookings';

interface BookingStatsProps {
  bookings: AdminBooking[];
  isLoading: boolean;
}

export default function BookingStats({ bookings, isLoading }: BookingStatsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate stats
  const stats = useMemo(() => {
    const today = bookings.filter(b => isToday(parseISO(b.booking_date)));
    const thisWeek = bookings.filter(b => isThisWeek(parseISO(b.booking_date)));
    const thisMonth = bookings.filter(b => isThisMonth(parseISO(b.booking_date)));

    const totalGuests = bookings.reduce((sum, b) => sum + b.party_size, 0);
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;

    return {
      today: today.length,
      todayGuests: today.reduce((sum, b) => sum + b.party_size, 0),
      thisWeek: thisWeek.length,
      weekGuests: thisWeek.reduce((sum, b) => sum + b.party_size, 0),
      thisMonth: thisMonth.length,
      monthGuests: thisMonth.reduce((sum, b) => sum + b.party_size, 0),
      totalGuests,
      confirmed,
      pending,
      cancelled,
      total: bookings.length,
    };
  }, [bookings]);

  // Generate 7-day trend data
  const trendData = useMemo(() => {
    const last7Days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const count = bookings.filter(b => b.booking_date === date).length;
      last7Days.push(count);
    }
    return last7Days;
  }, [bookings]);

  // Arrival window breakdown
  const arrivalBreakdown = useMemo(() => {
    const windows: Record<string, number> = {};
    bookings.forEach(b => {
      const window = b.arrival_window || 'Not specified';
      windows[window] = (windows[window] || 0) + 1;
    });

    const labels: Record<string, string> = {
      before_10pm: 'Before 10pm',
      '10_to_11pm': '10–11pm',
      after_11pm: 'After 11pm',
      'Not specified': 'Not specified',
    };

    return Object.entries(windows)
      .map(([key, count]) => ({
        label: labels[key] || key,
        value: count,
        color: key === 'before_10pm' ? 'hsl(142, 71%, 45%)' :
               key === '10_to_11pm' ? 'hsl(217, 91%, 60%)' :
               key === 'after_11pm' ? 'hsl(271, 91%, 65%)' :
               'hsl(var(--muted-foreground))',
      }))
      .sort((a, b) => b.value - a.value);
  }, [bookings]);

  // Top party sizes
  const partySizeBreakdown = useMemo(() => {
    const sizes: Record<number, number> = {};
    bookings.forEach(b => {
      sizes[b.party_size] = (sizes[b.party_size] || 0) + 1;
    });

    return Object.entries(sizes)
      .map(([size, count]) => ({
        name: `${size} guests`,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* Summary Cards with Trend */}
      <StatsSummaryGrid
        items={[
          {
            label: 'Total Bookings',
            value: stats.total,
            icon: TrendingUp,
            iconColor: 'hsl(var(--primary))',
            trendData,
          },
          {
            label: 'Total Guests',
            value: stats.totalGuests,
            icon: Users,
            iconColor: 'hsl(217, 91%, 60%)',
          },
          {
            label: 'Confirmed',
            value: stats.confirmed,
            icon: UserCheck,
            iconColor: 'hsl(142, 71%, 45%)',
          },
        ]}
      />

      {/* Time Period Breakdown */}
      <TimePeriodBreakdown
        title="Booking Volume"
        showRevenue={false}
        periods={[
          { label: 'Today', count: stats.today },
          { label: 'This Week', count: stats.thisWeek },
          { label: 'This Month', count: stats.thisMonth },
        ]}
      />

      {/* Status Breakdown */}
      <HorizontalBarChart
        title="Booking Status"
        items={[
          { label: 'Confirmed', value: stats.confirmed, color: 'hsl(142, 71%, 45%)' },
          { label: 'Pending', value: stats.pending, color: 'hsl(38, 92%, 50%)' },
          { label: 'Cancelled', value: stats.cancelled, color: 'hsl(0, 84%, 60%)' },
        ]}
      />

      {/* Arrival Times */}
      {arrivalBreakdown.length > 0 && (
        <HorizontalBarChart
          title="Arrival Times"
          items={arrivalBreakdown}
        />
      )}

      {/* Popular Party Sizes */}
      {partySizeBreakdown.length > 0 && (
        <TopItemsList
          title="Popular Party Sizes"
          items={partySizeBreakdown}
          icon={Users}
          valueLabel="bookings"
        />
      )}
    </div>
  );
}
