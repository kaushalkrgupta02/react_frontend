import { useState } from 'react';
import { MapPin, Home, Building2, Navigation, Globe, Clock, Calendar, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GeoTargetedPromoSheetProps {
  venueId: string;
  venueName: string;
  onPromoCreated?: () => void;
  children: React.ReactNode;
}

const LOCATION_TYPES = [
  { value: 'home', label: 'Near Home', icon: Home, description: 'Target users who live nearby' },
  { value: 'office', label: 'Near Office', icon: Building2, description: 'Target users who work nearby' },
  { value: 'current', label: 'Current Location', icon: Navigation, description: 'Target users currently in the area' },
  { value: 'anywhere', label: 'Anywhere', icon: Globe, description: 'No location restriction' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function GeoTargetedPromoSheet({
  venueId,
  venueName,
  onPromoCreated,
  children,
}: GeoTargetedPromoSheetProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [discountValue, setDiscountValue] = useState('20');
  const [locationType, setLocationType] = useState<string>('home');
  const [radiusKm, setRadiusKm] = useState([5]);
  const [timeStart, setTimeStart] = useState('17:00');
  const [timeEnd, setTimeEnd] = useState('22:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Weekdays
  const [endsAt, setEndsAt] = useState('');

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setDiscountValue('20');
    setLocationType('home');
    setRadiusKm([5]);
    setTimeStart('17:00');
    setTimeEnd('22:00');
    setSelectedDays([1, 2, 3, 4, 5]);
    setEndsAt('');
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSubmit = async () => {
    if (!title || !discountValue || !endsAt) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedDays.length === 0) {
      toast.error('Please select at least one day');
      return;
    }

    setIsSubmitting(true);

    try {
      // First create the promo
      const { data: promo, error: promoError } = await supabase
        .from('promos')
        .insert({
          venue_id: venueId,
          title,
          subtitle: subtitle || null,
          discount_type: 'percentage',
          discount_value: parseFloat(discountValue),
          ends_at: new Date(endsAt).toISOString(),
          starts_at: new Date().toISOString(),
          target_audience: `geo_${locationType}`,
          is_active: true,
          promo_tier: 'location',
          created_by_role: 'venue_manager',
          image_url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
        })
        .select()
        .single();

      if (promoError) throw promoError;

      // Then create the location promo entry
      const { error: locationError } = await supabase
        .from('location_promos')
        .insert({
          promo_id: promo.id,
          venue_id: venueId,
          location_type: locationType as 'home' | 'office' | 'current' | 'anywhere',
          radius_km: radiusKm[0],
          time_window_start: timeStart,
          time_window_end: timeEnd,
          days_of_week: selectedDays,
          is_active: true,
        });

      if (locationError) throw locationError;

      toast.success('Geo-targeted promo created!');
      resetForm();
      setOpen(false);
      onPromoCreated?.();
    } catch (error) {
      console.error('Error creating promo:', error);
      toast.error('Failed to create promo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Geo-Targeted Promo
          </SheetTitle>
          <SheetDescription>
            Create a promo that targets users based on their location
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Promo Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Promo Title *</Label>
              <Input
                id="title"
                placeholder="e.g., After Work Happy Hour"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Description</Label>
              <Input
                id="subtitle"
                placeholder="e.g., 20% off all drinks"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount % *</Label>
              <Input
                id="discount"
                type="number"
                placeholder="20"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            </div>
          </div>

          {/* Location Targeting */}
          <div className="space-y-3">
            <Label>Target Audience Location</Label>
            <div className="grid grid-cols-2 gap-2">
              {LOCATION_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = locationType === type.value;
                return (
                  <Card
                    key={type.value}
                    className={cn(
                      "cursor-pointer transition-all",
                      isSelected ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"
                    )}
                    onClick={() => setLocationType(type.value)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>
                          {type.label}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Radius */}
          {locationType !== 'anywhere' && (
            <div className="space-y-3">
              <Label>Radius: {radiusKm[0]} km</Label>
              <Slider
                value={radiusKm}
                onValueChange={setRadiusKm}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Only show to users within {radiusKm[0]}km of your venue
              </p>
            </div>
          )}

          {/* Time Window */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Window
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Input
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End</Label>
                <Input
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Days of Week */}
          <div className="space-y-3">
            <Label>Active Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    "w-10 h-10 rounded-full text-xs font-medium transition-colors",
                    selectedDays.includes(day.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Valid Until */}
          <div className="space-y-2">
            <Label htmlFor="endsAt" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Valid Until *
            </Label>
            <Input
              id="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Create Geo-Targeted Promo
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
