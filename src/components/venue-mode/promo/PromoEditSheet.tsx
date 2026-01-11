import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Loader2, 
  Upload, 
  ImageIcon, 
  Wand2, 
  X,
  Save,
  Tag,
  Percent
} from 'lucide-react';
import SmartTargetingPanel from './SmartTargetingPanel';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { VenuePromo, useUpdatePromo } from '@/hooks/useVenuePromos';
import { cn } from '@/lib/utils';

interface PromoEditSheetProps {
  promo: VenuePromo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const DEFAULT_PROMO_IMAGE = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800';

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage Off' },
  { value: 'bogo', label: 'Buy One Get One' },
  { value: 'free_item', label: 'Free Item' },
  { value: 'fixed', label: 'Fixed Amount Off' },
];

export default function PromoEditSheet({ promo, open, onOpenChange, onSaved }: PromoEditSheetProps) {
  const updatePromo = useUpdatePromo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState(DEFAULT_PROMO_IMAGE);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 30));
  const [isActive, setIsActive] = useState(true);
  const [discountType, setDiscountType] = useState<string>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [promoCode, setPromoCode] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [targetSegments, setTargetSegments] = useState<string[]>([]);
  const [termsConditions, setTermsConditions] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState<number | null>(null);
  
  // Image handling
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  
  // Initialize form with promo data
  useEffect(() => {
    if (promo) {
      setTitle(promo.title);
      setSubtitle(promo.subtitle || '');
      setImageUrl(promo.image_url || DEFAULT_PROMO_IMAGE);
      setStartDate(new Date(promo.starts_at));
      setEndDate(new Date(promo.ends_at));
      setIsActive(promo.is_active);
      setDiscountType(promo.discount_type || 'percentage');
      setDiscountValue(promo.discount_value || 0);
      setPromoCode(promo.promo_code || '');
      setTargetAudience(promo.target_audience || '');
      setTermsConditions(promo.terms_conditions || '');
      setMaxRedemptions(promo.max_redemptions);
    }
  }, [promo]);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `promo-${promo?.venue_id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('promo-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('promo-images')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl.publicUrl);
      toast.success('Image uploaded!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      setShowImageOptions(false);
    }
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);

    try {
      const prompt = imagePrompt.trim() || 
        `Professional promotional banner for a nightclub/bar promo: "${title}". ${subtitle}. Modern, vibrant, eye-catching design with neon accents. 16:9 aspect ratio. Ultra high resolution.`;

      const { data, error } = await supabase.functions.invoke('generate-promo-image', {
        body: { prompt },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setImageUrl(data.imageUrl);
        toast.success('AI image generated!');
      } else {
        throw new Error('No image returned');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image');
    } finally {
      setIsGeneratingImage(false);
      setImagePrompt('');
      setShowImageOptions(false);
    }
  };

  const handleSave = async () => {
    if (!promo) return;
    
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (endDate <= startDate) {
      toast.error('End date must be after start date');
      return;
    }

    updatePromo.mutate({
      promoId: promo.id,
      updates: {
        title,
        subtitle,
        image_url: imageUrl,
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        is_active: isActive,
        discount_type: discountType,
        discount_value: discountValue,
        promo_code: promoCode || null,
        target_audience: targetSegments.length > 0 ? targetSegments.join(', ') : targetAudience || null,
        terms_conditions: termsConditions || null,
        max_redemptions: maxRedemptions,
      },
    }, {
      onSuccess: () => {
        onOpenChange(false);
        onSaved?.();
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] bg-background border-border">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 text-foreground font-display">
            <Tag className="w-5 h-5 text-primary" />
            Edit Promo
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Update promo details and scheduling
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)] pb-6">
          {/* Image Section */}
          <div className="space-y-3">
            <Label>Promo Image</Label>
            <div className="relative aspect-video bg-secondary rounded-xl overflow-hidden">
              <img
                src={imageUrl}
                alt="Promo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_PROMO_IMAGE;
                }}
              />
              
              {(isUploadingImage || isGeneratingImage) && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
              
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2 gap-1 bg-background/90 backdrop-blur-sm"
                onClick={() => setShowImageOptions(!showImageOptions)}
              >
                <ImageIcon className="w-3 h-3" />
                Change
              </Button>
            </div>
            
            {showImageOptions && (
              <div className="p-3 bg-card rounded-xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Change Image</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowImageOptions(false)} className="h-6 w-6 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage || isGeneratingImage}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setImageUrl(DEFAULT_PROMO_IMAGE)} disabled={isUploadingImage || isGeneratingImage}>
                    Reset
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Wand2 className="w-3 h-3" />
                    <span>Generate with AI</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Describe your image..."
                      className="flex-1 text-sm"
                      disabled={isGeneratingImage}
                    />
                    <Button size="sm" onClick={handleGenerateImage} disabled={isGeneratingImage} className="px-3 bg-primary">
                      {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Title & Description */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Happy Hour BOGO"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subtitle">Description</Label>
              <Textarea
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Describe your promo..."
                rows={2}
              />
            </div>
          </div>

          {/* Date Scheduling */}
          <div className="space-y-3">
            <Label>Schedule</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Start Date</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">End Date</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      disabled={(date) => date < startDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Discount Settings */}
          <div className="space-y-3">
            <Label>Discount</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Type</span>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Value</span>
                <div className="relative">
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    placeholder="0"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {discountType === 'percentage' ? '%' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Promo Code & Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="promoCode">Promo Code</Label>
              <Input
                id="promoCode"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="e.g., SUMMER20"
                className="font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxRedemptions">Max Redemptions</Label>
              <Input
                id="maxRedemptions"
                type="number"
                value={maxRedemptions || ''}
                onChange={(e) => setMaxRedemptions(e.target.value ? Number(e.target.value) : null)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          {/* Smart Target Audience */}
          <SmartTargetingPanel
            selectedSegments={targetSegments}
            onSegmentsChange={setTargetSegments}
            discountType={discountType}
          />

          {/* Terms & Conditions */}
          <div className="space-y-2">
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              placeholder="e.g., Valid weekdays only. Cannot be combined with other offers."
              rows={2}
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
            <div>
              <p className="font-medium text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">Make this promo visible to customers</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={updatePromo.isPending}>
            Cancel
          </Button>
          <Button className="flex-1 bg-primary" onClick={handleSave} disabled={updatePromo.isPending}>
            {updatePromo.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
