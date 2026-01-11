import { useState, useEffect } from 'react';
import { X, Receipt, CreditCard, Banknote, Percent, Wallet, Check, DollarSign, Heart, Tag, Gift, Users, Minus, Plus, User, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableSession, SessionInvoice, SessionOrder, SessionOrderItem } from '@/hooks/useTableSessions';
import { useSessionInvoices, SplitGuestInfo } from '@/hooks/useSessionInvoices';
import { useSessionPayments, SessionPayment } from '@/hooks/useSessionPayments';
import { useVenuePOSSettings } from '@/hooks/useVenuePOSSettings';
import { useInvoiceEmail, prepareInvoiceEmailData } from '@/hooks/useInvoiceEmail';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaymentProcessDialog } from './PaymentProcessDialog';
import { SplitGuestAssignmentDialog, SplitGuest } from './SplitGuestAssignmentDialog';

interface BillingSheetProps {
  venueId: string;
  session: TableSession;
  open: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
}

interface AppliedPromo {
  id: string;
  code: string;
  title: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
}

const TIP_OPTIONS = [
  { label: 'No Tip', value: 0 },
  { label: '5%', value: 5 },
  { label: '10%', value: 10 },
  { label: '15%', value: 15 },
  { label: '20%', value: 20 },
];

const DISCOUNT_OPTIONS = [
  { label: 'No Discount', value: 0 },
  { label: '5%', value: 5 },
  { label: '10%', value: 10 },
  { label: '15%', value: 15 },
  { label: '20%', value: 20 },
];

