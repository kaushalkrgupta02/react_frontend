import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Banknote,
  CreditCard,
  Wallet,
  QrCode,
  Building2,
  Smartphone,
  Check,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  Receipt,
  Calculator,
  Users,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentMethodType = 'cash' | 'card' | 'transfer' | 'gopay' | 'ovo' | 'dana' | 'qris';

interface PaymentMethod {
  id: PaymentMethodType;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'cash',
    label: 'Cash',
    icon: <Banknote className="w-6 h-6" />,
    color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
    description: 'Physical currency',
  },
  {
    id: 'card',
    label: 'Card',
    icon: <CreditCard className="w-6 h-6" />,
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    description: 'Credit or Debit',
  },
  {
    id: 'qris',
    label: 'QRIS',
    icon: <QrCode className="w-6 h-6" />,
    color: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
    description: 'Scan to pay',
  },
  {
    id: 'transfer',
    label: 'Transfer',
    icon: <Building2 className="w-6 h-6" />,
    color: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
    description: 'Bank transfer',
  },
  {
    id: 'gopay',
    label: 'GoPay',
    icon: <Smartphone className="w-6 h-6" />,
    color: 'text-green-400 bg-green-500/20 border-green-500/30',
    description: 'E-wallet',
  },
  {
    id: 'ovo',
    label: 'OVO',
    icon: <Wallet className="w-6 h-6" />,
    color: 'text-violet-400 bg-violet-500/20 border-violet-500/30',
    description: 'E-wallet',
  },
  {
    id: 'dana',
    label: 'DANA',
    icon: <Wallet className="w-6 h-6" />,
    color: 'text-sky-400 bg-sky-500/20 border-sky-500/30',
    description: 'E-wallet',
  },
];

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

interface PaymentProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceDue: number;
  tipAmount: number;
  onConfirm: (method: string, amount: number, reference: string) => Promise<void>;
  isProcessing: boolean;
  splitPayersCount?: number;
  currentPayerNumber?: number;
}

