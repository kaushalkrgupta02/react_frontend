import { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { recordVenueAnalytics } from '@/hooks/useAnalyticsTracking';
import { toast } from 'sonner';

interface CapacitySliderProps {
  venueId: string;
  venueName: string;
  initialCapacity?: number;
  maxCapacity?: number;
}

export default function CapacitySlider({ 
  venueId, 
  venueName,
  initialCapacity = 50,
  maxCapacity = 100,
}: CapacitySliderProps) {
  const [capacity, setCapacity] = useState(initialCapacity);
  const [lastSaved, setLastSaved] = useState(initialCapacity);
  const [isSaving, setIsSaving] = useState(false);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');

  useEffect(() => {
    if (capacity > lastSaved + 5) {
      setTrend('up');
    } else if (capacity < lastSaved - 5) {
      setTrend('down');
    } else {
      setTrend('stable');
    }
  }, [capacity, lastSaved]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Estimate footfall based on capacity (rough calculation)
      const estimatedFootfall = Math.round((capacity / 100) * 200);
      const estimatedRevenue = estimatedFootfall * 150000; // Avg spend per guest in IDR

      const result = await recordVenueAnalytics(venueId, {
        capacityPercentage: capacity,
        footfallCount: estimatedFootfall,
        revenueEstimate: estimatedRevenue,
      });

      if (result.success) {
        setLastSaved(capacity);
        toast.success('Capacity updated');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to update capacity');
    } finally {
      setIsSaving(false);
    }
  };

  const getCapacityColor = () => {
    if (capacity >= 85) return 'text-red-400';
    if (capacity >= 70) return 'text-amber-400';
    if (capacity >= 40) return 'text-green-400';
    return 'text-blue-400';
  };

  const getCapacityLabel = () => {
    if (capacity >= 90) return 'At Capacity';
    if (capacity >= 75) return 'Getting Busy';
    if (capacity >= 50) return 'Comfortable';
    if (capacity >= 25) return 'Quiet';
    return 'Empty';
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-amber-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-blue-400" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Live Capacity
          </div>
          {getTrendIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Capacity Display */}
        <div className="text-center">
          <div className={`text-4xl font-bold ${getCapacityColor()}`}>
            {capacity}%
          </div>
          <p className="text-sm text-muted-foreground">{getCapacityLabel()}</p>
        </div>

        {/* Capacity Slider */}
        <div className="space-y-3">
          <Slider
            value={[capacity]}
            onValueChange={(value) => setCapacity(value[0])}
            max={maxCapacity}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Quick Buttons */}
        <div className="flex gap-2">
          {[25, 50, 75, 100].map((value) => (
            <Button
              key={value}
              variant={capacity === value ? 'default' : 'outline'}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setCapacity(value)}
            >
              {value}%
            </Button>
          ))}
        </div>

        {/* Save Button */}
        {capacity !== lastSaved && (
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? 'Saving...' : 'Update Capacity'}
          </Button>
        )}

        {/* Last Updated Info */}
        <p className="text-xs text-center text-muted-foreground">
          Drag slider or tap quick buttons to update
        </p>
      </CardContent>
    </Card>
  );
}
