import { CreditCard, Wallet, Building2, QrCode, Smartphone, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaymentMethodOption {
  id: string;
  type: string;
  label: string;
  sublabel?: string;
  card_last4?: string | null;
  card_brand?: string | null;
  is_default?: boolean;
}

const paymentMethodIcons: Record<string, React.ReactNode> = {
  gopay: <Wallet className="w-6 h-6 text-sky-500" />,
  bca: <Building2 className="w-6 h-6 text-blue-600" />,
  card: <CreditCard className="w-6 h-6 text-orange-500" />,
  apple_pay: <Smartphone className="w-6 h-6 text-foreground" />,
  google_pay: <Smartphone className="w-6 h-6 text-green-500" />,
  qris: <QrCode className="w-6 h-6 text-purple-500" />,
};

interface PaymentMethodCardProps {
  method: PaymentMethodOption;
  isSelected: boolean;
  onSelect: () => void;
}

export function PaymentMethodCard({ method, isSelected, onSelect }: PaymentMethodCardProps) {
  const icon = paymentMethodIcons[method.type] || <CreditCard className="w-6 h-6 text-muted-foreground" />;
  
  const displayName = method.type === 'card' && method.card_last4
    ? `${method.card_brand || 'Card'} •••• ${method.card_last4}`
    : method.label;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
        isSelected
          ? "border-primary bg-primary/10 ring-1 ring-primary/50"
          : "border-border/50 bg-card hover:border-primary/30 hover:bg-card/80"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        isSelected ? "bg-primary/20" : "bg-muted/50"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{displayName}</p>
        {method.sublabel && (
          <p className="text-xs text-muted-foreground">{method.sublabel}</p>
        )}
        {method.is_default && !method.sublabel && (
          <p className="text-xs text-primary">Default</p>
        )}
      </div>
      {isSelected && (
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
      )}
    </button>
  );
}

interface PaymentMethodSelectorProps {
  methods: PaymentMethodOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function PaymentMethodSelector({ 
  methods, 
  selectedId, 
  onSelect,
  className 
}: PaymentMethodSelectorProps) {
  if (methods.length === 0) {
    return (
      <div className={cn("p-6 rounded-xl bg-secondary/30 border border-border/50 text-center", className)}>
        <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No payment methods available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {methods.map((method) => (
        <PaymentMethodCard
          key={method.id}
          method={method}
          isSelected={selectedId === method.id}
          onSelect={() => onSelect(method.id)}
        />
      ))}
    </div>
  );
}
