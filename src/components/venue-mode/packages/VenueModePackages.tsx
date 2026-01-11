import { useState, useEffect } from 'react';
import { Package, BarChart3, List } from 'lucide-react';
import { usePackagePurchases } from '@/hooks/usePackagePurchases';
import PackagePurchasesList from './PackagePurchasesList';
import PackageStatsView from '../stats/PackageStatsView';
import { DateRangeFilter, DateRange, getPresetDateRange } from '../DateRangeFilter';

type SubTab = 'purchases' | 'stats';

interface VenueModePackagesProps {
  selectedVenueId: string | null;
}

export default function VenueModePackages({ selectedVenueId }: VenueModePackagesProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('purchases');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetDateRange('today'));
  
  const { purchases, isLoading, refetch } = usePackagePurchases(selectedVenueId, {
    startDate: dateRange.start,
    endDate: dateRange.end,
    preset: dateRange.preset,
  });

  const tabs = [
    { id: 'purchases' as SubTab, label: 'Purchases', icon: List },
    { id: 'stats' as SubTab, label: 'Stats', icon: BarChart3 },
  ];

  // Refetch when the active tab becomes purchases or stats, or when dateRange / venue changes
  useEffect(() => {
    if (activeTab === 'purchases' || activeTab === 'stats') {
      refetch();
    }
  }, [activeTab, selectedVenueId, dateRange, refetch]);

  if (!selectedVenueId) {
    return (
      <div className="p-4 text-center">
        <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">Select a venue to manage packages</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex border-b border-border bg-background px-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
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

      {/* Date Range Filter */}
      <div className="px-4 py-3 bg-card border-b border-border">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'purchases' && (
          <PackagePurchasesList 
            purchases={purchases} 
            isLoading={isLoading} 
            venueId={selectedVenueId}
            onPurchaseUpdated={refetch}
          />
        )}
        {activeTab === 'stats' && (
          <PackageStatsView purchases={purchases} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
}
