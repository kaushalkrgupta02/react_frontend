import { useState, useCallback, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, Percent, Check, Gift, X, Loader2, 
  Tag, CheckCircle2, Clock, ChevronRight, Users, Sparkles, ShoppingBag
} from 'lucide-react';
import { format, isPast, isFuture, isWithinInterval } from 'date-fns';
import { usePromoAnalytics } from '@/hooks/useVenueAnalytics';
import { useVenuePromos, VenuePromo } from '@/hooks/useVenuePromos';
import PromoStats from '../stats/PromoStats';
import InlineScanSearch from '../InlineScanSearch';
import { DateRangeFilter, DateRange, getPresetDateRange } from '../DateRangeFilter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePromoSearch } from '@/hooks/usePromoSearch';
import { trackPromoRedemption } from '@/hooks/useAnalyticsTracking';
import { playCheckInSound } from '@/lib/audioFeedback';
import { toast } from 'sonner';

interface VenueModePromosOperationsProps {
  selectedVenueId: string | null;
}

interface PromoDetails {
  id: string;
  title: string;
  subtitle: string | null;
  promo_code: string | null;
  discount_type: string | null;
  discount_value: number | null;
  current_redemptions: number | null;
  max_redemptions: number | null;
  ends_at: string;
  venue_id: string | null;
}

function getPromoStatus(promo: VenuePromo): { label: string; className: string } {
  const now = new Date();
  const startDate = new Date(promo.starts_at);
  const endDate = new Date(promo.ends_at);
  
  if (!promo.is_active) {
    return { label: 'Inactive', className: 'bg-muted text-muted-foreground' };
  }
  
  if (isPast(endDate)) {
    return { label: 'Expired', className: 'bg-red-500/20 text-red-400' };
  }
  
  if (isFuture(startDate)) {
    return { label: 'Scheduled', className: 'bg-blue-500/20 text-blue-400' };
  }
  
  if (isWithinInterval(now, { start: startDate, end: endDate })) {
    return { label: 'Active', className: 'bg-green-500/20 text-green-400' };
  }
  
  return { label: 'Unknown', className: 'bg-muted text-muted-foreground' };
}

type SubTab = 'promos' | 'stats';

