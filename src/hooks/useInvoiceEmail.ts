import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SessionInvoice, SessionOrderItem } from '@/hooks/useTableSessions';
import { withApiBase } from '@/lib/config';
import { getAuthHeader } from '@/lib/utilsAuth';

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SendInvoiceEmailParams {
  type: 'bill' | 'receipt';
  recipientEmail: string;
  recipientName?: string;
  invoiceNumber: string;
  venueName: string;
  venueAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  discountAmount?: number;
  depositCredit?: number;
  totalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentMethod?: string;
  paidAt?: string;
  sessionDate: string;
  tableName?: string;
}

interface SendInvoiceEmailResponse {
  success: boolean;
  emailId?: string;
  error?: string;
  needsConfiguration?: boolean;
}

export function useInvoiceEmail() {
  return useMutation({
    mutationFn: async (params: SendInvoiceEmailParams & { invoiceId?: string }): Promise<SendInvoiceEmailResponse> => {
      // Prefer server proxy to avoid CORS and to use server-side service role key
      if (params.invoiceId) {
        const url = withApiBase(`/api/v1/sessions/invoices/${params.invoiceId}/send-email`);
        const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
        const body = {
          to_email: params.recipientEmail,
          subject: `${params.type === 'receipt' ? 'Receipt' : 'Bill'} - ${params.invoiceNumber}`,
          body_overrides: params
        };
        const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || 'Failed to send invoice email');
        }
        const data = await resp.json();
        return data as SendInvoiceEmailResponse;
      }

      // Fallback: call function directly (may be blocked by CORS)
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: params,
      });

      if (error) throw error;
      return data as SendInvoiceEmailResponse;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success(
          variables.type === 'receipt' 
            ? `Receipt sent to ${variables.recipientEmail}` 
            : `Bill sent to ${variables.recipientEmail}`
        );
      } else if (data.needsConfiguration) {
        toast.error('Email service not configured. Add Resend API key in admin settings.');
      } else {
        toast.error(data.error || 'Failed to send email');
      }
    },
    onError: (error) => {
      console.error('Invoice email error:', error);
      toast.error('Failed to send email');
    },
  });
}

// Helper function to prepare invoice data for sending
export function prepareInvoiceEmailData(
  invoice: SessionInvoice,
  items: SessionOrderItem[],
  venueName: string,
  tableName?: string,
  venueAddress?: string,
  paymentMethod?: string
): Omit<SendInvoiceEmailParams, 'type' | 'recipientEmail' | 'recipientName'> {
  const invoiceItems: InvoiceItem[] = items.map(item => ({
    name: item.item_name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.quantity * item.unit_price,
  }));

  return {
    invoiceNumber: invoice.invoice_number,
    venueName,
    venueAddress,
    items: invoiceItems,
    subtotal: invoice.subtotal,
    taxAmount: invoice.tax_amount,
    serviceCharge: invoice.service_charge,
    discountAmount: invoice.discount_amount,
    depositCredit: invoice.deposit_credit,
    totalAmount: invoice.total_amount,
    amountPaid: invoice.amount_paid,
    balanceDue: invoice.total_amount - invoice.amount_paid,
    paymentMethod,
    paidAt: invoice.paid_at || undefined,
    sessionDate: new Date(invoice.generated_at).toLocaleDateString(),
    tableName,
  };
}
