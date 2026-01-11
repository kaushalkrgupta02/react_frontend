import { useState, useCallback } from 'react';
import { Check, Loader2, X, Package, Clock, User, ChevronRight, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePackagePurchases, PackagePurchaseWithItems } from '@/hooks/usePackagePurchases';
import { usePackageRedemptions } from '@/hooks/usePackageRedemptions';
import { toast } from 'sonner';
import { formatPrice } from '@/types/venue-mode';
import { format } from 'date-fns';
import { playCheckInSound } from '@/lib/audioFeedback';
import InlineScanSearch from '../InlineScanSearch';
import { supabase } from '@/integrations/supabase/client';

interface PackageGuestInfo {
  id: string;
  guest_number: number;
  guest_name: string | null;
  qr_code: string;
  redemption_status: string;
  is_primary: boolean;
  profile?: {
    display_name: string | null;
    phone: string | null;
  } | null;
  purchase: PackagePurchaseWithItems;
}

interface PackageRedemptionScannerProps {
  venueId: string | null;
}

export default function PackageRedemptionScanner({ venueId }: PackageRedemptionScannerProps) {
  const [purchase, setPurchase] = useState<PackagePurchaseWithItems | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [foundGuest, setFoundGuest] = useState<PackageGuestInfo | null>(null);

  const { findPurchaseByQRCode } = usePackagePurchases(venueId);
  const { redeemMultipleItems, isRedeeming } = usePackageRedemptions();

  const handleSearch = useCallback(async (code: string) => {
    if (!code.trim()) {
      toast.error('Please enter a package code');
      return;
    }

    setIsSearching(true);
    
    // Check if it's an individual guest QR code (PG- prefix)
    if (code.trim().startsWith('PG-')) {
      try {
        const { data, error } = await supabase
          .from('package_guests')
          .select(`
            id, guest_number, guest_name, qr_code, redemption_status, is_primary,
            profile:profiles!package_guests_user_id_fkey(display_name, phone),
            purchase:package_purchases(
              id, qr_code, status, purchased_at, total_paid, guest_name, guest_count,
              package:venue_packages(id, name, description, price),
              venue:venues(id, name)
            )
          `)
          .eq('qr_code', code.trim())
          .single();

        if (error) throw error;

        // Transform the data to match expected format
        const purchaseData = data.purchase as any;
        const transformedPurchase: PackagePurchaseWithItems = {
          ...purchaseData,
          items: [], // Will be fetched separately if needed
          profile: null,
        };

        // Fetch package items
        const { data: itemsData } = await supabase
          .from('package_items')
          .select('*')
          .eq('package_id', purchaseData.package?.id)
          .order('sort_order');

        // Get redemptions for this purchase
        const { data: redemptionsData } = await supabase
          .from('package_redemptions')
          .select('package_item_id, quantity_redeemed')
          .eq('purchase_id', purchaseData.id);

        // Calculate redeemed counts
        const redemptionMap = new Map<string, number>();
        redemptionsData?.forEach((r: any) => {
          const current = redemptionMap.get(r.package_item_id) || 0;
          redemptionMap.set(r.package_item_id, current + r.quantity_redeemed);
        });

        transformedPurchase.items = (itemsData || []).map((item: any) => ({
          ...item,
          redeemed_count: redemptionMap.get(item.id) || 0,
        }));

        setFoundGuest({
          id: data.id,
          guest_number: data.guest_number,
          guest_name: data.guest_name,
          qr_code: data.qr_code,
          redemption_status: data.redemption_status,
          is_primary: data.is_primary,
          profile: data.profile as any,
          purchase: transformedPurchase,
        });
        setPurchase(transformedPurchase);
        setSelectedItems(new Map());
        playCheckInSound();
      } catch (error) {
        console.error('Error looking up package guest:', error);
        toast.error('Guest not found');
      } finally {
        setIsSearching(false);
      }
      return;
    }

    // Standard package QR code lookup
    const result = await findPurchaseByQRCode(code.trim());
    setIsSearching(false);

    if (result.success && result.data) {
      setPurchase(result.data);
      setSelectedItems(new Map());
      setFoundGuest(null);
    } else {
      toast.error(result.error || 'Package not found');
    }
  }, [findPurchaseByQRCode]);

  const handleSelectItem = (itemId: string, maxQuantity: number, redeemedCount: number) => {
    const remaining = maxQuantity - redeemedCount;
    if (remaining <= 0) return;

    const current = selectedItems.get(itemId) || 0;
    const newMap = new Map(selectedItems);
    
    if (current > 0) {
      if (current < remaining) {
        newMap.set(itemId, current + 1);
      } else {
        newMap.delete(itemId);
      }
    } else {
      newMap.set(itemId, 1);
    }
    
    setSelectedItems(newMap);
  };

  const handleRedeemSelected = async () => {
    if (!purchase || selectedItems.size === 0) return;

    const items = Array.from(selectedItems.entries()).map(([itemId, qty]) => ({
      packageItemId: itemId,
      quantity: qty,
    }));

    const result = await redeemMultipleItems(purchase.id, items);

    if (result.success) {
      playCheckInSound();
      toast.success('Items redeemed successfully!');

      // Update guest redemption status if applicable
      if (foundGuest) {
        await supabase
          .from('package_guests')
          .update({
            redemption_status: 'partially_redeemed',
          })
          .eq('id', foundGuest.id);
      }

      // Refresh the purchase data
      const refreshed = await findPurchaseByQRCode(purchase.qr_code);
      if (refreshed.success && refreshed.data) {
        setPurchase(refreshed.data);
        setSelectedItems(new Map());
      }
    } else {
      toast.error(result.error || 'Failed to redeem items');
    }
  };

  const handleReset = () => {
    setPurchase(null);
    setSelectedItems(new Map());
    setFoundGuest(null);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      partially_redeemed: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      fully_redeemed: 'bg-muted text-muted-foreground border-border',
      expired: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    const labels: Record<string, string> = {
      active: 'Active',
      partially_redeemed: 'Partial',
      fully_redeemed: 'Completed',
      expired: 'Expired',
      cancelled: 'Cancelled',
      pending: 'Pending',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (purchase) {
    const isActive = purchase.status === 'active' || purchase.status === 'partially_redeemed';
    const guestName = foundGuest 
      ? (foundGuest.profile?.display_name || foundGuest.guest_name || `Guest ${foundGuest.guest_number}`)
      : (purchase.guest_name || purchase.profile?.display_name || 'Guest');

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="w-4 h-4 mr-1" />
            Back
          </Button>
          {getStatusBadge(purchase.status)}
        </div>

        {/* Guest Info (if individual guest scan) */}
        {foundGuest && (
          <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{guestName}</p>
                <p className="text-sm text-muted-foreground">
                  Guest {foundGuest.guest_number} of {purchase.guest_count || 1}
                  {foundGuest.is_primary && ' • Host'}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  foundGuest.redemption_status === 'fully_redeemed'
                    ? 'bg-muted text-muted-foreground'
                    : foundGuest.redemption_status === 'partially_redeemed'
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    : 'bg-green-500/20 text-green-400 border-green-500/30'
                }
              >
                {foundGuest.redemption_status === 'fully_redeemed' 
                  ? 'Completed' 
                  : foundGuest.redemption_status === 'partially_redeemed' 
                  ? 'Partial' 
                  : 'Ready'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">{foundGuest.qr_code}</p>
          </div>
        )}

        {/* Package Info */}
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground">{purchase.package?.name}</h3>
              <p className="text-sm text-muted-foreground">{purchase.package?.description}</p>
            </div>
          </div>

          {!foundGuest && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{guestName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">
                  {format(new Date(purchase.purchased_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">Code</span>
            <span className="font-mono text-sm text-primary">{purchase.qr_code}</span>
          </div>
          
          {purchase.total_paid && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Paid</span>
              <span className="font-medium text-foreground">{formatPrice(purchase.total_paid)}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h4 className="font-medium text-foreground">Package Items</h4>
            <p className="text-xs text-muted-foreground">Tap items to select for redemption</p>
          </div>
          
          <div className="divide-y divide-border">
            {purchase.items.map((item) => {
              const remaining = item.quantity - item.redeemed_count;
              const isRedeemed = remaining <= 0 && item.redemption_rule !== 'unlimited';
              const selectedQty = selectedItems.get(item.id) || 0;
              const isSelected = selectedQty > 0;
              const canSelect = isActive && !isRedeemed;

              return (
                <button
                  key={item.id}
                  onClick={() => canSelect && handleSelectItem(item.id, item.quantity, item.redeemed_count)}
                  disabled={!canSelect}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                    isSelected 
                      ? 'bg-primary/10' 
                      : canSelect 
                        ? 'hover:bg-secondary/50' 
                        : 'opacity-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isRedeemed 
                      ? 'bg-green-500/20 text-green-400' 
                      : isSelected 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-muted-foreground'
                  }`}>
                    {isRedeemed ? (
                      <Check className="w-4 h-4" />
                    ) : isSelected ? (
                      <span className="text-sm font-bold">{selectedQty}</span>
                    ) : (
                      <span className="text-lg">
                        {item.item_type === 'entry' && '🚪'}
                        {item.item_type === 'drink' && '🍾'}
                        {item.item_type === 'food' && '🍽️'}
                        {item.item_type === 'experience' && '⭐'}
                        {item.item_type === 'other' && '📦'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${isRedeemed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {item.item_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.redemption_rule === 'unlimited' 
                        ? 'Unlimited'
                        : `${item.redeemed_count}/${item.quantity} redeemed`
                      }
                    </p>
                  </div>

                  {canSelect && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Redeem Button */}
        {isActive && selectedItems.size > 0 && (
          <Button
            onClick={handleRedeemSelected}
            disabled={isRedeeming}
            className="w-full"
            size="lg"
          >
            {isRedeeming ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Redeem {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
            {foundGuest && ` for ${guestName}`}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Inline Scan/Search */}
      <InlineScanSearch
        placeholder="PKG-... or PG-..."
        scanLabel="Scan QR"
        searchLabel="Enter Code"
        onSearch={handleSearch}
        isSearching={isSearching}
        venueId={venueId}
      />

      <p className="text-xs text-muted-foreground text-center">
        Scan package QR (PKG-...) or individual guest QR (PG-...)
      </p>
    </div>
  );
}
