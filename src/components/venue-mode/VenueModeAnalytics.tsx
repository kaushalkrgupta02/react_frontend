import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, CalendarCheck, Ticket, Package, Tag } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/analytics/DashboardHeader';
import { OverviewTab } from '@/components/dashboard/tabs/OverviewTab';
import { TableBookingsTab } from '@/components/dashboard/tabs/TableBookingsTab';
import { PassesTab } from '@/components/dashboard/tabs/PassesTab';
import { PackagesTab } from '@/components/dashboard/tabs/PackagesTab';
import { PromosTab } from '@/components/dashboard/tabs/PromosTab';
import { useDashboardAnalytics, DateRange } from '@/hooks/useDashboardAnalytics';
import { useVenuePasses } from '@/hooks/useVenuePasses';

interface VenueModeAnalyticsProps {
  selectedVenueId: string | null;
}

export default function VenueModeAnalytics({ selectedVenueId }: VenueModeAnalyticsProps) {
  const [dateRange, setDateRange] = useState<DateRange>('week');
  
  const analytics = useDashboardAnalytics(selectedVenueId, dateRange);
  const { passes, stats: passStats, isLoading: passesLoading } = useVenuePasses(selectedVenueId);

  return (
    <div className="p-4 pb-8 space-y-6">
      {/* Date Range Filter */}
      <DashboardHeader
        venues={[]}
        selectedVenueId={selectedVenueId}
        onVenueChange={() => {}}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full grid grid-cols-5 h-auto p-1">
          <TabsTrigger value="overview" className="text-xs py-2 gap-1">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="bookings" className="text-xs py-2 gap-1">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bookings</span>
          </TabsTrigger>
          <TabsTrigger value="passes" className="text-xs py-2 gap-1">
            <Ticket className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Passes</span>
          </TabsTrigger>
          <TabsTrigger value="packages" className="text-xs py-2 gap-1">
            <Package className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Packages</span>
          </TabsTrigger>
          <TabsTrigger value="promos" className="text-xs py-2 gap-1">
            <Tag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Promos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab analytics={analytics} />
        </TabsContent>
        <TabsContent value="bookings">
          <TableBookingsTab bookings={analytics.bookings} isLoading={analytics.isLoading} />
        </TabsContent>
        <TabsContent value="passes">
          <PassesTab passes={passes} stats={passStats} isLoading={passesLoading} />
        </TabsContent>
        <TabsContent value="packages">
          <PackagesTab purchases={analytics.packages} isLoading={analytics.isLoading} />
        </TabsContent>
        <TabsContent value="promos">
          <PromosTab promos={analytics.promos} promoAnalytics={analytics.promoAnalytics} isLoading={analytics.isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
