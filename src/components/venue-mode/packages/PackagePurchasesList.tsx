import { useState, useCallback } from 'react';
import { Package, User, Clock, ChevronRight, Check, Loader2, X, ShoppingBag, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { PackagePurchase, PackagePurchaseWithItems, usePackagePurchases } from '@/hooks/usePackagePurchases';
import { usePackageRedemptions } from '@/hooks/usePackageRedemptions';
import { formatPrice } from '@/types/venue-mode';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { playCheckInSound } from '@/lib/audioFeedback';
import { PackageGuestsProgress } from '../guests';


interface PackagePurchasesListProps {
  purchases: PackagePurchase[];
  isLoading: boolean;
  venueId: string | null;
  onPurchaseUpdated?: () => void;
}

export default function PackagePurchasesList({ 
  purchases, 
  isLoading, 
  venueId,
  onPurchaseUpdated 
}: PackagePurchasesListProps) {
  const [selectedPurchase, setSelectedPurchase] = useState<PackagePurchaseWithItems | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'redeemed'>('redeemed');

  const { findPurchaseByQRCode } = usePackagePurchases(venueId);
  const { redeemMultipleItems, isRedeeming } = usePackageRedemptions();

  // Quick stats
  const stats = {
    total: purchases.length,
    active: purchases.filter(p => p.status === 'active' || p.status === 'partially_redeemed').length,
    redeemed: purchases.filter(p => p.status === 'fully_redeemed').length,
  };

  // Filter purchases based on status
  const filteredPurchases = purchases.filter(p => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return p.status === 'active' || p.status === 'partially_redeemed';
    if (statusFilter === 'redeemed') return p.status === 'fully_redeemed';
    return true;
  });

  const handleSearch = useCallback(async (code: string) => {
    if (!code.trim()) {
      toast.error('Please enter a package code');
      return;
    }

    setIsSearching(true);
    const result = await findPurchaseByQRCode(code.trim());
    setIsSearching(false);

    if (result.success && result.data) {
      setSelectedPurchase(result.data);
      setSelectedItems(new Map());
    } else {
      toast.error(result.error || 'Package not found');
    }
  }, [findPurchaseByQRCode]);

  const handleSelectPurchase = async (purchase: PackagePurchase) => {
    setIsLoadingPurchase(true);
    const result = await findPurchaseByQRCode(purchase.qr_code);
    setIsLoadingPurchase(false);

    if (result.success && result.data) {
      setSelectedPurchase(result.data);
      setSelectedItems(new Map());
    } else {
      toast.error('Failed to load package details');
    }
  };

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
    if (!selectedPurchase || selectedItems.size === 0) return;

    const items = Array.from(selectedItems.entries()).map(([itemId, qty]) => ({
      packageItemId: itemId,
      quantity: qty,
    }));

    const result = await redeemMultipleItems(selectedPurchase.id, items);

    if (result.success) {
      playCheckInSound();
      toast.success('Items redeemed successfully!');
      // Refresh the purchase data
      const refreshed = await findPurchaseByQRCode(selectedPurchase.qr_code);
      if (refreshed.success && refreshed.data) {
        setSelectedPurchase(refreshed.data);
        setSelectedItems(new Map());
      }
      onPurchaseUpdated?.();
    } else {
      toast.error(result.error || 'Failed to redeem items');
    }
  };

  const handleCloseRedemption = () => {
    setSelectedPurchase(null);
    setSelectedItems(new Map());
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400',
      partially_redeemed: 'bg-yellow-500/20 text-yellow-400',
      fully_redeemed: 'bg-muted text-muted-foreground',
      expired: 'bg-red-500/20 text-red-400',
      cancelled: 'bg-red-500/20 text-red-400',
    };
    const labels: Record<string, string> = {
      active: 'Active',
      partially_redeemed: 'Partial',
      fully_redeemed: 'Done',
      expired: 'Expired',
      cancelled: 'Cancelled',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Redemption Detail View
  if (selectedPurchase) {
    const isActive = selectedPurchase.status === 'active' || selectedPurchase.status === 'partially_redeemed';
    const guestName = selectedPurchase.guest_name || selectedPurchase.profile?.display_name || 'Guest';

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleCloseRedemption}>
            <X className="w-4 h-4 mr-1" />
            Back
          </Button>
          {getStatusBadge(selectedPurchase.status)}
        </div>

        {/* Package Info */}
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground">{selectedPurchase.package?.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedPurchase.package?.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{guestName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">
                {format(new Date(selectedPurchase.purchased_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">Code</span>
            <span className="font-mono text-sm text-primary">{selectedPurchase.qr_code}</span>
          </div>
          
          {selectedPurchase.total_paid && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Paid</span>
              <span className="font-medium text-foreground">{formatPrice(selectedPurchase.total_paid)}</span>
            </div>
          )}

          {/* Guest-level tracking for multi-guest packages */}
          {(selectedPurchase.guest_count && selectedPurchase.guest_count > 1) && (
            <div className="pt-3 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-2">Guest Check-In Status</h4>
              <PackageGuestsProgress 
                purchaseId={selectedPurchase.id} 
                guestCount={selectedPurchase.guest_count}
              />
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
            {selectedPurchase.items.map((item) => {
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
          </Button>
        )}
      </div>
    );
  }

  // Main List View
  return (
    <div className="space-y-4">
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
            <ShoppingBag className="w-3.5 h-3.5" />
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
            <AlertCircle className="w-3.5 h-3.5" />
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
          <p className="text-lg font-bold text-foreground">{stats.redeemed}</p>
          <p className="text-xs text-muted-foreground">Redeemed</p>
        </button>
      </div>

      {/* Loading spinner */}
      {(isLoading || isLoadingPurchase) && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredPurchases.length === 0 && (
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">
            {purchases.length === 0 ? 'No Package Purchases' : `No ${statusFilter === 'all' ? '' : statusFilter} packages`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {purchases.length === 0 
              ? 'Package purchases will appear here when customers buy packages'
              : 'Try selecting a different filter'}
          </p>
        </div>
      )}

      {/* Purchases List */}
      {!isLoading && filteredPurchases.length > 0 && (
        <div className="space-y-4">
          {/* Group by date */}
          {Object.entries(
            filteredPurchases.reduce((acc, purchase) => {
              const date = format(new Date(purchase.purchased_at), 'yyyy-MM-dd');
              if (!acc[date]) acc[date] = [];
              acc[date].push(purchase);
              return acc;
            }, {} as Record<string, PackagePurchase[]>)
          )
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, datePurchases]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {format(new Date(date), 'EEEE, MMMM d')}
                </h3>
                <div className="space-y-2">
                  {datePurchases.map((purchase) => {
                    const guestName = purchase.guest_name || purchase.profile?.display_name || 'Guest';
                    const isActive = purchase.status === 'active' || purchase.status === 'partially_redeemed';
                    
                    return (
                      <button
                        key={purchase.id}
                        onClick={() => handleSelectPurchase(purchase)}
                        className={`w-full text-left bg-card rounded-xl p-4 border border-border transition-all ${
                          isActive 
                            ? 'hover:border-primary/30 hover:bg-card/80 cursor-pointer' 
                            : 'opacity-70'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-medium text-foreground">
                                  {purchase.package?.name || 'Package'}
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                  <User className="w-3.5 h-3.5" />
                                  <span>{guestName}</span>
                                </div>
                              </div>
                              {getStatusBadge(purchase.status)}
                            </div>
                            
                            {/* Guest-level tracking */}
                            {(purchase.guest_count && purchase.guest_count > 1) && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <PackageGuestsProgress 
                                  purchaseId={purchase.id} 
                                  guestCount={purchase.guest_count}
                                  compact
                                />
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{format(new Date(purchase.purchased_at), 'h:mm a')}</span>
                                {purchase.guest_count && purchase.guest_count > 1 && (
                                  <>
                                    <Users className="w-3.5 h-3.5 ml-2" />
                                    <span>{purchase.guest_count} guests</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-primary">{purchase.qr_code}</span>
                                {purchase.total_paid && (
                                  <span className="text-sm font-medium text-foreground">
                                    {formatPrice(purchase.total_paid)}
                                  </span>
                                )}
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
    </div>
  );
}
