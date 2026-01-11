import { useMemo } from 'react';
import { Target, Users, CheckCircle, XCircle } from 'lucide-react';

interface FunnelData {
  requests: number;
  confirmed: number;
  showed: number;
  noShow: number;
}

interface BookingFunnelProps {
  data: FunnelData;
  isLoading?: boolean;
}

export default function BookingFunnel({ data, isLoading }: BookingFunnelProps) {
  const rates = useMemo(() => {
    const confirmRate = data.requests > 0 ? (data.confirmed / data.requests) * 100 : 0;
    const showRate = data.confirmed > 0 ? (data.showed / data.confirmed) * 100 : 0;
    const noShowRate = data.confirmed > 0 ? (data.noShow / data.confirmed) * 100 : 0;
    
    return { confirmRate, showRate, noShowRate };
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border animate-pulse">
        <div className="h-4 w-28 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-muted/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const funnelSteps = [
    {
      label: 'Requests',
      value: data.requests,
      width: 100,
      color: 'bg-primary/20',
      textColor: 'text-primary',
      icon: Users,
    },
    {
      label: 'Confirmed',
      value: data.confirmed,
      width: data.requests > 0 ? (data.confirmed / data.requests) * 100 : 0,
      color: 'bg-blue-500/20',
      textColor: 'text-blue-400',
      icon: CheckCircle,
    },
    {
      label: 'Showed Up',
      value: data.showed,
      width: data.requests > 0 ? (data.showed / data.requests) * 100 : 0,
      color: 'bg-green-500/20',
      textColor: 'text-green-400',
      icon: Target,
    },
    {
      label: 'No Show',
      value: data.noShow,
      width: data.requests > 0 ? (data.noShow / data.requests) * 100 : 0,
      color: 'bg-red-500/20',
      textColor: 'text-red-400',
      icon: XCircle,
    },
  ];

  return (
    <div className="bg-card rounded-xl p-4 border border-border space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Target className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Booking Funnel</span>
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-2">
        {funnelSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="relative">
              <div
                className={`${step.color} rounded-lg px-3 py-2 transition-all duration-300`}
                style={{ 
                  width: `${Math.max(step.width, 30)}%`,
                  marginLeft: index === 3 ? 'auto' : 0,
                  marginRight: index === 3 ? 0 : 'auto',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${step.textColor}`} />
                    <span className={`text-xs font-medium ${step.textColor}`}>
                      {step.label}
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${step.textColor}`}>
                    {step.value}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{rates.confirmRate.toFixed(0)}%</p>
          <p className="text-[10px] text-muted-foreground">Confirm Rate</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-400">{rates.showRate.toFixed(0)}%</p>
          <p className="text-[10px] text-muted-foreground">Show Rate</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-400">{rates.noShowRate.toFixed(0)}%</p>
          <p className="text-[10px] text-muted-foreground">No-Show Rate</p>
        </div>
      </div>

      {/* Insight */}
      {rates.noShowRate > 20 && (
        <div className="p-2 bg-red-500/10 rounded-lg">
          <p className="text-xs text-red-400">
            ⚠️ High no-show rate. Consider deposit requirements or reminder automation.
          </p>
        </div>
      )}
      {rates.showRate >= 90 && (
        <div className="p-2 bg-green-500/10 rounded-lg">
          <p className="text-xs text-green-400">
            ✓ Excellent show rate! Your reminders are working well.
          </p>
        </div>
      )}
    </div>
  );
}
