import { useRef, useState, useMemo, useCallback } from 'react';
import { 
  Sparkles, Megaphone, Plus, Tag, CheckCircle2, TrendingUp, Gift, X, Check, Loader2,
  Clock, ChevronRight, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { format, isPast, isFuture, isWithinInterval } from 'date-fns';
import { useAdminVenues } from '@/hooks/useAdminVenues';
import { usePromoAnalytics } from '@/hooks/useVenueAnalytics';
import { useVenuePromos, VenuePromo } from '@/hooks/useVenuePromos';
import { useUserRole } from '@/hooks/useUserRole';
import { trackPromoRedemption } from '@/hooks/useAnalyticsTracking';
import { supabase } from '@/integrations/supabase/client';
import { playCheckInSound } from '@/lib/audioFeedback';
import AIPromoDesignerSheet from './promo/AIPromoDesignerSheet';
import BasicPromoCreator from './promo/BasicPromoCreator';
import PromoPerformanceCard from './analytics/PromoPerformanceCard';

import { DateRangeFilter, DateRange, getPresetDateRange } from './DateRangeFilter';

interface VenueModePromosProps {
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

export default function VenueModePromos({ selectedVenueId }: VenueModePromosProps) {
  const { venues, isLoading: venuesLoading } = useAdminVenues();
  const { data: promoAnalytics, isLoading: analyticsLoading } = usePromoAnalytics(selectedVenueId || undefined);
  const { data: promos = [], isLoading: promosLoading, refetch: refetchPromos } = useVenuePromos(selectedVenueId || undefined);
  const { isAdmin } = useUserRole();
  const promoSheetRef = useRef<HTMLButtonElement>(null);
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetDateRange('month'));
  
  // Scan/Redeem state
  const [isSearching, setIsSearching] = useState(false);
  const [foundPromo, setFoundPromo] = useState<PromoDetails | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [revenueAmount, setRevenueAmount] = useState('');
  const [selectedPromo, setSelectedPromo] = useState<VenuePromo | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'redeemed'>('redeemed');

  const selectedVenue = venues.find(v => v.id === selectedVenueId);
  const venueName = selectedVenue?.name || 'Venue';

  // Filter promos by date range and status
  const filteredPromos = useMemo(() => {
    const now = new Date();
    return promos.filter(promo => {
      const startsAt = new Date(promo.starts_at);
      const endsAt = new Date(promo.ends_at);
      const inDateRange = startsAt <= dateRange.end && endsAt >= dateRange.start;
      
      if (!inDateRange) return false;
      
      // Apply status filter
      if (statusFilter === 'active') {
        return promo.is_active && startsAt <= now && endsAt >= now;
      } else if (statusFilter === 'redeemed') {
        return (promo.current_redemptions || 0) > 0;
      }
      return true; // 'all'
    });
  }, [promos, dateRange, statusFilter]);

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

  const handlePromoCreated = () => {
    toast.success('Promo is now live!');
    refetchPromos();
  };

  const handleSearch = useCallback(async (code: string) => {
    if (!code.trim() || !selectedVenueId) return;
    
    setIsSearching(true);
    setFoundPromo(null);

    try {
      const { data, error } = await supabase
        .from('promos')
        .select('id, title, subtitle, promo_code, discount_type, discount_value, current_redemptions, max_redemptions, ends_at, venue_id')
        .or(`promo_code.ilike.${code},id.eq.${code}`)
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.venue_id && data.venue_id !== selectedVenueId) {
          toast.error('This promo is not valid for this venue');
          return;
        }
        setFoundPromo(data);
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
  }, [selectedVenueId]);

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

  const handleCancelRedeem = () => {
    setFoundPromo(null);
    setRevenueAmount('');
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

  if (venuesLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header Section */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          Promo Management
        </h2>
        <p className="text-sm text-muted-foreground">
          Create, track and redeem promos for {venueName}
        </p>
      </div>

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
                onClick={handleCancelRedeem}
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
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                {isRedeeming ? 'Redeeming...' : 'Confirm Redemption'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats - Clickable filters */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`bg-card rounded-lg p-3 border text-center transition-all ${
            statusFilter === 'all' 
              ? 'border-primary ring-1 ring-primary/20' 
              : 'border-border hover:border-primary/30'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
            <Tag className="w-3.5 h-3.5" />
          </div>
          <p className="text-lg font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`bg-card rounded-lg p-3 border text-center transition-all ${
            statusFilter === 'active' 
              ? 'border-primary ring-1 ring-primary/20' 
              : 'border-border hover:border-primary/30'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 text-green-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <p className="text-lg font-bold text-foreground">{stats.active}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </button>
        <button
          onClick={() => setStatusFilter('redeemed')}
          className={`bg-card rounded-lg p-3 border text-center transition-all ${
            statusFilter === 'redeemed' 
              ? 'border-primary ring-1 ring-primary/20' 
              : 'border-border hover:border-primary/30'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <p className="text-lg font-bold text-foreground">{stats.totalRedemptions}</p>
          <p className="text-xs text-muted-foreground">Redeemed</p>
        </button>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {/* Action Buttons */}
      <div className="flex gap-3">
        {isAdmin && (
          <AIPromoDesignerSheet 
            venueId={selectedVenueId || undefined} 
            venueName={venueName} 
            onPromoCreated={handlePromoCreated}
          >
            <Button ref={promoSheetRef} className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Promo
            </Button>
          </AIPromoDesignerSheet>
        )}

        <BasicPromoCreator 
          venueId={selectedVenueId || undefined} 
          venueName={venueName} 
          onPromoCreated={handlePromoCreated}
        >
          <Button variant={isAdmin ? "outline" : "default"} className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            {isAdmin ? 'Basic Promo' : 'Create Promo'}
          </Button>
        </BasicPromoCreator>
      </div>

      {/* Promo List - Grouped by Date like Packages */}
      {promosLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredPromos.length === 0 ? (
        <div className="text-center py-8">
          <Tag className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">No Promos Yet</h3>
          <p className="text-sm text-muted-foreground">
            Create your first promo using the buttons above
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

      {/* Promo Performance Analytics */}
      <PromoPerformanceCard promos={promoPerformance} isLoading={analyticsLoading} />

      {/* Tips Section */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Promo Tips
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            Use AI Promo Designer to create data-driven offers based on your venue's performance
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            Slow nights (Sun-Wed) are ideal for running promotions to boost traffic
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            Track redemption rates to optimize future campaigns
          </li>
        </ul>
      </div>
    </div>
  );
}
