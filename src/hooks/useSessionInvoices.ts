import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TableSession, SessionInvoice, SessionOrder, SessionOrderItem } from './useTableSessions';

export interface SplitGuestInfo {
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
  guest_user_id?: string;
}

interface GenerateInvoiceParams {
  sessionId: string;
  taxRate: number;
  serviceChargeRate: number;
  discountAmount?: number;
  discountReason?: string;
  depositCredit?: number;
  splitNumber?: number; // For split invoices: which split this is (1, 2, 3...)
  totalSplits?: number; // Total number of splits
  customSubtotal?: number; // Override subtotal for split invoices
  guestInfo?: SplitGuestInfo; // Guest info for split invoices
}

export function useSessionInvoices() {
  const [isGenerating, setIsGenerating] = useState(false);

  const calculateTotals = (session: TableSession, taxRate: number, serviceChargeRate: number) => {
    let subtotal = 0;

    // Sum all non-cancelled items from all orders
    session.orders?.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items?.forEach(item => {
          if (item.status !== 'cancelled') {
            subtotal += item.quantity * item.unit_price;
          }
        });
      }
    });

    const taxAmount = subtotal * (taxRate / 100);
    const serviceCharge = subtotal * (serviceChargeRate / 100);

    return { subtotal, taxAmount, serviceCharge };
  };

  // Fetch fresh session with orders for invoice generation
  const fetchSessionWithOrders = async (sessionId: string): Promise<TableSession | null> => {
    const { data: session, error: sessionError } = await supabase
      .from('table_sessions')
      .select(`
        *,
        table:venue_tables(*)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Error fetching session:', sessionError);
      return null;
    }

    // Fetch orders with items
    const { data: orders, error: ordersError } = await supabase
      .from('session_orders')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_number', { ascending: true });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return null;
    }

    // Fetch all items for these orders
    const orderIds = orders?.map(o => o.id) || [];
    let items: SessionOrderItem[] = [];
    
    if (orderIds.length > 0) {
      const { data: orderItems, error: itemsError } = await supabase
        .from('session_order_items')
        .select('*')
        .in('session_order_id', orderIds);
      
      if (!itemsError && orderItems) {
        items = orderItems as SessionOrderItem[];
      }
    }

    // Map items to orders
    const ordersWithItems: SessionOrder[] = (orders || []).map(order => ({
      ...order,
      items: items.filter(item => item.session_order_id === order.id)
    })) as SessionOrder[];

    return {
      ...session,
      orders: ordersWithItems
    } as TableSession;
  };

  const generateInvoice = async (params: GenerateInvoiceParams): Promise<SessionInvoice | null> => {
    setIsGenerating(true);
    try {
      // Fetch fresh session with orders
      const session = await fetchSessionWithOrders(params.sessionId);
      if (!session) {
        toast.error('Could not load session data');
        return null;
      }

      let subtotal: number;
      let taxAmount: number;
      let serviceCharge: number;

      if (params.customSubtotal !== undefined) {
        // Use custom subtotal for split invoices
        subtotal = params.customSubtotal;
        taxAmount = subtotal * (params.taxRate / 100);
        serviceCharge = subtotal * (params.serviceChargeRate / 100);
      } else {
        const totals = calculateTotals(session, params.taxRate, params.serviceChargeRate);
        subtotal = totals.subtotal;
        taxAmount = totals.taxAmount;
        serviceCharge = totals.serviceCharge;
      }

      if (subtotal === 0) {
        toast.error('No items to invoice');
        return null;
      }

      const discountAmount = params.discountAmount || 0;
      const depositCredit = params.depositCredit || 0;
      const totalAmount = subtotal + taxAmount + serviceCharge - discountAmount - depositCredit;

      // Generate invoice number using RPC
      const { data: invoiceNumberData } = await supabase.rpc('generate_invoice_number' as any);
      let invoiceNumber = invoiceNumberData || `INV-${Date.now()}`;
      
      // Add split indicator to invoice number if this is a split invoice
      if (params.splitNumber && params.totalSplits) {
        invoiceNumber = `${invoiceNumber}-${params.splitNumber}/${params.totalSplits}`;
      }

      const { data, error } = await supabase
        .from('session_invoices')
        .insert({
          session_id: params.sessionId,
          invoice_number: invoiceNumber,
          subtotal,
          tax_amount: taxAmount,
          service_charge: serviceCharge,
          discount_amount: discountAmount,
          discount_reason: params.discountReason || null,
          deposit_credit: depositCredit,
          total_amount: totalAmount,
          amount_paid: 0,
          status: 'pending',
          guest_name: params.guestInfo?.guest_name || null,
          guest_phone: params.guestInfo?.guest_phone || null,
          guest_email: params.guestInfo?.guest_email || null,
          guest_user_id: params.guestInfo?.guest_user_id || null
        })
        .select()
        .single();

      if (error) throw error;

      // Update session status to billing
      await supabase
        .from('table_sessions')
        .update({ status: 'billing' })
        .eq('id', params.sessionId);

      if (!params.splitNumber) {
        toast.success('Invoice generated');
      }
      return data as SessionInvoice;
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSplitInvoices = async (
    sessionId: string,
    splitCount: number,
    taxRate: number,
    serviceChargeRate: number,
    discountAmount: number = 0,
    tipAmount: number = 0,
    guests?: SplitGuestInfo[]
  ): Promise<SessionInvoice[]> => {
    setIsGenerating(true);
    try {
      // Fetch fresh session with orders
      const session = await fetchSessionWithOrders(sessionId);
      if (!session) {
        toast.error('Could not load session data');
        return [];
      }

      const totals = calculateTotals(session, taxRate, serviceChargeRate);
      
      if (totals.subtotal === 0) {
        toast.error('No items to invoice');
        return [];
      }

      // Calculate total before split
      const fullTotal = totals.subtotal + totals.taxAmount + totals.serviceCharge - discountAmount + tipAmount;
      
      // Calculate split amounts (last person gets any rounding difference)
      const baseAmount = Math.floor(fullTotal / splitCount);
      const remainder = fullTotal - (baseAmount * splitCount);

      const invoices: SessionInvoice[] = [];

      for (let i = 1; i <= splitCount; i++) {
        const isLast = i === splitCount;
        const splitTotal = isLast ? baseAmount + remainder : baseAmount;
        
        // Proportionally distribute subtotal for this split
        const splitSubtotal = Math.floor(totals.subtotal / splitCount) + (isLast ? totals.subtotal % splitCount : 0);

        // Generate invoice number
        const { data: invoiceNumberData } = await supabase.rpc('generate_invoice_number' as any);
        const baseInvoiceNumber = invoiceNumberData || `INV-${Date.now()}`;
        const invoiceNumber = `${baseInvoiceNumber}-${i}/${splitCount}`;

        // Get guest info for this split
        const guestInfo = guests?.[i - 1];

        const { data, error } = await supabase
          .from('session_invoices')
          .insert({
            session_id: sessionId,
            invoice_number: invoiceNumber,
            subtotal: splitSubtotal,
            tax_amount: Math.floor(totals.taxAmount / splitCount) + (isLast ? totals.taxAmount % splitCount : 0),
            service_charge: Math.floor(totals.serviceCharge / splitCount) + (isLast ? totals.serviceCharge % splitCount : 0),
            discount_amount: Math.floor(discountAmount / splitCount) + (isLast ? discountAmount % splitCount : 0),
            discount_reason: discountAmount > 0 ? `Split ${i}/${splitCount}` : null,
            deposit_credit: 0,
            total_amount: splitTotal,
            amount_paid: 0,
            status: 'pending',
            guest_name: guestInfo?.guest_name || null,
            guest_phone: guestInfo?.guest_phone || null,
            guest_email: guestInfo?.guest_email || null,
            guest_user_id: guestInfo?.guest_user_id || null
          })
          .select()
          .single();

        if (error) throw error;
        invoices.push(data as SessionInvoice);
      }

      // Update session status to billing
      await supabase
        .from('table_sessions')
        .update({ status: 'billing' })
        .eq('id', sessionId);

      toast.success(`${splitCount} split invoices created`);
      return invoices;
    } catch (error) {
      console.error('Error generating split invoices:', error);
      toast.error('Failed to generate split invoices');
      return [];
    } finally {
      setIsGenerating(false);
    }
  };

  const updateInvoice = async (
    invoiceId: string, 
    updates: Partial<SessionInvoice>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('session_invoices')
        .update(updates)
        .eq('id', invoiceId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
      return false;
    }
  };

  const applyDiscount = async (
    invoiceId: string,
    discountAmount: number,
    discountReason: string
  ): Promise<boolean> => {
    try {
      const { data: invoice, error: fetchError } = await supabase
        .from('session_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (fetchError) throw fetchError;

      const newTotal = invoice.subtotal + invoice.tax_amount + invoice.service_charge 
        - discountAmount - invoice.deposit_credit;

      const { error } = await supabase
        .from('session_invoices')
        .update({
          discount_amount: discountAmount,
          discount_reason: discountReason,
          total_amount: newTotal
        })
        .eq('id', invoiceId);

      if (error) throw error;

      toast.success('Discount applied');
      return true;
    } catch (error) {
      console.error('Error applying discount:', error);
      toast.error('Failed to apply discount');
      return false;
    }
  };

  const voidInvoice = async (invoiceId: string, reason: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('session_invoices')
        .update({
          status: 'void',
          voided_at: new Date().toISOString(),
          void_reason: reason
        })
        .eq('id', invoiceId);

      if (error) throw error;

      toast.success('Invoice voided');
      return true;
    } catch (error) {
      console.error('Error voiding invoice:', error);
      toast.error('Failed to void invoice');
      return false;
    }
  };

  const getInvoiceBySession = async (sessionId: string): Promise<SessionInvoice | null> => {
    try {
      const { data, error } = await supabase
        .from('session_invoices')
        .select('*')
        .eq('session_id', sessionId)
        .neq('status', 'void')
        .maybeSingle();

      if (error) throw error;
      return data as SessionInvoice | null;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  };

  const getInvoicesBySession = async (sessionId: string): Promise<SessionInvoice[]> => {
    try {
      const { data, error } = await supabase
        .from('session_invoices')
        .select('*')
        .eq('session_id', sessionId)
        .neq('status', 'void')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as SessionInvoice[];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  };

  return {
    isGenerating,
    calculateTotals,
    generateInvoice,
    generateSplitInvoices,
    updateInvoice,
    applyDiscount,
    voidInvoice,
    getInvoiceBySession,
    getInvoicesBySession
  };
}
