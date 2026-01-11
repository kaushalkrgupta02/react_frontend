import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VenueCommissionSummary {
  venueId: string;
  venueName: string;
  stripeAccountId: string | null;
  payoutEnabled: boolean;
  totalCommission: number;
  count: number;
  commissionIds: string[];
}

interface CommissionSummary {
  totalPending: number;
  totalCount: number;
  byVenue: VenueCommissionSummary[];
}

export function useCommissionSummary() {
  return useQuery({
    queryKey: ['commission-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-commission-payout', {
        body: { action: 'get_summary' },
      });

      if (error) throw error;
      return data.summary as CommissionSummary;
    },
  });
}

export function useMarkCommissionsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commissionIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('process-commission-payout', {
        body: { action: 'mark_paid', commissionIds },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['commission-summary'] });
      queryClient.invalidateQueries({ queryKey: ['commission-data'] });
      queryClient.invalidateQueries({ queryKey: ['cross-venue-stats'] });
      toast.success(`Marked ${data.count} commissions as paid`);
    },
    onError: (error) => {
      console.error('Error marking commissions paid:', error);
      toast.error('Failed to process payout');
    },
  });
}

export function useProcessStripePayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (venueId: string) => {
      const { data, error } = await supabase.functions.invoke('process-commission-payout', {
        body: { action: 'process_batch', venueId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['commission-summary'] });
      queryClient.invalidateQueries({ queryKey: ['commission-data'] });
      queryClient.invalidateQueries({ queryKey: ['cross-venue-stats'] });
      toast.success(`Stripe transfer processed: Rp ${data.amount.toLocaleString()}`);
    },
    onError: (error: any) => {
      console.error('Error processing Stripe payout:', error);
      toast.error(error.message || 'Failed to process Stripe payout');
    },
  });
}

export function usePayoutBatches() {
  return useQuery({
    queryKey: ['payout-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payout_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });
}
