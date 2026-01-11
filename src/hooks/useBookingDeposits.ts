import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DepositPurchaseType = 'booking' | 'package';

export interface Deposit {
  id: string;
  purchase_type: DepositPurchaseType;
  booking_id: string | null;
  package_purchase_id: string | null;
  venue_id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'refunded' | 'charged_no_show' | 'cancelled';
  payment_method: string | null;
  payment_provider: string | null;
  external_payment_id: string | null;
  refund_amount: number;
  refunded_at: string | null;
  charged_no_show_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  bookings?: {
    id: string;
    booking_reference: string;
    booking_date: string;
    party_size: number;
    status: string;
  } | null;
  package_purchases?: {
    id: string;
    qr_code: string;
    guest_name: string | null;
    status: string;
    venue_packages?: {
      name: string;
    } | null;
  } | null;
}

interface CreateDepositParams {
  purchase_type: DepositPurchaseType;
  booking_id?: string;
  package_purchase_id?: string;
  venue_id: string;
  user_id?: string;
  amount: number;
  currency?: string;
  payment_method?: string;
  payment_provider?: string;
}

export function useDeposits(venueId: string | null) {
  const queryClient = useQueryClient();

  // Fetch all deposits for a venue
  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ['deposits', venueId],
    queryFn: async () => {
      if (!venueId) return [];

      const { data, error } = await supabase
        .from('booking_deposits')
        .select(`
          *,
          bookings (
            id,
            booking_reference,
            booking_date,
            party_size,
            status
          ),
          package_purchases (
            id,
            qr_code,
            guest_name,
            status,
            venue_packages (
              name
            )
          )
        `)
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Deposit[];
    },
    enabled: !!venueId,
  });

  // Create a deposit request
  const createDeposit = useMutation({
    mutationFn: async (params: CreateDepositParams) => {
      const { data, error } = await supabase
        .from('booking_deposits')
        .insert({
          purchase_type: params.purchase_type,
          booking_id: params.booking_id || null,
          package_purchase_id: params.package_purchase_id || null,
          venue_id: params.venue_id,
          user_id: params.user_id || null,
          amount: params.amount,
          currency: params.currency || 'IDR',
          status: 'pending',
          payment_method: params.payment_method || null,
          payment_provider: params.payment_provider || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Deposit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits', venueId] });
      toast.success('Deposit request created');
    },
    onError: (error) => {
      console.error('Error creating deposit:', error);
      toast.error('Failed to create deposit request');
    },
  });

  // Mark deposit as paid
  const markAsPaid = useMutation({
    mutationFn: async ({ depositId, paymentMethod }: { depositId: string; paymentMethod?: string }) => {
      const { data, error } = await supabase
        .from('booking_deposits')
        .update({
          status: 'paid',
          payment_method: paymentMethod || 'manual',
        })
        .eq('id', depositId)
        .select()
        .single();

      if (error) throw error;
      return data as Deposit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits', venueId] });
      toast.success('Deposit marked as paid');
    },
    onError: (error) => {
      console.error('Error updating deposit:', error);
      toast.error('Failed to update deposit');
    },
  });

  // Refund deposit
  const refundDeposit = useMutation({
    mutationFn: async ({ depositId, refundAmount, notes }: { depositId: string; refundAmount?: number; notes?: string }) => {
      // Get current deposit to determine refund amount
      const { data: deposit } = await supabase
        .from('booking_deposits')
        .select('amount')
        .eq('id', depositId)
        .single();

      const { data, error } = await supabase
        .from('booking_deposits')
        .update({
          status: 'refunded',
          refund_amount: refundAmount || deposit?.amount || 0,
          refunded_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', depositId)
        .select()
        .single();

      if (error) throw error;
      return data as Deposit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits', venueId] });
      toast.success('Deposit refunded');
    },
    onError: (error) => {
      console.error('Error refunding deposit:', error);
      toast.error('Failed to refund deposit');
    },
  });

  // Charge no-show
  const chargeNoShow = useMutation({
    mutationFn: async ({ depositId, notes }: { depositId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('booking_deposits')
        .update({
          status: 'charged_no_show',
          charged_no_show_at: new Date().toISOString(),
          notes: notes || 'Charged due to no-show',
        })
        .eq('id', depositId)
        .select()
        .single();

      if (error) throw error;
      return data as Deposit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits', venueId] });
      toast.success('No-show fee charged');
    },
    onError: (error) => {
      console.error('Error charging no-show:', error);
      toast.error('Failed to charge no-show fee');
    },
  });

  // Get pending deposit total
  const pendingTotal = deposits
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const paidTotal = deposits
    .filter(d => d.status === 'paid')
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const bookingDeposits = deposits.filter(d => d.purchase_type === 'booking');
  const packageDeposits = deposits.filter(d => d.purchase_type === 'package');

  return {
    deposits,
    bookingDeposits,
    packageDeposits,
    isLoading,
    createDeposit,
    markAsPaid,
    refundDeposit,
    chargeNoShow,
    pendingTotal,
    paidTotal,
  };
}

// Legacy export for backward compatibility
export const useBookingDeposits = useDeposits;

export function useBookingDeposit(bookingId: string | null) {
  const { data: deposit, isLoading } = useQuery({
    queryKey: ['booking-deposit', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data, error } = await supabase
        .from('booking_deposits')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('purchase_type', 'booking')
        .maybeSingle();

      if (error) throw error;
      return data as Deposit | null;
    },
    enabled: !!bookingId,
  });

  return {
    deposit,
    isLoading,
    hasDeposit: !!deposit,
    isPaid: deposit?.status === 'paid',
    isPending: deposit?.status === 'pending',
  };
}
