import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

type CrowdLevel = 'quiet' | 'moderate' | 'busy' | 'very_busy' | 'packed';

interface CrowdDensityBadgeProps {
  crowdLevel: CrowdLevel | string;
  density?: number;
  confidence?: number;
  variant?: 'compact' | 'full';
}

const levelConfig: Record<CrowdLevel, { label: string; color: string; bgColor: string }> = {
  quiet: { label: 'Quiet', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  moderate: { label: 'Moderate', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  busy: { label: 'Busy', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  very_busy: { label: 'Very Busy', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  packed: { label: 'Packed', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

export default function CrowdDensityBadge({ 
  crowdLevel, 
  density, 
  confidence,
  variant = 'compact' 
}: CrowdDensityBadgeProps) {
  const level = (crowdLevel as CrowdLevel) || 'moderate';
  const config = levelConfig[level] || levelConfig.moderate;

  if (variant === 'compact') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        config.bgColor, config.color
      )}>
        <Users className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  return (
    <div className={cn('p-4 rounded-xl', config.bgColor)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', config.bgColor)}>
            <Users className={cn('w-5 h-5', config.color)} />
          </div>
          <div>
            <p className={cn('font-semibold', config.color)}>{config.label}</p>
            {density && (
              <p className="text-sm text-muted-foreground">~{density} people</p>
            )}
          </div>
        </div>
        {confidence && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="text-sm font-medium text-foreground">{Math.round(confidence * 100)}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
