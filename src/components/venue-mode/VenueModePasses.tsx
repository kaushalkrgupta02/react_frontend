import { useState, useCallback, useMemo, useEffect } from 'react';
import { AlertCircle, Ticket, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVenuePasses } from '@/hooks/useVenuePasses';
import { PassCard } from './passes/PassCard';
import { PassStatsCards } from './passes/PassStatsCards';
import { PassFilterTabs } from './passes/PassFilterTabs';
import { PassListSkeleton } from './passes/PassListSkeleton';
import { EmptyPassList } from './passes/EmptyPassList';

import PassCheckInDialog from './PassCheckInDialog';
import PassStats from './stats/PassStats';
import { toast } from 'sonner';
import { DateRangeFilter, DateRange, getPresetDateRange } from './DateRangeFilter';
import type { VenuePass, PassFilterType } from '@/types/venue-mode';

type SubTab = 'passes' | 'stats';

interface VenueModePassesProps {
  selectedVenueId: string | null;
}

export default function VenueModePasses({ selectedVenueId }: VenueModePassesProps) {
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetDateRange('today'));
  const [activeTab, setActiveTab] = useState<SubTab>('passes');
  
  const { 
    passes, 
    isLoading, 
    stats, 
    redeemPass, 
    claimFreeItem, 
    getPassById,
    refetch,
    error 
  } = useVenuePasses(selectedVenueId, {
    startDate: dateRange.start,
    endDate: dateRange.end,
    // Enable fetching for both the passes and stats tabs so stats can load on click
    enabled: activeTab === 'passes' || activeTab === 'stats'
  });

  // Fetch passes/stats only when the passes or stats tab becomes active or when venue/date changes
  useEffect(() => {
    if (activeTab === 'passes' || activeTab === 'stats') {
      // call refetch explicitly to avoid continuous polling
      refetch();
    }
  }, [activeTab, selectedVenueId, dateRange, refetch]);
  
  const [filter, setFilter] = useState<PassFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'redeemed'>('redeemed');
  const [selectedPass, setSelectedPass] = useState<VenuePass | null>(null);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Memoize filtered passes for performance
  const filteredPasses = useMemo(() => {
    let result = passes;
    
    // Filter by pass type
    if (filter !== 'all') {
      result = result.filter(pass => pass.pass_type === filter);
    }
    
    // Filter by status (redeemed maps to 'used' in PassStatus)
    if (statusFilter === 'active') {
      result = result.filter(pass => pass.status === 'active');
    } else if (statusFilter === 'redeemed') {
      result = result.filter(pass => pass.status === 'used');
    }
    
    return result;
  }, [passes, filter, statusFilter]);

  const handlePassSearch = useCallback(async (passId: string) => {
    setIsSearching(true);
    try {
      const pass = await getPassById(passId);
      if (!pass) {
        toast.error('Pass not found');
        return;
      }
      if (selectedVenueId && pass.venue_id !== selectedVenueId) {
        toast.error('This pass is for a different venue');
        return;
      }
      setSelectedPass(pass);
      setCheckInDialogOpen(true);
    } catch (err) {
      console.error('Error fetching pass:', err);
      toast.error('Failed to load pass details');
    } finally {
      setIsSearching(false);
    }
  }, [selectedVenueId, getPassById]);

  const handleRedeem = useCallback(async (passId: string, shouldClaimFreeItem?: boolean) => {
    await redeemPass(passId);
    if (shouldClaimFreeItem) {
      await claimFreeItem(passId);
    }
    toast.success('Pass redeemed successfully');
  }, [redeemPass, claimFreeItem]);

  const handlePassClick = useCallback((pass: VenuePass) => {
    setSelectedPass(pass);
    setCheckInDialogOpen(true);
  }, []);

  const handleFilterChange = useCallback((newFilter: PassFilterType) => {
    setFilter(newFilter);
  }, []);

  const handleCheckInDialogClose = useCallback((open: boolean) => {
    setCheckInDialogOpen(open);
    if (!open) {
      setSelectedPass(null);
    }
  }, []);

  // Loading state with skeleton
  if (isLoading) {
    return <PassListSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <p className="text-foreground font-medium mb-1">Failed to load passes</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex border-b border-border bg-background px-4">
        <button
          onClick={() => setActiveTab('passes')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'passes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Ticket className="w-4 h-4" />
          Passes
          {passes.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-white text-xs">
              {passes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'stats'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Stats
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="px-4 py-3 bg-card border-b border-border">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'passes' && (
          <div className="space-y-4">
            {/* Stats Cards - Clickable filters */}
            <PassStatsCards 
              stats={stats} 
              selectedFilter={statusFilter}
              onFilterChange={setStatusFilter}
            />

            {/* Filter Tabs */}
            <PassFilterTabs 
              filter={filter} 
              onFilterChange={handleFilterChange} 
              stats={stats} 
            />

            {/* Passes List */}
            <div className="space-y-3">
              {filteredPasses.length === 0 ? (
                <EmptyPassList 
                  message={filter === 'all' ? 'No passes found' : `No ${filter} passes found`}
                  description="Passes for the selected period will appear here"
                />
              ) : (
                filteredPasses.map((pass) => (
                  <PassCard 
                    key={pass.id} 
                    pass={pass} 
                    onClick={() => handlePassClick(pass)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <PassStats passes={passes} stats={stats} isLoading={isLoading} />
        )}
      </div>

      {/* Check-In Dialog */}
      <PassCheckInDialog
        open={checkInDialogOpen}
        onOpenChange={handleCheckInDialogClose}
        pass={selectedPass}
        onRedeem={handleRedeem}
      />
    </div>
  );
}
