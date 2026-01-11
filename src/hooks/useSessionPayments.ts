import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SessionPayment {
  id: string;
  invoice_id: string;
  payment_method: string;
  amount: number;
  reference_number: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processed_by: string | null;
  notes: string | null;
  created_at: string;
}

interface ProcessPaymentParams {
  invoice_id: string;
  session_id: string;
  payment_method: string;
  amount: number;
  reference_number?: string;
  notes?: string;
}

export function useSessionPayments() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processPayment = async (params: ProcessPaymentParams): Promise<SessionPayment | null> => {
    setIsProcessing(true);
    try {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('session_payments')
        .insert({
          invoice_id: params.invoice_id,
          payment_method: params.payment_method,
          amount: params.amount,
          reference_number: params.reference_number || null,
          notes: params.notes || null,
          status: 'completed'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Get invoice to check if fully paid
      const { data: invoice, error: invoiceError } = await supabase
        .from('session_invoices')
        .select('*')
        .eq('id', params.invoice_id)
        .single();

      if (invoiceError) throw invoiceError;

      const newAmountPaid = invoice.amount_paid + params.amount;
      const isPaid = newAmountPaid >= invoice.total_amount;

      // Update invoice
      const { error: updateError } = await supabase
        .from('session_invoices')
        .update({
          amount_paid: newAmountPaid,
          status: isPaid ? 'paid' : 'partially_paid',
          paid_at: isPaid ? new Date().toISOString() : null
        })
        .eq('id', params.invoice_id);

      if (updateError) throw updateError;

      // If fully paid, update session status
      if (isPaid) {
        await supabase
          .from('table_sessions')
          .update({ status: 'paid' })
          .eq('id', params.session_id);
      }

      toast.success(`Payment of ${params.amount.toLocaleString()} recorded`);
      return payment as SessionPayment;
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const getPaymentsByInvoice = async (invoiceId: string): Promise<SessionPayment[]> => {
    try {
      const { data, error } = await supabase
        .from('session_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as SessionPayment[];
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  };

  const refundPayment = async (paymentId: string): Promise<boolean> => {
    try {
      const { data: payment, error: fetchError } = await supabase
        .from('session_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError) throw fetchError;

      // Update payment status
      const { error: updateError } = await supabase
        .from('session_payments')
        .update({ status: 'refunded' })
        .eq('id', paymentId);

      if (updateError) throw updateError;

      // Update invoice amount paid
      const { data: invoice } = await supabase
        .from('session_invoices')
        .select('*')
        .eq('id', payment.invoice_id)
        .single();

      if (invoice) {
        const newAmountPaid = invoice.amount_paid - payment.amount;
        await supabase
          .from('session_invoices')
          .update({
            amount_paid: Math.max(0, newAmountPaid),
            status: newAmountPaid <= 0 ? 'pending' : 'partially_paid'
          })
          .eq('id', payment.invoice_id);
      }

      toast.success('Payment refunded');
      return true;
    } catch (error) {
      console.error('Error refunding payment:', error);
      toast.error('Failed to refund payment');
      return false;
    }
  };

  return {
    isProcessing,
    processPayment,
    getPaymentsByInvoice,
    refundPayment
  };
}