export default function VenueModePromosOperations({ selectedVenueId }: VenueModePromosOperationsProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('promos');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetDateRange('month'));
  const { data: promoAnalytics, isLoading: analyticsLoading } = usePromoAnalytics(selectedVenueId || undefined);
  const { data: promos = [], isLoading: promosLoading, refetch: refetchPromos } = useVenuePromos(selectedVenueId || undefined);
  
  const [isSearching, setIsSearching] = useState(false);
  const [foundPromo, setFoundPromo] = useState<PromoDetails | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [revenueAmount, setRevenueAmount] = useState('');

  // Filter promos by date range
  const filteredPromos = useMemo(() => {
    return promos.filter(promo => {
      const startsAt = new Date(promo.starts_at);
      const endsAt = new Date(promo.ends_at);
      return startsAt <= dateRange.end && endsAt >= dateRange.start;
    });
  }, [promos, dateRange]);

  // Quick stats
  const stats = useMemo(() => {
    const now = new Date();
    const active = promos.filter(p => 
      p.is_active && 
      new Date(p.starts_at) <= now && 
      new Date(p.ends_at) >= now
    ).length;
    const totalRedemptions = promos.reduce((sum, p) => sum + (p.current_redemptions || 0), 0);
    return { total: promos.length, active, totalRedemptions };
  }, [promos]);

  // Group promos by date
  const groupedPromos = useMemo(() => {
    const groups: Record<string, VenuePromo[]> = {};
    filteredPromos.forEach(promo => {
      const date = format(new Date(promo.created_at), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(promo);
    });
    return groups;
  }, [filteredPromos]);

  const sortedDates = Object.keys(groupedPromos).sort((a, b) => b.localeCompare(a));

  // Aggregate promo performance data
  const promoPerformance = useMemo(() => {
    if (!promoAnalytics) return [];
    
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
        const recordedDate = new Date(pa.recorded_date);
        if (recordedDate >= dateRange.start && recordedDate <= dateRange.end) {
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
      }
    });

    return Object.values(byPromo).map((p) => ({
      ...p,
      conversionRate: p.impressions > 0 ? (p.redemptions / p.impressions) * 100 : 0,
    }));
  }, [promoAnalytics, dateRange]);

  // Calculate summary stats for stats tab
  const totalRedemptions = promoPerformance.reduce((sum, p) => sum + p.redemptions, 0);
  const totalRevenue = promoPerformance.reduce((sum, p) => sum + p.revenue, 0);
  const avgConversion = promoPerformance.length > 0 
    ? promoPerformance.reduce((sum, p) => sum + p.conversionRate, 0) / promoPerformance.length 
    : 0;

  const { search: searchPromosHook } = usePromoSearch(selectedVenueId || undefined);

  const handlePromoSearch = useCallback(async (code: string) => {
    if (!code.trim() || !selectedVenueId) return;

    setIsSearching(true);
    setFoundPromo(null);

    try {
      const nowIso = new Date().toISOString();
      const results = await searchPromosHook(code, { limit: 1, endsAtGte: nowIso });
      const data = Array.isArray(results) && results.length > 0 ? results[0] : null;

      if (data) {
        if (data.venue_id && data.venue_id !== selectedVenueId) {
          toast.error('This promo is not valid for this venue');
          return;
        }
        setFoundPromo(data as PromoDetails);
        playCheckInSound();
      } else {
        toast.error('Promo code not found or expired');
      }
    } catch (error) {
      console.error('Promo search error:', error);
      toast.error('Failed to search promo');
    } finally {
      setIsSearching(false);
    }
  }, [selectedVenueId, searchPromosHook]);

  const handleSelectPromo = (promo: VenuePromo) => {
    const status = getPromoStatus(promo);
    if (status.label !== 'Active') {
      toast.error('This promo is not active');
      return;
    }
    setFoundPromo({
      id: promo.id,
      title: promo.title,
      subtitle: promo.subtitle,
      promo_code: promo.promo_code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      current_redemptions: promo.current_redemptions,
      max_redemptions: promo.max_redemptions,
      ends_at: promo.ends_at,
      venue_id: promo.venue_id,
    });
  };

  const handleRedeem = async () => {
    if (!foundPromo || !selectedVenueId) return;

    if (foundPromo.max_redemptions && (foundPromo.current_redemptions || 0) >= foundPromo.max_redemptions) {
      toast.error('This promo has reached maximum redemptions');
      return;
    }

    setIsRedeeming(true);
    try {
      const revenue = revenueAmount ? parseFloat(revenueAmount) : undefined;
      const result = await trackPromoRedemption(foundPromo.id, selectedVenueId, revenue);

      if (result.success) {
        playCheckInSound();
        toast.success('Promo redeemed successfully!');
        setFoundPromo(null);
        setRevenueAmount('');
        refetchPromos();
      } else {
        throw new Error('Failed to redeem');
      }
    } catch (error) {
      toast.error('Failed to redeem promo');
    } finally {
      setIsRedeeming(false);
    }
  };

  const getDiscountDisplay = () => {
    if (!foundPromo) return '';
    if (foundPromo.discount_type === 'percentage') {
      return `${foundPromo.discount_value}% off`;
    } else if (foundPromo.discount_type === 'fixed') {
      return `Rp ${(foundPromo.discount_value || 0).toLocaleString()} off`;
    }
    return 'Special offer';
  };

  const tabs = [
    { id: 'promos' as SubTab, label: 'Promos', icon: Tag },
    { id: 'stats' as SubTab, label: 'Stats', icon: BarChart3 },
  ];

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
        {activeTab === 'promos' && (
          <div className="space-y-4">
            {selectedVenueId ? (
              <>
                {/* Inline Scan/Search */}
                <InlineScanSearch
                  placeholder="Enter promo code..."
                  scanLabel="Scan QR"
                  searchLabel="Enter Code"
                  onSearch={handlePromoSearch}
                  isSearching={isSearching}
                  venueId={selectedVenueId}
                />

                {/* Found Promo Card - Inline Redemption */}
                {foundPromo && (
                  <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{foundPromo.title}</h3>
                          {foundPromo.subtitle && (
                            <p className="text-sm text-muted-foreground">{foundPromo.subtitle}</p>
                          )}
                        </div>
                        <div className="px-2 py-1 bg-primary/20 rounded text-sm font-medium text-primary">
                          {getDiscountDisplay()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded">
                        <Gift className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{foundPromo.promo_code || foundPromo.id.slice(0, 8)}</span>
                      </div>

                      {foundPromo.max_redemptions && (
                        <p className="text-xs text-muted-foreground">
                          {foundPromo.current_redemptions || 0} / {foundPromo.max_redemptions} redeemed
                        </p>
                      )}

                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Transaction amount (optional)
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter amount in IDR..."
                          value={revenueAmount}
                          onChange={(e) => setRevenueAmount(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setFoundPromo(null);
                            setRevenueAmount('');
                          }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleRedeem}
                          disabled={isRedeeming}
                        >
                          {isRedeeming ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 mr-1" />
                          )}
                          Confirm
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-card rounded-lg p-3 border border-border text-center">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-lg font-bold text-foreground">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="bg-card rounded-lg p-3 border border-border text-center">
                    <div className="flex items-center justify-center gap-1.5 text-green-400 mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-lg font-bold text-foreground">{stats.active}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="bg-card rounded-lg p-3 border border-border text-center">
                    <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-lg font-bold text-foreground">{stats.totalRedemptions}</p>
                    <p className="text-xs text-muted-foreground">Redeemed</p>
                  </div>
                </div>

                {/* Promo List */}
                {promosLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredPromos.length === 0 ? (
                  <div className="text-center py-8">
                    <Tag className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <h3 className="font-medium text-foreground mb-1">No Promos</h3>
                    <p className="text-sm text-muted-foreground">
                      No promos found in selected date range
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortedDates.map((date) => (
                      <div key={date}>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          {format(new Date(date), 'EEEE, MMMM d')}
                        </h3>
                        <div className="space-y-2">
                          {groupedPromos[date].map((promo) => {
                            const status = getPromoStatus(promo);
                            const isActive = status.label === 'Active';
                            
                            return (
                              <button
                                key={promo.id}
                                onClick={() => handleSelectPromo(promo)}
                                className={`w-full text-left bg-card rounded-xl p-4 border border-border transition-all ${
                                  isActive 
                                    ? 'hover:border-primary/30 hover:bg-card/80 cursor-pointer' 
                                    : 'opacity-70'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Tag className="w-5 h-5 text-primary" />
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <h4 className="font-medium text-foreground flex items-center gap-1.5">
                                          {promo.title}
                                          {promo.ai_generated && (
                                            <Sparkles className="w-3 h-3 text-primary" />
                                          )}
                                        </h4>
                                        {promo.target_audience && (
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                            <Users className="w-3.5 h-3.5" />
                                            <span>{promo.target_audience}</span>
                                          </div>
                                        )}
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
                                        {status.label}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{format(new Date(promo.created_at), 'h:mm a')}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {promo.promo_code && (
                                          <span className="font-mono text-xs text-primary">{promo.promo_code}</span>
                                        )}
                                        {promo.current_redemptions !== null && promo.current_redemptions > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                            {promo.current_redemptions} redeemed
                                          </span>
                                        )}
                                        {isActive && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <p className="text-muted-foreground">Select a venue to view promos</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <PromoStats promoPerformance={promoPerformance} isLoading={analyticsLoading} />
        )}
      </div>
    </div>
  );
}