export default function BillingSheet({
  venueId,
  session,
  open,
  onClose,
  onPaymentComplete
}: BillingSheetProps) {
  const { settings, isLoading: settingsLoading } = useVenuePOSSettings(venueId);
  const { generateInvoice, generateSplitInvoices, applyDiscount, isGenerating, getInvoiceBySession, getInvoicesBySession } = useSessionInvoices();
  const { processPayment, getPaymentsByInvoice, isProcessing } = useSessionPayments();
  const invoiceEmail = useInvoiceEmail();

  const [fullSession, setFullSession] = useState<TableSession | null>(null);
  const [invoice, setInvoice] = useState<SessionInvoice | null>(session.invoice || null);
  const [invoices, setInvoices] = useState<SessionInvoice[]>([]); // For split invoices
  const [payments, setPayments] = useState<SessionPayment[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [showGuestAssignmentDialog, setShowGuestAssignmentDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailType, setEmailType] = useState<'bill' | 'receipt'>('bill');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailRecipientName, setEmailRecipientName] = useState('');
  const [splitPayersCount, setSplitPayersCount] = useState(2);
  const [splitType, setSplitType] = useState<'payment' | 'invoice'>('payment'); // payment = one invoice, invoice = multiple invoices
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [currentPayerNumber, setCurrentPayerNumber] = useState(1);
  const [selectedInvoiceIndex, setSelectedInvoiceIndex] = useState(0); // For split invoice mode
  const [isLoading, setIsLoading] = useState(false);
  const [allOrderItems, setAllOrderItems] = useState<SessionOrderItem[]>([]);
  const [venueName, setVenueName] = useState('');
  
  // Calculated subtotal from orders
  const [calculatedSubtotal, setCalculatedSubtotal] = useState(0);
  
  // Deposit/credit state
  const [depositCredit, setDepositCredit] = useState(0);
  const [depositSource, setDepositSource] = useState<'booking' | 'package' | null>(null);

  // Tip state
  const [selectedTipPercent, setSelectedTipPercent] = useState<number>(0);
  const [customTipAmount, setCustomTipAmount] = useState('');
  const [isCustomTip, setIsCustomTip] = useState(false);

  // Discount state (inline section)
  const [selectedDiscountPercent, setSelectedDiscountPercent] = useState<number>(0);
  const [customDiscountAmount, setCustomDiscountAmount] = useState('');
  const [isCustomDiscount, setIsCustomDiscount] = useState(false);

  // Discount form (dialog for invoice)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  // Promo form
  const [promoCode, setPromoCode] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);

  // Fetch session with orders and invoice/payments on open
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('table_sessions')
          .select(`*, table:venue_tables(id, table_number, seats, location_zone)`)
          .eq('id', session.id)
          .single();

        if (sessionError) {
          console.error('Error fetching session:', sessionError);
          return;
        }

        const { data: ordersData, error: ordersError } = await supabase
          .from('session_orders')
          .select('*')
          .eq('session_id', session.id)
          .neq('status', 'cancelled')
          .order('order_number', { ascending: true });

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
        }

        const orderIds = (ordersData || []).map(o => o.id);
        let allItems: SessionOrderItem[] = [];
        
        if (orderIds.length > 0) {
          const { data: itemsData, error: itemsError } = await supabase
            .from('session_order_items')
            .select('*')
            .in('session_order_id', orderIds)
            .neq('status', 'cancelled');

          if (itemsError) {
            console.error('Error fetching order items:', itemsError);
          } else {
            allItems = (itemsData || []) as SessionOrderItem[];
          }
        }
        
        // Store items for email
        setAllOrderItems(allItems);

        // Calculate subtotal directly from items
        let subtotal = 0;
        allItems.forEach(item => {
          subtotal += item.quantity * item.unit_price;
        });
        setCalculatedSubtotal(subtotal);

        // Fetch paid deposits for linked booking or package
        let depositCreditAmount = 0;
        let depositSrc: 'booking' | 'package' | null = null;
        
        if (sessionData.booking_id) {
          const { data: bookingDeposit } = await supabase
            .from('booking_deposits')
            .select('amount')
            .eq('booking_id', sessionData.booking_id)
            .eq('status', 'paid')
            .maybeSingle();
          
          if (bookingDeposit) {
            depositCreditAmount = Number(bookingDeposit.amount);
            depositSrc = 'booking';
          }
        }
        
        if (sessionData.package_purchase_id && depositCreditAmount === 0) {
          const { data: packageDeposit } = await supabase
            .from('booking_deposits')
            .select('amount')
            .eq('package_purchase_id', sessionData.package_purchase_id)
            .eq('status', 'paid')
            .maybeSingle();
          
          if (packageDeposit) {
            depositCreditAmount = Number(packageDeposit.amount);
            depositSrc = 'package';
          }
        }
        
        setDepositCredit(depositCreditAmount);
        setDepositSource(depositSrc);

        const ordersWithItems: SessionOrder[] = (ordersData || []).map(order => ({
          ...order,
          items: allItems.filter(item => item.session_order_id === order.id)
        })) as SessionOrder[];

        // Fetch all invoices for this session
        const { data: allInvoicesData } = await supabase
          .from('session_invoices')
          .select('*')
          .eq('session_id', session.id)
          .neq('status', 'void')
          .order('created_at', { ascending: true });

        const allInvoices = (allInvoicesData || []) as SessionInvoice[];
        
        // Check if there are split invoices (invoice numbers containing "/")
        const splitInvoices = allInvoices.filter(inv => inv.invoice_number.includes('/'));
        
        // If split invoices exist, use those; otherwise use the first regular invoice
        let activeInvoices: SessionInvoice[];
        if (splitInvoices.length > 0) {
          activeInvoices = splitInvoices;
        } else {
          activeInvoices = allInvoices.slice(0, 1); // Just take the first one if any
        }

        const fullSessionData: TableSession = {
          ...sessionData,
          orders: ordersWithItems,
          invoice: activeInvoices[0] || null
        } as TableSession;

        setFullSession(fullSessionData);

        if (activeInvoices.length > 1) {
          // Multiple split invoices
          setInvoices(activeInvoices);
          setInvoice(activeInvoices[0]);
          setSelectedInvoiceIndex(0);
          setIsSplitMode(true);
          // Load payments for the first invoice
          const pmts = await getPaymentsByInvoice(activeInvoices[0].id);
          setPayments(pmts);
        } else if (activeInvoices.length === 1) {
          // Single invoice
          setInvoice(activeInvoices[0]);
          setInvoices([]);
          const pmts = await getPaymentsByInvoice(activeInvoices[0].id);
          setPayments(pmts);
        } else {
          setInvoice(null);
          setInvoices([]);
          setPayments([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      loadData();
      // Reset tip, discount, promo and deposit when opening
      setSelectedTipPercent(0);
      setCustomTipAmount('');
      setIsCustomTip(false);
      setSelectedDiscountPercent(0);
      setCustomDiscountAmount('');
      setIsCustomDiscount(false);
      setAppliedPromo(null);
      setCalculatedSubtotal(0);
      setDepositCredit(0);
      setDepositSource(null);
      // Reset split state - will be set by loadData if there are split invoices
      setSelectedInvoiceIndex(0);
    }
  }, [open, session.id]);

  // Use default rates if settings not loaded
  const taxRate = settings?.tax_rate ?? 10;
  const serviceChargeRate = settings?.service_charge_rate ?? 5;

  // Calculate preview totals directly
  const previewTotals = !invoice && calculatedSubtotal > 0
    ? {
        subtotal: calculatedSubtotal,
        taxAmount: calculatedSubtotal * (taxRate / 100),
        serviceCharge: calculatedSubtotal * (serviceChargeRate / 100)
      }
    : null;

  // Calculate tip amount
  const tipAmount = isCustomTip 
    ? parseFloat(customTipAmount) || 0 
    : (previewTotals?.subtotal || invoice?.subtotal || 0) * (selectedTipPercent / 100);

  // Calculate discount amount (inline section)
  const discountAmount = isCustomDiscount 
    ? parseFloat(customDiscountAmount) || 0 
    : (previewTotals?.subtotal || invoice?.subtotal || 0) * (selectedDiscountPercent / 100);

  const handleDiscountSelect = (percent: number) => {
    setSelectedDiscountPercent(percent);
    setIsCustomDiscount(false);
    setCustomDiscountAmount('');
  };

  const handleCustomDiscountChange = (value: string) => {
    setCustomDiscountAmount(value);
    setIsCustomDiscount(true);
    setSelectedDiscountPercent(0);
  };

  const handleGenerateInvoice = async () => {
    // Calculate total discount including promo and inline discount
    let totalDiscount = discountAmount;
    let discountReasonText = '';
    
    if (discountAmount > 0) {
      discountReasonText = isCustomDiscount 
        ? `Custom discount: ${discountAmount.toLocaleString()}`
        : `${selectedDiscountPercent}% discount`;
    }
    
    if (appliedPromo) {
      totalDiscount += appliedPromo.discountAmount;
      discountReasonText = discountReasonText 
        ? `${discountReasonText} + Promo: ${appliedPromo.code}`
        : `Promo: ${appliedPromo.code}`;
    }

    const newInvoice = await generateInvoice({
      sessionId: session.id,
      taxRate: taxRate,
      serviceChargeRate: serviceChargeRate,
      discountAmount: totalDiscount,
      discountReason: discountReasonText || undefined,
      depositCredit: depositCredit
    });

    if (newInvoice) {
      setInvoice(newInvoice);
      onPaymentComplete();
    }
  };

  const handleApplyDiscount = async () => {
    if (!invoice || !discountValue) return;

    const value = parseFloat(discountValue);
    let finalDiscount = value;

    if (discountType === 'percentage') {
      finalDiscount = invoice.subtotal * (value / 100);
    }

    const success = await applyDiscount(
      invoice.id,
      finalDiscount,
      discountReason || (discountType === 'percentage' ? `${value}% discount` : 'Fixed discount')
    );

    if (success) {
      const updated = await getInvoiceBySession(session.id);
      if (updated) setInvoice(updated);
      setShowDiscountDialog(false);
      setDiscountValue('');
      setDiscountReason('');
    }
  };

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    setIsValidatingPromo(true);
    try {
      const { data: promo, error } = await supabase
        .from('promos')
        .select('*')
        .eq('promo_code', promoCode.toUpperCase())
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;

      if (!promo) {
        toast.error('Invalid or expired promo code');
        return;
      }

      // Check redemption limits
      if (promo.max_redemptions && promo.current_redemptions >= promo.max_redemptions) {
        toast.error('Promo code has reached its redemption limit');
        return;
      }

      // Calculate discount amount
      const subtotal = previewTotals?.subtotal || invoice?.subtotal || 0;
      let discountAmount = 0;

      if (promo.discount_type === 'percentage') {
        discountAmount = subtotal * ((promo.discount_value || 0) / 100);
      } else {
        discountAmount = promo.discount_value || 0;
      }

      setAppliedPromo({
        id: promo.id,
        code: promo.promo_code || promoCode.toUpperCase(),
        title: promo.title,
        discountType: promo.discount_type as 'percentage' | 'fixed',
        discountValue: promo.discount_value || 0,
        discountAmount
      });

      setShowPromoDialog(false);
      setPromoCode('');
      toast.success(`Promo "${promo.title}" applied!`);
    } catch (error) {
      console.error('Error validating promo:', error);
      toast.error('Failed to validate promo code');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    toast.success('Promo removed');
  };

  const handleProcessPayment = async (method: string, amount: number, reference: string) => {
    if (!invoice) return;

    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid payment amount');
      throw new Error('Invalid payment amount');
    }

    const payment = await processPayment({
      invoice_id: invoice.id,
      session_id: session.id,
      payment_method: method,
      amount: amount,
      reference_number: reference || undefined
    });

    if (payment) {
      const updatedPayments = [...payments, payment];
      setPayments(updatedPayments);
      
      // For split invoices, refresh all invoices
      if (invoices.length > 1) {
        const updatedInvoices = await getInvoicesBySession(session.id);
        setInvoices(updatedInvoices);
        
        // Update current invoice
        const currentUpdated = updatedInvoices.find(i => i.id === invoice.id);
        if (currentUpdated) setInvoice(currentUpdated);
        
        // Auto-select next unpaid invoice
        const nextUnpaid = updatedInvoices.findIndex(i => i.status !== 'paid');
        if (nextUnpaid >= 0 && currentUpdated?.status === 'paid') {
          setSelectedInvoiceIndex(nextUnpaid);
          setInvoice(updatedInvoices[nextUnpaid]);
        }
      } else {
        const updated = await getInvoiceBySession(session.id);
        if (updated) setInvoice(updated);
      }
      
      onPaymentComplete();

      // Handle split payment mode progression (not split invoice mode)
      if (isSplitMode && invoices.length <= 1) {
        const updated = await getInvoiceBySession(session.id);
        if (currentPayerNumber < splitPayersCount && updated && updated.status !== 'paid') {
          // More payers needed - increment and reopen dialog
          setCurrentPayerNumber(prev => prev + 1);
          setTimeout(() => setShowPaymentDialog(true), 500);
        } else {
          // All paid or invoice complete - reset split mode
          setIsSplitMode(false);
          setCurrentPayerNumber(1);
        }
      }
    } else {
      throw new Error('Payment failed');
    }
  };

  const handlePayFull = () => {
    if (!invoice) return;
    // Reset split payment mode when paying full (but keep split invoice mode)
    if (invoices.length <= 1) {
      setIsSplitMode(false);
      setCurrentPayerNumber(1);
      setSplitPayersCount(1);
    }
    setShowPaymentDialog(true);
  };

  const handleTipSelect = (percent: number) => {
    setSelectedTipPercent(percent);
    setIsCustomTip(false);
    setCustomTipAmount('');
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTipAmount(value);
    setIsCustomTip(true);
    setSelectedTipPercent(0);
  };

  const handleOpenEmailDialog = (type: 'bill' | 'receipt', inv?: SessionInvoice) => {
    const targetInvoice = inv || invoice;
    if (!targetInvoice) return;
    
    setEmailType(type);
    setEmailRecipient((targetInvoice as any).guest_email || '');
    setEmailRecipientName((targetInvoice as any).guest_name || '');
    setShowEmailDialog(true);
  };

  const handleSendEmail = async () => {
    if (!invoice || !emailRecipient) {
      toast.error('Please enter recipient email');
      return;
    }

    const tableName = fullSession?.table?.table_number 
      ? `Table ${fullSession.table.table_number}` 
      : 'Walk-in';

    const emailData = prepareInvoiceEmailData(
      invoice,
      allOrderItems,
      'Venue', // Will use actual venue name if fetched
      tableName
    );

    await invoiceEmail.mutateAsync({
      ...emailData,
      type: emailType,
      recipientEmail: emailRecipient,
      recipientName: emailRecipientName || undefined,
      invoiceId: invoice.id
    });

    setShowEmailDialog(false);
  };

  const balanceDue = invoice ? invoice.total_amount - invoice.amount_paid : 0;
  const displaySession = fullSession || session;

  // Calculate grand total with tip, discount, promo and deposit credit
  const grandTotalPreview = previewTotals 
    ? previewTotals.subtotal + previewTotals.taxAmount + previewTotals.serviceCharge + tipAmount - discountAmount - (appliedPromo?.discountAmount || 0) - depositCredit
    : 0;

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Bill
              </span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-160px)]">
            <div className="p-4 space-y-4">
              {/* Session Info */}
              <Card className="p-3 bg-muted/50">
                <div className="flex items-center justify-between text-sm">
                  <span>{displaySession.table?.table_number || 'Walk-in'}</span>
                  <span className="text-muted-foreground">{displaySession.guest_count} guests</span>
                </div>
                {displaySession.guest_name && (
                  <div className="text-sm text-muted-foreground">{displaySession.guest_name}</div>
                )}
              </Card>

              {!invoice ? (
                /* Preview / Generate Invoice */
                <div className="space-y-4">
                  {/* Deposit Credit Notice */}
                  {depositCredit > 0 && (
                    <Card className="p-3 bg-blue-500/10 border-blue-500/30">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Wallet className="w-4 h-4" />
                        <div>
                          <div className="font-medium text-sm">
                            {depositSource === 'package' ? 'Package Deposit' : 'Booking Deposit'} Applied
                          </div>
                          <div className="text-xs text-blue-400/70">
                            {depositCredit.toLocaleString()} IDR will be credited to this bill
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                  
                  <Card className="p-4 space-y-3">
                    <h3 className="font-semibold">Bill Preview</h3>
                    
                    {isLoading ? (
                      <div className="text-sm text-muted-foreground">Loading order data...</div>
                    ) : previewTotals ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Subtotal</span>
                          <span>{previewTotals.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Tax ({taxRate}%)</span>
                          <span>{previewTotals.taxAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Service ({serviceChargeRate}%)</span>
                          <span>{previewTotals.serviceCharge.toLocaleString()}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-sm text-orange-400">
                            <span className="flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              Discount
                            </span>
                            <span>-{discountAmount.toLocaleString()}</span>
                          </div>
                        )}
                        {appliedPromo && (
                          <div className="flex justify-between text-sm text-emerald-400">
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {appliedPromo.code}
                            </span>
                            <span>-{appliedPromo.discountAmount.toLocaleString()}</span>
                          </div>
                        )}
                        {depositCredit > 0 && (
                          <div className="flex justify-between text-sm text-blue-400">
                            <span className="flex items-center gap-1">
                              <Wallet className="w-3 h-3" />
                              {depositSource === 'package' ? 'Package Deposit' : 'Booking Deposit'}
                            </span>
                            <span>-{depositCredit.toLocaleString()}</span>
                          </div>
                        )}
                        {tipAmount > 0 && (
                          <div className="flex justify-between text-sm text-pink-400">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              Tip
                            </span>
                            <span>+{tipAmount.toLocaleString()}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span>{grandTotalPreview.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">No items to bill</div>
                    )}
                  </Card>

                  {/* Tip Section */}
                  {previewTotals && previewTotals.subtotal > 0 && (
                    <Card className="p-4 space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-400" />
                        Add Tip
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {TIP_OPTIONS.map(option => (
                          <Button
                            key={option.value}
                            variant={selectedTipPercent === option.value && !isCustomTip ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleTipSelect(option.value)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Custom:</span>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={customTipAmount}
                          onChange={(e) => handleCustomTipChange(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </Card>
                  )}

                  {/* Discount Section */}
                  {previewTotals && previewTotals.subtotal > 0 && (
                    <Card className="p-4 space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Percent className="w-4 h-4 text-orange-400" />
                        Add Discount
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {DISCOUNT_OPTIONS.map(option => (
                          <Button
                            key={option.value}
                            variant={selectedDiscountPercent === option.value && !isCustomDiscount ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleDiscountSelect(option.value)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Custom:</span>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={customDiscountAmount}
                          onChange={(e) => handleCustomDiscountChange(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </Card>
                  )}

                  {previewTotals && previewTotals.subtotal > 0 && (
                    <Card className="p-4 space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Gift className="w-4 h-4 text-primary" />
                        Promo Code
                      </h4>
                      {appliedPromo ? (
                        <div className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                          <div>
                            <div className="text-sm font-medium text-emerald-400">{appliedPromo.code}</div>
                            <div className="text-xs text-muted-foreground">{appliedPromo.title}</div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={handleRemovePromo}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setShowPromoDialog(true)}
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          Apply Promo Code
                        </Button>
                      )}
                    </Card>
                  )}

                  {/* Invoice Generation Options */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={handleGenerateInvoice}
                      disabled={isGenerating || isLoading || !previewTotals || previewTotals.subtotal === 0}
                      size="lg"
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      {isGenerating ? 'Generating...' : 'Single Invoice'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowSplitDialog(true)}
                      disabled={isGenerating || isLoading || !previewTotals || previewTotals.subtotal === 0}
                      size="lg"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Split Invoice
                    </Button>
                  </div>
                </div>
              ) : (
                /* Invoice Details */
                <>
                  {/* Split Invoice Tabs */}
                  {invoices.length > 1 && (
                    <Card className="p-2">
                      <div className="flex gap-1 overflow-x-auto">
                        {invoices.map((inv, idx) => (
                          <Button
                            key={inv.id}
                            variant={selectedInvoiceIndex === idx ? 'default' : 'outline'}
                            size="sm"
                            className="shrink-0 h-auto py-2 flex-col gap-0.5"
                            onClick={async () => {
                              setSelectedInvoiceIndex(idx);
                              setInvoice(inv);
                              // Load payments for this invoice
                              const pmts = await getPaymentsByInvoice(inv.id);
                              setPayments(pmts);
                            }}
                          >
                            <div className="flex items-center gap-1">
                              {inv.status === 'paid' ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <User className="w-3 h-3 opacity-60" />
                              )}
                              <span className="text-xs truncate max-w-[60px]">
                                {(inv as any).guest_name?.split(' ')[0] || `#${idx + 1}`}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {inv.total_amount.toLocaleString()}
                            </span>
                          </Button>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-center text-muted-foreground">
                        {invoices.filter(i => i.status === 'paid').length} of {invoices.length} paid
                      </div>
                    </Card>
                  )}

                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{invoice.invoice_number}</h3>
                        {(invoice as any).guest_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <User className="w-3 h-3" />
                            {(invoice as any).guest_name}
                            {(invoice as any).guest_user_id && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">App</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge 
                        variant="outline"
                        className={
                          invoice.status === 'paid' ? 'text-emerald-400 border-emerald-400/50' :
                          invoice.status === 'partially_paid' ? 'text-amber-400 border-amber-400/50' :
                          ''
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{invoice.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax</span>
                        <span>{invoice.tax_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Service Charge</span>
                        <span>{invoice.service_charge.toLocaleString()}</span>
                      </div>
                      {invoice.discount_amount > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Discount</span>
                          <span>-{invoice.discount_amount.toLocaleString()}</span>
                        </div>
                      )}
                      {invoice.deposit_credit > 0 && (
                        <div className="flex justify-between text-blue-400">
                          <span>Deposit Credit</span>
                          <span>-{invoice.deposit_credit.toLocaleString()}</span>
                        </div>
                      )}
                      {tipAmount > 0 && invoices.length <= 1 && (
                        <div className="flex justify-between text-pink-400">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            Tip
                          </span>
                          <span>+{tipAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{(invoices.length > 1 ? invoice.total_amount : invoice.total_amount + tipAmount).toLocaleString()}</span>
                      </div>
                      {invoice.amount_paid > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Paid</span>
                          <span>-{invoice.amount_paid.toLocaleString()}</span>
                        </div>
                      )}
                      {(invoice.total_amount - invoice.amount_paid) > 0 && (
                        <div className="flex justify-between font-bold text-primary">
                          <span>Balance Due</span>
                          <span>{(invoices.length > 1 ? invoice.total_amount - invoice.amount_paid : balanceDue + tipAmount).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Tip Section for Invoice */}
                  {invoice.status !== 'paid' && (
                    <Card className="p-4 space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-400" />
                        Add Tip
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {TIP_OPTIONS.map(option => (
                          <Button
                            key={option.value}
                            variant={selectedTipPercent === option.value && !isCustomTip ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleTipSelect(option.value)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Custom:</span>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={customTipAmount}
                          onChange={(e) => handleCustomTipChange(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      {tipAmount > 0 && (
                        <div className="text-sm text-pink-400 text-right">
                          Tip: +{tipAmount.toLocaleString()}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Payments List */}
                  {payments.length > 0 && (
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Payments</h4>
                        {isSplitMode && invoice?.status !== 'paid' && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {payments.length} of {splitPayersCount} paid
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        {payments.map((pmt, idx) => (
                          <div key={pmt.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {isSplitMode && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  {idx + 1}
                                </Badge>
                              )}
                              {pmt.payment_method === 'cash' && <Banknote className="w-4 h-4" />}
                              {pmt.payment_method === 'card' && <CreditCard className="w-4 h-4" />}
                              {!['cash', 'card'].includes(pmt.payment_method) && <Wallet className="w-4 h-4" />}
                              <span className="capitalize">{pmt.payment_method}</span>
                            </div>
                            <span>{pmt.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      {isSplitMode && invoice?.status !== 'paid' && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <Button 
                            onClick={() => setShowPaymentDialog(true)} 
                            className="w-full" 
                            size="sm"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Collect Payment {currentPayerNumber} of {splitPayersCount}
                          </Button>
                        </div>
                      )}
                    </Card>
                  )}

                  {invoice.status !== 'paid' && (
                    <div className="space-y-2">
                      <Button onClick={handlePayFull} className="w-full" size="lg">
                        <DollarSign className="w-4 h-4 mr-2" />
                        {invoices.length > 1 
                          ? `Pay Invoice #${selectedInvoiceIndex + 1} (${(invoice.total_amount - invoice.amount_paid).toLocaleString()})`
                          : `Pay Full (${(balanceDue + tipAmount).toLocaleString()})`
                        }
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleOpenEmailDialog('bill')}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Send Bill to Guest
                      </Button>
                      {invoices.length <= 1 && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline"
                            onClick={() => setShowDiscountDialog(true)}
                          >
                            <Percent className="w-4 h-4 mr-1" />
                            Discount
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => setShowPromoDialog(true)}
                          >
                            <Tag className="w-4 h-4 mr-1" />
                            Promo
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {invoice.status === 'paid' && invoices.length <= 1 && (
                    <div className="space-y-2">
                      <Card className="p-4 bg-emerald-500/10 border-emerald-500/30 text-center">
                        <Check className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                        <div className="font-semibold text-emerald-400">Payment Complete</div>
                      </Card>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleOpenEmailDialog('receipt')}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Receipt to Guest
                      </Button>
                    </div>
                  )}

                  {invoices.length > 1 && invoices.every(i => i.status === 'paid') && (
                    <div className="space-y-2">
                      <Card className="p-4 bg-emerald-500/10 border-emerald-500/30 text-center">
                        <Check className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                        <div className="font-semibold text-emerald-400">All Invoices Paid</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {invoices.length} invoices totaling {invoices.reduce((sum, i) => sum + i.total_amount, 0).toLocaleString()}
                        </p>
                      </Card>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleOpenEmailDialog('receipt')}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Receipt to Guest
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <PaymentProcessDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        balanceDue={invoices.length > 1 ? invoice?.total_amount ?? 0 : balanceDue}
        tipAmount={invoices.length > 1 ? 0 : tipAmount}
        onConfirm={handleProcessPayment}
        isProcessing={isProcessing}
        splitPayersCount={isSplitMode && invoices.length <= 1 ? splitPayersCount : 1}
        currentPayerNumber={isSplitMode && invoices.length <= 1 ? currentPayerNumber : (invoices.length > 1 ? selectedInvoiceIndex + 1 : undefined)}
      />

      {/* Discount Dialog */}
      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'percentage' | 'fixed')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}</Label>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? 'e.g., 10' : 'Enter amount...'}
              />
              {discountType === 'percentage' && (
                <div className="flex gap-2">
                  {[5, 10, 15, 20, 25].map(pct => (
                    <Button 
                      key={pct}
                      variant="outline" 
                      size="sm"
                      onClick={() => setDiscountValue(pct.toString())}
                    >
                      {pct}%
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={discountReason} onValueChange={setDiscountReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIP Guest">VIP Guest</SelectItem>
                  <SelectItem value="Complaint Resolution">Complaint Resolution</SelectItem>
                  <SelectItem value="Staff Meal">Staff Meal</SelectItem>
                  <SelectItem value="Manager Comp">Manager Comp</SelectItem>
                  <SelectItem value="Birthday/Anniversary">Birthday/Anniversary</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscountDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyDiscount}>
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promo Dialog */}
      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Promo Code</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Promo Code</Label>
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter promo code..."
                className="uppercase"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleValidatePromo} disabled={isValidatingPromo}>
              {isValidatingPromo ? 'Validating...' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Bill Dialog */}
      <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Split Bill</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-5">
            {/* Split Type Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Split Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={splitType === 'payment' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSplitType('payment')}
                  className="h-auto py-3 flex-col gap-1"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs">Split Payment</span>
                  <span className="text-[10px] text-muted-foreground">1 invoice</span>
                </Button>
                <Button
                  variant={splitType === 'invoice' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSplitType('invoice')}
                  className="h-auto py-3 flex-col gap-1"
                >
                  <Receipt className="w-4 h-4" />
                  <span className="text-xs">Split Invoice</span>
                  <span className="text-[10px] text-muted-foreground">{splitPayersCount} invoices</span>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Number of Splits */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {splitType === 'invoice' ? 'How many invoices?' : 'How many people are splitting?'}
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={() => setSplitPayersCount(Math.max(2, splitPayersCount - 1))}
                  disabled={splitPayersCount <= 2}
                >
                  <Minus className="w-5 h-5" />
                </Button>
                <div className="w-20 text-center">
                  <div className="text-4xl font-bold">{splitPayersCount}</div>
                  <div className="text-xs text-muted-foreground">
                    {splitType === 'invoice' ? 'invoices' : 'people'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={() => setSplitPayersCount(Math.min(10, splitPayersCount + 1))}
                  disabled={splitPayersCount >= 10}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {splitType === 'invoice' ? 'Each invoice amount' : 'Each person pays'}
              </p>
              <div className="text-2xl font-bold text-primary">
                IDR {Math.ceil((invoice ? (balanceDue + tipAmount) : grandTotalPreview) / splitPayersCount).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: IDR {(invoice ? (balanceDue + tipAmount) : grandTotalPreview).toLocaleString()}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSplitDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (splitType === 'invoice') {
                  // Open guest assignment dialog for split invoices
                  setShowSplitDialog(false);
                  setShowGuestAssignmentDialog(true);
                } else {
                  // Split payment mode - one invoice, multiple payments
                  setIsSplitMode(true);
                  setCurrentPayerNumber(1);
                  setShowSplitDialog(false);
                  setShowPaymentDialog(true);
                }
              }} 
              className="flex-1"
              disabled={isGenerating}
            >
              {splitType === 'invoice' ? <Users className="w-4 h-4 mr-2" /> : <Users className="w-4 h-4 mr-2" />}
              {splitType === 'invoice' ? 'Assign Guests' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Guest Assignment Dialog */}
      <SplitGuestAssignmentDialog
        open={showGuestAssignmentDialog}
        onClose={() => setShowGuestAssignmentDialog(false)}
        splitCount={splitPayersCount}
        isGenerating={isGenerating}
        venueId={venueId}
        onConfirm={async (guests: SplitGuest[]) => {
          // Convert SplitGuest to SplitGuestInfo
          const guestInfos: SplitGuestInfo[] = guests.map(g => ({
            guest_name: g.guest_name,
            guest_phone: g.guest_phone,
            guest_email: g.guest_email,
            guest_user_id: g.guest_user_id
          }));

          const splitInvoices = await generateSplitInvoices(
            session.id,
            splitPayersCount,
            taxRate,
            serviceChargeRate,
            discountAmount + (appliedPromo?.discountAmount || 0),
            tipAmount,
            guestInfos
          );

          if (splitInvoices.length > 0) {
            setInvoices(splitInvoices);
            setInvoice(splitInvoices[0]);
            setSelectedInvoiceIndex(0);
            setIsSplitMode(true);
            setShowGuestAssignmentDialog(false);
          }
        }}
      />

      {/* Send Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send {emailType === 'receipt' ? 'Receipt' : 'Bill'} to Guest
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Guest Name (optional)</Label>
              <Input
                value={emailRecipientName}
                onChange={(e) => setEmailRecipientName(e.target.value)}
                placeholder="Enter guest name..."
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="guest@example.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={!emailRecipient || invoiceEmail.isPending}
            >
              {invoiceEmail.isPending ? 'Sending...' : `Send ${emailType === 'receipt' ? 'Receipt' : 'Bill'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
