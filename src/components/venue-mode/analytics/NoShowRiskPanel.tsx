import { AlertTriangle, Phone, MessageCircle, CreditCard, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface NoShowRiskBooking {
  bookingId: string;
  bookingRef: string;
  partySize: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  riskFactors: string[];
  suggestedAction: string;
}

interface NoShowRiskPanelProps {
  bookings: NoShowRiskBooking[];
  isLoading?: boolean;
  onSendReminder?: (bookingId: string) => void;
  onRequestDeposit?: (bookingId: string) => void;
}

export default function NoShowRiskPanel({ 
  bookings, 
  isLoading,
  onSendReminder,
  onRequestDeposit,
}: NoShowRiskPanelProps) {
  const highRiskBookings = bookings.filter(b => b.riskLevel === 'high');
  const mediumRiskBookings = bookings.filter(b => b.riskLevel === 'medium');
  const lowRiskBookings = bookings.filter(b => b.riskLevel === 'low');

  const handleSendReminder = (bookingId: string) => {
    if (onSendReminder) {
      onSendReminder(bookingId);
    } else {
      toast.success('Reminder sent via WhatsApp');
    }
  };

  const handleRequestDeposit = (bookingId: string) => {
    if (onRequestDeposit) {
      onRequestDeposit(bookingId);
    } else {
      toast.success('Deposit request sent');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border animate-pulse">
        <div className="h-5 w-40 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-foreground">No-Show Risk Analysis</span>
        </div>
        <div className="text-center py-6">
          <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No bookings to analyze today</p>
        </div>
      </div>
    );
  }

  const getRiskColor = (level: NoShowRiskBooking['riskLevel']) => {
    switch (level) {
      case 'high': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'medium': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'low': return 'bg-green-500/10 border-green-500/30 text-green-400';
    }
  };

  const getRiskBadgeColor = (level: NoShowRiskBooking['riskLevel']) => {
    switch (level) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      case 'low': return 'bg-green-500 text-white';
    }
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-foreground">No-Show Risk Analysis</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {highRiskBookings.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full">
              {highRiskBookings.length} high
            </span>
          )}
          {mediumRiskBookings.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full">
              {mediumRiskBookings.length} medium
            </span>
          )}
        </div>
      </div>

      {/* High Risk Bookings */}
      {highRiskBookings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-red-400 font-medium">⚠️ Requires Attention</p>
          {highRiskBookings.map((booking) => (
            <div
              key={booking.bookingId}
              className={`p-3 rounded-lg border ${getRiskColor(booking.riskLevel)}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{booking.bookingRef}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded ${getRiskBadgeColor(booking.riskLevel)}`}>
                      {booking.riskScore}% risk
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{booking.partySize} guests</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {booking.riskFactors.map((factor, i) => (
                  <span key={i} className="px-2 py-0.5 bg-secondary text-xs text-muted-foreground rounded">
                    {factor}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => handleSendReminder(booking.bookingId)}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => handleRequestDeposit(booking.bookingId)}
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  Deposit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Medium Risk Bookings */}
      {mediumRiskBookings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-amber-400 font-medium">📋 Monitor</p>
          {mediumRiskBookings.slice(0, 3).map((booking) => (
            <div
              key={booking.bookingId}
              className={`p-3 rounded-lg border ${getRiskColor(booking.riskLevel)}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{booking.bookingRef}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded ${getRiskBadgeColor(booking.riskLevel)}`}>
                      {booking.riskScore}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {booking.partySize} guests • {booking.riskFactors[0]}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-amber-400 hover:bg-amber-500/10"
                  onClick={() => handleSendReminder(booking.bookingId)}
                >
                  <Phone className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          {mediumRiskBookings.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              +{mediumRiskBookings.length - 3} more
            </p>
          )}
        </div>
      )}

      {/* Low Risk Summary */}
      {lowRiskBookings.length > 0 && highRiskBookings.length === 0 && mediumRiskBookings.length === 0 && (
        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">
              All {lowRiskBookings.length} bookings look reliable
            </span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {(highRiskBookings.length > 0 || mediumRiskBookings.length > 0) && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            const atRiskBookings = [...highRiskBookings, ...mediumRiskBookings];
            atRiskBookings.forEach(b => handleSendReminder(b.bookingId));
            toast.success(`Reminders sent to ${atRiskBookings.length} bookings`);
          }}
        >
          <MessageCircle className="w-3 h-3 mr-1" />
          Send Reminders to All At-Risk ({highRiskBookings.length + mediumRiskBookings.length})
        </Button>
      )}
    </div>
  );
}
