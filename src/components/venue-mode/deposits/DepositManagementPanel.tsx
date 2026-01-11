import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CreditCard, Check, X, RefreshCw, Clock, Search, AlertTriangle, Package, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useDeposits, type Deposit } from '@/hooks/useBookingDeposits';
import { cn } from '@/lib/utils';

interface DepositManagementPanelProps {
  venueId: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Check }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400', icon: Clock },
  paid: { label: 'Collected', color: 'bg-green-500/20 text-green-400', icon: Check },
  refunded: { label: 'Refunded', color: 'bg-blue-500/20 text-blue-400', icon: RefreshCw },
  charged_no_show: { label: 'No-Show Charged', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: X },
};

export default function DepositManagementPanel({ venueId }: DepositManagementPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'booking' | 'package'>('all');

  const { 
    deposits, 
    isLoading, 
    markAsPaid, 
    refundDeposit, 
    chargeNoShow,
    pendingTotal,
    paidTotal,
  } = useDeposits(venueId);

  const filteredDeposits = deposits.filter(deposit => {
    const reference = deposit.purchase_type === 'booking' 
      ? deposit.bookings?.booking_reference 
      : deposit.package_purchases?.guest_name || deposit.package_purchases?.venue_packages?.name;
    
    const matchesSearch = !searchQuery || 
      reference?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || deposit.status === statusFilter;
    const matchesType = typeFilter === 'all' || deposit.purchase_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDepositLabel = (deposit: Deposit) => {
    if (deposit.purchase_type === 'booking') {
      return deposit.bookings?.booking_reference || 'Unknown Booking';
    }
    return deposit.package_purchases?.venue_packages?.name || deposit.package_purchases?.guest_name || 'Unknown Package';
  };

  const getDepositSubtext = (deposit: Deposit) => {
    if (deposit.purchase_type === 'booking') {
      return (
        <>
          {deposit.bookings?.booking_date && (
            <span>{format(parseISO(deposit.bookings.booking_date), 'MMM d, yyyy')}</span>
          )}
          <span>•</span>
          <span>{deposit.bookings?.party_size || 0} guests</span>
        </>
      );
    }
    return (
      <>
        <span>{deposit.package_purchases?.guest_name || 'Guest'}</span>
        <span>•</span>
        <span className="capitalize">{deposit.package_purchases?.status?.replace('_', ' ')}</span>
      </>
    );
  };

  if (!venueId) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a venue to manage deposits
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-400">Pending</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(pendingTotal)}</p>
        </div>
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Collected</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(paidTotal)}</p>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2">
        <Button
          variant={typeFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTypeFilter('all')}
          className="text-xs"
        >
          All
        </Button>
        <Button
          variant={typeFilter === 'booking' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTypeFilter('booking')}
          className="text-xs"
        >
          <CalendarCheck className="w-3 h-3 mr-1" />
          Bookings
        </Button>
        <Button
          variant={typeFilter === 'package' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTypeFilter('package')}
          className="text-xs"
        >
          <Package className="w-3 h-3 mr-1" />
          Packages
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by reference or guest..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
          <TabsTrigger value="paid" className="text-xs">Collected</TabsTrigger>
          <TabsTrigger value="refunded" className="text-xs">Refunded</TabsTrigger>
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Deposits List */}
      <ScrollArea className="h-[400px]">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredDeposits.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No deposits match your search' : 'No deposits yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDeposits.map((deposit) => {
              const config = statusConfig[deposit.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              const TypeIcon = deposit.purchase_type === 'booking' ? CalendarCheck : Package;

              return (
                <div
                  key={deposit.id}
                  className="p-4 rounded-lg bg-card border border-border"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        deposit.purchase_type === 'booking' 
                          ? "bg-blue-500/10" 
                          : "bg-purple-500/10"
                      )}>
                        <TypeIcon className={cn(
                          "w-4 h-4",
                          deposit.purchase_type === 'booking' 
                            ? "text-blue-400" 
                            : "text-purple-400"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {getDepositLabel(deposit)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {getDepositSubtext(deposit)}
                        </div>
                      </div>
                    </div>
                    <Badge className={cn('text-xs', config.color)}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(Number(deposit.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {format(parseISO(deposit.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>

                    {/* Actions */}
                    {deposit.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => markAsPaid.mutate({ depositId: deposit.id })}
                          disabled={markAsPaid.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Mark Paid
                        </Button>
                      </div>
                    )}

                    {deposit.status === 'paid' && (
                      <div className="flex gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-xs">
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Refund
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Refund Deposit?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will refund {formatCurrency(Number(deposit.amount))} to the guest.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => refundDeposit.mutate({ depositId: deposit.id })}
                              >
                                Confirm Refund
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {deposit.purchase_type === 'booking' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                No-Show
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Charge No-Show Fee?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will keep the deposit as a no-show fee. The guest will not receive a refund.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => chargeNoShow.mutate({ depositId: deposit.id })}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Charge No-Show
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    )}
                  </div>

                  {deposit.notes && (
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                      {deposit.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}