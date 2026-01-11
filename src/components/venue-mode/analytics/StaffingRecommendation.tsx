import { Users, Clock, Utensils, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StaffingBreakdown {
  bartenders: number;
  servers: number;
  security: number;
  hosts: number;
}

interface StaffingRecommendationProps {
  totalStaff: number;
  breakdown?: StaffingBreakdown;
  confidence: number;
  expectedGuests: number;
  peakHours?: string[];
  isLoading?: boolean;
  onAdjustSchedule?: () => void;
}

export default function StaffingRecommendation({
  totalStaff,
  breakdown,
  confidence,
  expectedGuests,
  peakHours,
  isLoading,
  onAdjustSchedule,
}: StaffingRecommendationProps) {
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-4 border border-emerald-500/20 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-muted/50 rounded" />
          <div className="h-12 bg-muted/50 rounded" />
        </div>
      </div>
    );
  }

  const staffRoles = breakdown ? [
    { icon: Utensils, label: 'Bartenders', count: breakdown.bartenders, color: 'text-amber-400' },
    { icon: Users, label: 'Servers', count: breakdown.servers, color: 'text-blue-400' },
    { icon: Shield, label: 'Security', count: breakdown.security, color: 'text-red-400' },
    { icon: Sparkles, label: 'Hosts', count: breakdown.hosts, color: 'text-purple-400' },
  ] : [];

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-4 border border-emerald-500/20 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-foreground">Staffing Recommendation</span>
        </div>
        <span className="text-xs text-emerald-400">{confidence}% confidence</span>
      </div>

      {/* Main Recommendation */}
      <div className="bg-card/50 rounded-lg p-4 text-center">
        <p className="text-4xl font-bold text-foreground font-display">{totalStaff}</p>
        <p className="text-sm text-muted-foreground">staff recommended</p>
        <p className="text-xs text-emerald-400 mt-1">
          For ~{expectedGuests} expected guests
        </p>
      </div>

      {/* Breakdown */}
      {staffRoles.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {staffRoles.map((role) => {
            const Icon = role.icon;
            return (
              <div key={role.label} className="bg-card/30 rounded-lg p-2 text-center">
                <Icon className={`w-4 h-4 mx-auto mb-1 ${role.color}`} />
                <p className="text-lg font-bold text-foreground">{role.count}</p>
                <p className="text-[10px] text-muted-foreground">{role.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Peak Hours */}
      {peakHours && peakHours.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Peak hours:</span>
          <div className="flex gap-1">
            {peakHours.map((hour, i) => (
              <span key={i} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded">
                {hour}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      {onAdjustSchedule && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          onClick={onAdjustSchedule}
        >
          Adjust Schedule
        </Button>
      )}
    </div>
  );
}
