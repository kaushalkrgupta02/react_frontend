import { CheckCircle2, Clock, XCircle, Circle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface BookingTimelineProps {
  status: 'pending' | 'confirmed' | 'cancelled' | 'declined';
  createdAt: string;
  updatedAt: string;
}

export default function BookingTimeline({ status, createdAt, updatedAt }: BookingTimelineProps) {
  const submittedDate = parseISO(createdAt);
  const statusChangedDate = parseISO(updatedAt);
  
  const isConfirmed = status === 'confirmed';
  const isDeclined = status === 'cancelled' || status === 'declined';
  const isPending = status === 'pending';

  const steps = [
    {
      id: 'submitted',
      label: 'Submitted',
      icon: CheckCircle2,
      completed: true,
      date: submittedDate,
    },
    {
      id: 'pending',
      label: 'Pending Review',
      icon: Clock,
      completed: !isPending,
      active: isPending,
      date: isPending ? null : null,
    },
    {
      id: 'final',
      label: isDeclined ? 'Declined' : 'Confirmed',
      icon: isDeclined ? XCircle : CheckCircle2,
      completed: isConfirmed || isDeclined,
      active: false,
      date: (isConfirmed || isDeclined) ? statusChangedDate : null,
      variant: isDeclined ? 'error' : isConfirmed ? 'success' : 'default',
    },
  ];

  return (
    <div className="py-4">
      <div className="relative flex items-center justify-between">
        {/* Connecting Line Background */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-border" />
        
        {/* Progress Line */}
        <div 
          className={cn(
            "absolute top-5 left-8 h-0.5 transition-all duration-500",
            isConfirmed && "bg-green-500 right-8",
            isDeclined && "bg-red-500 right-8",
            isPending && "bg-primary right-1/2"
          )}
        />

        {steps.map((step) => (
          <div key={step.id} className="relative flex flex-col items-center z-10">
            {/* Icon Circle */}
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                step.completed && step.variant === 'success' && "bg-green-500/20 border-green-500 text-green-400",
                step.completed && step.variant === 'error' && "bg-red-500/20 border-red-500 text-red-400",
                step.completed && !step.variant && "bg-primary/20 border-primary text-primary",
                step.active && "bg-primary/20 border-primary text-primary animate-pulse",
                !step.completed && !step.active && "bg-card border-border text-muted-foreground"
              )}
            >
              {step.completed ? (
                <step.icon className="w-5 h-5" />
              ) : step.active ? (
                <Clock className="w-5 h-5" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                "mt-2 text-xs font-medium text-center",
                (step.completed || step.active) ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>

            {/* Date */}
            {step.date && (
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {format(step.date, 'MMM d, h:mm a')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}