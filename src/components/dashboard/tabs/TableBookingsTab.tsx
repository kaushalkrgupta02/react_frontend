import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminBooking } from '@/hooks/useAdminBookings';
import { StatsSummaryGrid } from '@/components/venue-mode/stats/StatsSummaryGrid';
import { TimePeriodBreakdown } from '@/components/venue-mode/stats/TimePeriodBreakdown';
import { HorizontalBarChart } from '@/components/venue-mode/stats/HorizontalBarChart';
import { TopItemsList } from '@/components/venue-mode/stats/TopItemsList';
import { startOfDay, startOfWeek, startOfMonth, parseISO, format } from 'date-fns';
import { Loader2, CalendarCheck, Users, CheckCircle, Clock } from 'lucide-react';

interface TableBookingsTabProps {
  bookings: AdminBooking[];
  isLoading: boolean;
}

export function TableBookingsTab({ bookings, isLoading }: TableBookingsTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const stats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    
    const todayBookings = bookings.filter(b => parseISO(b.booking_date) >= today);
    const weekBookings = bookings.filter(b => parseISO(b.booking_date) >= weekStart);
    const monthBookings = bookings.filter(b => parseISO(b.booking_date) >= monthStart);
    
    return {
      total: bookings.length,
      totalGuests: bookings.reduce((sum, b) => sum + b.party_size, 0),
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      cancelled: bookings.filter(b => b.status === 'cancelled' || b.status === 'declined').length,
      today: todayBookings.length,
      todayGuests: todayBookings.reduce((sum, b) => sum + b.party_size, 0),
      week: weekBookings.length,
      weekGuests: weekBookings.reduce((sum, b) => sum + b.party_size, 0),
      month: monthBookings.length,
      monthGuests: monthBookings.reduce((sum, b) => sum + b.party_size, 0),
    };
  }, [bookings]);

  const trendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      return bookings.filter(b => b.booking_date === format(date, 'yyyy-MM-dd')).length;
    });
  }, [bookings]);

  const statusBreakdown = useMemo(() => [
    { label: 'Confirmed', value: stats.confirmed, color: 'hsl(142, 76%, 36%)' },
    { label: 'Pending', value: stats.pending, color: 'hsl(45, 93%, 47%)' },
    { label: 'Cancelled', value: stats.cancelled, color: 'hsl(0, 84%, 60%)' },
  ], [stats]);

  const partySizes = useMemo(() => {
    const sizes: Record<number, number> = {};
    bookings.forEach(b => { sizes[b.party_size] = (sizes[b.party_size] || 0) + 1; });
    return Object.entries(sizes)
      .map(([size, count]) => ({ name: `${size} guests`, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [bookings]);

  return (
    <div className="space-y-6">
      <StatsSummaryGrid
        items={[
          { label: 'Total Tables', value: stats.total, icon: CalendarCheck, trendData },
          { label: 'Total Guests', value: stats.totalGuests, icon: Users },
          { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle, iconColor: 'hsl(142, 76%, 36%)' },
          { label: 'Pending', value: stats.pending, icon: Clock, iconColor: 'hsl(45, 93%, 47%)' },
        ]}
      />

      <TimePeriodBreakdown
        periods={[
          { label: 'Today', count: stats.today, revenue: stats.todayGuests },
          { label: 'This Week', count: stats.week, revenue: stats.weekGuests },
          { label: 'This Month', count: stats.month, revenue: stats.monthGuests },
        ]}
        showRevenue
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HorizontalBarChart title="Booking Status" items={statusBreakdown} />
        {partySizes.length > 0 && <TopItemsList title="Popular Party Sizes" items={partySizes} />}
      </div>
    </div>
  );
}