export function PaymentProcessDialog({
  open,
  onOpenChange,
  balanceDue,
  tipAmount,
  onConfirm,
  isProcessing,
  splitPayersCount = 1,
  currentPayerNumber,
}: PaymentProcessDialogProps) {
  const [step, setStep] = useState<'method' | 'amount' | 'confirm'>('method');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const totalDue = balanceDue + tipAmount;
  const splitAmount = Math.ceil(totalDue / splitPayersCount);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('method');
      setSelectedMethod(null);
      setAmount('');
      setReference('');
      setCashReceived('');
      setShowSuccess(false);
    }
  }, [open]);

  const isSplitMode = splitPayersCount > 1 && currentPayerNumber !== undefined;

  const handleMethodSelect = (method: PaymentMethodType) => {
    setSelectedMethod(method);
    // Default to split amount if in split mode, otherwise full amount
    setAmount(isSplitMode ? splitAmount.toString() : totalDue.toString());
    setStep('amount');
  };

  const handleBack = () => {
    if (step === 'amount') {
      setStep('method');
      setSelectedMethod(null);
    } else if (step === 'confirm') {
      setStep('amount');
    }
  };

  const handleAmountContinue = () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return;
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!selectedMethod) return;
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return;
    
    try {
      await onConfirm(selectedMethod, numAmount, reference);
      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      // Error handling is done in parent
    }
  };

  const selectedMethodData = PAYMENT_METHODS.find(m => m.id === selectedMethod);
  const numAmount = parseFloat(amount) || 0;
  const numCashReceived = parseFloat(cashReceived) || 0;
  const changeAmount = selectedMethod === 'cash' ? numCashReceived - numAmount : 0;

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            {step !== 'method' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleBack}
                disabled={isProcessing}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="flex-1">
              <DialogTitle className="text-lg">
                {isSplitMode && (
                  <span className="text-primary">Payment {currentPayerNumber} of {splitPayersCount} · </span>
                )}
                {step === 'method' && 'Select Method'}
                {step === 'amount' && 'Enter Amount'}
                {step === 'confirm' && 'Confirm'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {isSplitMode ? (
                  <Badge variant="outline" className="text-xs font-normal bg-primary/10 border-primary/30">
                    <Users className="w-3 h-3 mr-1" />
                    Split: IDR {formatAmount(splitAmount)} each
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs font-normal">
                    Balance: IDR {formatAmount(totalDue)}
                  </Badge>
                )}
                {tipAmount > 0 && (
                  <Badge variant="outline" className="text-xs font-normal text-pink-400 border-pink-500/30">
                    <Heart className="w-3 h-3 mr-1" />
                    Tip: {formatAmount(tipAmount)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Success State */}
        {showSuccess && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-emerald-400 mb-2">Payment Successful</h3>
            <p className="text-muted-foreground">
              IDR {formatAmount(numAmount)} via {selectedMethodData?.label}
            </p>
          </div>
        )}

        {/* Step 1: Method Selection */}
        {!showSuccess && step === 'method' && (
          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleMethodSelect(method.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                    "hover:bg-card/80 hover:border-primary/30",
                    "border-border/50 bg-card/50"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center border",
                    method.color
                  )}>
                    {method.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{method.label}</p>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Step 2: Amount Entry */}
        {!showSuccess && step === 'amount' && selectedMethodData && (
          <div className="p-4 space-y-4">
            {/* Selected Method Badge */}
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-xl border",
              selectedMethodData.color
            )}>
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                selectedMethodData.color
              )}>
                {selectedMethodData.icon}
              </div>
              <div>
                <p className="font-medium">{selectedMethodData.label}</p>
                <p className="text-xs opacity-80">{selectedMethodData.description}</p>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Payment Amount</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  IDR
                </span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="pl-12 text-2xl font-semibold h-14 text-right"
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                = IDR {formatAmount(numAmount)}
              </p>
            </div>

            {/* Quick Amount Buttons */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Quick Amount</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={numAmount === totalDue ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAmount(totalDue.toString())}
                  className="h-10"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Full ({formatAmount(totalDue)})
                </Button>
                <Button
                  variant={numAmount === splitAmount ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAmount(splitAmount.toString())}
                  className="h-10"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Split ({formatAmount(splitAmount)})
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((qa) => (
                  <Button
                    key={qa}
                    variant="ghost"
                    size="sm"
                    onClick={() => setAmount((numAmount + qa).toString())}
                    className="text-xs h-8 bg-secondary/50"
                  >
                    +{formatAmount(qa)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Cash Received (for cash payments) */}
            {selectedMethod === 'cash' && (
              <div className="space-y-2 pt-2">
                <Label className="text-muted-foreground">Cash Received</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    IDR
                  </span>
                  <Input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0"
                    className="pl-12 h-12 text-right text-lg"
                  />
                </div>
                {numCashReceived > 0 && (
                  <div className={cn(
                    "p-3 rounded-lg flex items-center justify-between",
                    changeAmount >= 0 
                      ? "bg-emerald-500/10 border border-emerald-500/30" 
                      : "bg-destructive/10 border border-destructive/30"
                  )}>
                    <span className="text-sm font-medium">
                      {changeAmount >= 0 ? 'Change' : 'Short'}
                    </span>
                    <span className={cn(
                      "font-bold",
                      changeAmount >= 0 ? "text-emerald-400" : "text-destructive"
                    )}>
                      IDR {formatAmount(Math.abs(changeAmount))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Reference */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Reference # (Optional)</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction reference, receipt number..."
                className="h-10"
              />
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleAmountContinue}
              className="w-full h-12 text-base"
              disabled={numAmount <= 0}
            >
              Continue to Confirm
            </Button>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {!showSuccess && step === 'confirm' && selectedMethodData && (
          <div className="p-4 space-y-4">
            {/* Summary Card */}
            <Card className="p-4 bg-secondary/30">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center border",
                  selectedMethodData.color
                )}>
                  {selectedMethodData.icon}
                </div>
                <div>
                  <p className="font-semibold text-lg">{selectedMethodData.label}</p>
                  <p className="text-sm text-muted-foreground">{selectedMethodData.description}</p>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Amount</span>
                  <span className="font-medium">IDR {formatAmount(numAmount)}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Heart className="w-3 h-3 text-pink-400" /> Includes Tip
                    </span>
                    <span className="text-pink-400">IDR {formatAmount(tipAmount)}</span>
                  </div>
                )}
                {selectedMethod === 'cash' && numCashReceived > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cash Received</span>
                      <span>IDR {formatAmount(numCashReceived)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-emerald-400">Change</span>
                      <span className="text-emerald-400">IDR {formatAmount(changeAmount)}</span>
                    </div>
                  </>
                )}
                {reference && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-xs">{reference}</span>
                  </div>
                )}
              </div>

              <Separator className="my-3" />

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total to Record</span>
                <span className="text-2xl font-bold text-primary">
                  IDR {formatAmount(numAmount)}
                </span>
              </div>
            </Card>

            {/* Remaining Balance */}
            {numAmount < totalDue && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-400">Partial Payment</p>
                  <p className="text-amber-200/80">
                    Remaining: IDR {formatAmount(totalDue - numAmount)}
                  </p>
                </div>
              </div>
            )}

            {/* Confirm Button */}
            <Button
              onClick={handleConfirm}
              className="w-full h-14 text-lg"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
