import { useState } from 'react';
import { DollarSign, CheckCircle, Loader2, CreditCard, Building2, AlertCircle, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useCommissionSummary, useMarkCommissionsPaid, useProcessStripePayout, usePayoutBatches } from '@/hooks/useCommissionPayouts';

export default function CommissionPayoutPanel() {
  const { data: summary, isLoading: summaryLoading } = useCommissionSummary();
  const { data: batches, isLoading: batchesLoading } = usePayoutBatches();
  const markPaid = useMarkCommissionsPaid();
  const processStripe = useProcessStripePayout();
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);

  const handleMarkAllPaid = () => {
    if (!summary) return;
    const allIds = summary.byVenue.flatMap(v => v.commissionIds);
    markPaid.mutate(allIds);
  };

  const handleMarkVenuePaid = (venueIds: string[]) => {
    markPaid.mutate(venueIds);
  };

  const handleStripeTransfer = (venueId: string) => {
    processStripe.mutate(venueId);
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Total Pending</span>
            </div>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-primary">
                Rp {(summary?.totalPending || 0).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-xs">Venues Owed</span>
            </div>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-foreground">
                {summary?.byVenue.length || 0}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Commissions by Venue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Pending Payouts
              </CardTitle>
              <CardDescription>
                Commission payments owed to venues
              </CardDescription>
            </div>
            {summary && summary.totalCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm"
                    disabled={markPaid.isPending}
                  >
                    {markPaid.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Mark All Paid
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Payout</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark all {summary.totalCount} commissions totaling Rp {summary.totalPending.toLocaleString()} as paid. 
                      Use this if you've processed payments outside of Stripe.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleMarkAllPaid}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : summary && summary.byVenue.length > 0 ? (
            <div className="space-y-3">
              {summary.byVenue.map((venue) => (
                <div
                  key={venue.venueId}
                  className="p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">{venue.venueName}</p>
                      <p className="text-sm text-muted-foreground">
                        {venue.count} commission{venue.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">
                        Rp {venue.totalCommission.toLocaleString()}
                      </p>
                      {venue.payoutEnabled ? (
                        <Badge variant="outline" className="text-green-400 border-green-400/30">
                          Stripe Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                          Manual Payout
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {venue.payoutEnabled && venue.stripeAccountId ? (
                      <Button
                        size="sm"
                        onClick={() => handleStripeTransfer(venue.venueId)}
                        disabled={processStripe.isPending}
                        className="flex-1"
                      >
                        {processStripe.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4 mr-2" />
                        )}
                        Pay via Stripe
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkVenuePaid(venue.commissionIds)}
                        disabled={markPaid.isPending}
                        className="flex-1"
                      >
                        {markPaid.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-foreground font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No pending commissions to process
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Payout History
          </CardTitle>
          <CardDescription>Recent commission payouts</CardDescription>
        </CardHeader>
        <CardContent>
          {batchesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : batches && batches.length > 0 ? (
            <div className="space-y-2">
              {batches.map((batch: any) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      Batch #{batch.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {batch.commission_count} commissions • {new Date(batch.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      Rp {(batch.total_amount || 0).toLocaleString()}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        batch.status === 'completed' ? 'text-green-400 border-green-400/30' :
                        batch.status === 'failed' ? 'text-red-400 border-red-400/30' :
                        'text-amber-400 border-amber-400/30'
                      }
                    >
                      {batch.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No payout history yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Setup Notice */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Stripe Connect Setup</p>
              <p className="text-sm text-muted-foreground mt-1">
                For automatic Stripe payouts, venues need to connect their Stripe account. 
                Until then, use "Mark as Paid" after processing payments manually.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
