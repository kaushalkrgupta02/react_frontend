import { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type DatePreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export interface DateRange {
  start?: Date | undefined;
  end?: Date | undefined;
  preset: DatePreset;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presetLabels: Record<DatePreset, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  all: 'All',
  custom: 'Custom',
};

export function getPresetDateRange(preset: DatePreset, customDate?: Date): DateRange {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        preset: 'today',
      };
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
        preset: 'week',
      };
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        preset: 'month',
      };
    case 'year':
      return {
        start: startOfYear(now),
        end: endOfYear(now),
        preset: 'year',
      };
    case 'all':
      return {
        // 'all' uses undefined start/end so callers know to fetch without date filters
        start: undefined,
        end: undefined,
        preset: 'all',
      };
    case 'custom':
      const targetDate = customDate || now;
      return {
        start: startOfDay(targetDate),
        end: endOfDay(targetDate),
        preset: 'custom',
      };
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        preset: 'today',
      };
  }
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePresetClick = (preset: DatePreset) => {
    if (preset !== 'custom') {
      onChange(getPresetDateRange(preset));
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange(getPresetDateRange('custom', date));
      setCalendarOpen(false);
    }
  };

  const getDisplayLabel = () => {
    if (value.preset === 'custom') {
      return format(value.start as Date, 'MMM d, yyyy');
    }
    return presetLabels[value.preset];
  };

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Preset buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {(['today', 'week', 'month', 'year', 'all'] as DatePreset[]).map((preset) => (
          <Button
            key={preset}
            variant={value.preset === preset ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetClick(preset)}
            className="h-8 px-3 text-xs"
          >
            {presetLabels[preset]}
          </Button>
        ))}
      </div>

      {/* Custom date picker */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={value.preset === 'custom' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 px-3 text-xs gap-1.5',
              value.preset === 'custom' && 'min-w-[120px]'
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            {value.preset === 'custom' ? format(value.start as Date, 'MMM d') : 'Pick Date'}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value.start}
            onSelect={handleDateSelect}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Current selection indicator */}
      <div className="text-xs text-muted-foreground ml-auto hidden sm:block">
        {value.preset !== 'today' && value.preset !== 'custom' && value.preset !== 'all' && (
          <span>
            {format(value.start as Date, 'MMM d')} - {format(value.end as Date, 'MMM d, yyyy')}
          </span>
        )}
        {value.preset === 'all' && (
          <span>All time</span>
        )}
      </div>
    </div>
  );
}

export default DateRangeFilter;
