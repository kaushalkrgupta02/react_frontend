import { useState } from 'react';
import { 
  Megaphone, 
  Calendar, 
  Percent, 
  Gift, 
  Clock, 
  Tag, 
  Loader2, 
  Sparkles,
  ChevronRight,
  Check
} from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PromoImageSection, { DEFAULT_PROMO_IMAGE } from './PromoImageSection';
import SocialMediaContentSection from './SocialMediaContentSection';

interface BasicPromoCreatorProps {
  venueId?: string;
  venueName?: string;
  onPromoCreated?: () => void;
  children: React.ReactNode;
}

interface AISuggestion {
  id: string;
  title: string;
  description: string;
  promoType: string;
  discountValue: number;
  bestTiming: string;
  instagramCaption?: string;
  whatsappMessage?: string;
}

const PROMO_TYPES = [
  { value: 'percentage', label: 'Percentage Off', icon: Percent },
  { value: 'bogo', label: 'Buy One Get One', icon: Gift },
  { value: 'happy_hour', label: 'Happy Hour', icon: Clock },
  { value: 'fixed', label: 'Fixed Amount Off', icon: Tag },
];

const GOALS = [
  { value: 'fill_slow_nights', label: 'Fill Slow Nights' },
  { value: 'boost_revenue', label: 'Boost Revenue' },
  { value: 'attract_new', label: 'Attract New Customers' },
  { value: 'reward_loyalty', label: 'Reward Loyalty' },
  { value: 'special_event', label: 'Special Event' },
];

const getAppUrl = () => window.location.origin;

export default function BasicPromoCreator({
  venueId,
  venueName = 'Venue',
  onPromoCreated,
  children,
}: BasicPromoCreatorProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'choose' | 'manual' | 'ai'>('choose');
  
  // AI state
  const [aiGoal, setAiGoal] = useState('fill_slow_nights');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestion | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  
  // Image state
  const [promoImageUrl, setPromoImageUrl] = useState(DEFAULT_PROMO_IMAGE);
  
  // Step state for manual mode
  const [manualStep, setManualStep] = useState<'details' | 'media'>('details');

  const getDeepLink = () => {
    const baseUrl = getAppUrl();
    return venueId ? `${baseUrl}/venue/${venueId}` : baseUrl;
  };

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setDiscountType('percentage');
    setDiscountValue('');
    setPromoCode('');
    setMaxRedemptions('');
    setEndsAt('');
    setTermsConditions('');
    setSuggestions([]);
    setSelectedSuggestion(null);
    setMode('choose');
    setPromoImageUrl(DEFAULT_PROMO_IMAGE);
    setManualStep('details');
  };

  const generateAISuggestions = async () => {
    if (!venueId) {
      toast.error('Please select a venue first');
      return;
    }

    setIsGenerating(true);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('ai-promo-designer', {
        body: { venueId, venueName, goal: aiGoal }
      });

      if (error) {
        throw error;
      }

      if (data?.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        toast.success('AI generated promo ideas!');
      } else {
        toast.error('No suggestions generated. Try again.');
      }
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      if (error?.message?.includes('429')) {
        toast.error('AI is busy. Please try again in a moment.');
      } else {
        toast.error('Failed to generate suggestions');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const selectSuggestion = (suggestion: AISuggestion) => {
    setSelectedSuggestion(suggestion);
    setTitle(suggestion.title);
    setSubtitle(suggestion.description);
    setDiscountType(suggestion.promoType);
    setDiscountValue(suggestion.discountValue.toString());
    
    // Set default end date to 7 days from now
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    setEndsAt(endDate.toISOString().slice(0, 16));
    
    setTermsConditions(suggestion.bestTiming ? `Valid: ${suggestion.bestTiming}` : '');
  };

  const handleSubmit = async () => {
    if (!venueId) {
      toast.error('Please select a venue first');
      return;
    }

    if (!title || !discountValue || !endsAt) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('promos').insert({
        venue_id: venueId,
        title,
        subtitle: subtitle || null,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        promo_code: promoCode || null,
        max_redemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
        ends_at: new Date(endsAt).toISOString(),
        starts_at: new Date().toISOString(),
        terms_conditions: termsConditions || null,
        target_audience: 'all',
        is_active: true,
        ai_generated: mode === 'ai' && selectedSuggestion !== null,
        promo_tier: 'basic',
        created_by_role: 'venue_manager',
        commission_rate: 0.15,
        image_url: promoImageUrl,
        deep_link: getDeepLink(),
      });

      if (error) throw error;

      toast.success('Promo created successfully!');
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

  const renderChooseMode = () => (
    <div className="space-y-4 mt-6">
      <p className="text-sm text-muted-foreground">
        How would you like to create your promo?
      </p>
      
      {/* AI Option */}
      <Card 
        className="cursor-pointer transition-all hover:border-primary/50 border-primary/20"
        onClick={() => setMode('ai')}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">AI-Powered</h3>
                <Badge variant="secondary" className="text-xs">Free</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                AI analyzes your venue data to suggest high-converting promos
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Manual Option */}
      <Card 
        className="cursor-pointer transition-all hover:border-primary/50"
        onClick={() => setMode('manual')}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">Create Manually</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Full control over every detail of your promo
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAIMode = () => (
    <div className="space-y-6 mt-6">
      {suggestions.length === 0 ? (
        <>
          {/* Goal Selection */}
          <div className="space-y-2">
            <Label>What's your goal?</Label>
            <Select value={aiGoal} onValueChange={setAiGoal}>
              <SelectTrigger>
                <SelectValue placeholder="Select a goal" />
              </SelectTrigger>
              <SelectContent>
                {GOALS.map((goal) => (
                  <SelectItem key={goal.value} value={goal.value}>
                    {goal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={generateAISuggestions} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Ideas...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Suggestions
              </>
            )}
          </Button>

          <Button 
            variant="ghost" 
            onClick={() => setMode('choose')}
            className="w-full"
          >
            Back
          </Button>
        </>
      ) : (
        <>
          {/* AI Suggestions */}
          <div className="space-y-3">
            <Label>Choose a promo idea</Label>
            {suggestions.map((suggestion) => (
              <Card 
                key={suggestion.id}
                className={`cursor-pointer transition-all ${
                  selectedSuggestion?.id === suggestion.id 
                    ? 'border-primary ring-1 ring-primary' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => selectSuggestion(suggestion)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedSuggestion?.id === suggestion.id 
                        ? 'border-primary bg-primary' 
                        : 'border-muted-foreground/30'
                    }`}>
                      {selectedSuggestion?.id === suggestion.id && (
                        <Check className="w-4 h-4 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{suggestion.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {suggestion.promoType}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.discountValue}% off
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedSuggestion && renderPromoForm()}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSuggestions([]);
                setSelectedSuggestion(null);
              }}
              className="flex-1"
            >
              Regenerate
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedSuggestion}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Promo'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderPromoForm = () => (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="space-y-2">
        <Label htmlFor="title">Promo Title *</Label>
        <Input
          id="title"
          placeholder="e.g., 20% Off Drinks Tonight"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Description</Label>
        <Input
          id="subtitle"
          placeholder="e.g., Valid for all cocktails"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={discountType} onValueChange={setDiscountType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROMO_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="discountValue">Value *</Label>
          <Input
            id="discountValue"
            type="number"
            placeholder="20"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
          />
        </div>
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="promoCode">Promo Code</Label>
        <Input
          id="promoCode"
          placeholder="e.g., NIGHT20"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          className="uppercase"
        />
      </div>
    </div>
  );

  const renderManualDetailsStep = () => (
    <div className="space-y-4">
      {/* Promo Type */}
      <div className="space-y-2">
        <Label>Promo Type *</Label>
        <Select value={discountType} onValueChange={setDiscountType}>
          <SelectTrigger>
            <SelectValue placeholder="Select promo type" />
          </SelectTrigger>
          <SelectContent>
            {PROMO_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <type.icon className="w-4 h-4" />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Promo Title *</Label>
        <Input
          id="title"
          placeholder="e.g., 20% Off Drinks Tonight"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Subtitle */}
      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input
          id="subtitle"
          placeholder="e.g., Valid for all cocktails"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />
      </div>

      {/* Discount Value */}
      <div className="space-y-2">
        <Label htmlFor="discountValue">
          {discountType === 'percentage' ? 'Discount Percentage *' : 
           discountType === 'fixed' ? 'Discount Amount (IDR) *' : 
           'Value *'}
        </Label>
        <Input
          id="discountValue"
          type="number"
          placeholder={discountType === 'percentage' ? '20' : '50000'}
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
        />
      </div>

      {/* Promo Code */}
      <div className="space-y-2">
        <Label htmlFor="promoCode">Promo Code</Label>
        <Input
          id="promoCode"
          placeholder="e.g., NIGHT20"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          className="uppercase"
        />
      </div>

      {/* Ends At */}
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

      {/* Max Redemptions */}
      <div className="space-y-2">
        <Label htmlFor="maxRedemptions">Max Redemptions</Label>
        <Input
          id="maxRedemptions"
          type="number"
          placeholder="Leave empty for unlimited"
          value={maxRedemptions}
          onChange={(e) => setMaxRedemptions(e.target.value)}
        />
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-2">
        <Label htmlFor="terms">Terms & Conditions</Label>
        <Textarea
          id="terms"
          placeholder="e.g., Cannot be combined with other offers."
          value={termsConditions}
          onChange={(e) => setTermsConditions(e.target.value)}
          rows={2}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <Button 
          variant="outline" 
          onClick={() => setMode('choose')}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={() => setManualStep('media')}
          disabled={!title || !discountValue || !endsAt}
          className="flex-1"
        >
          Next: Image & Content
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  const renderManualMediaStep = () => (
    <div className="space-y-4">
      {/* Promo Summary */}
      <div className="p-3 bg-card rounded-lg border border-border">
        <h4 className="font-medium text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground">{subtitle || 'No description'}</p>
        <Badge variant="outline" className="mt-2 text-xs">
          {discountType === 'percentage' ? `${discountValue}% off` : `Rp ${discountValue}`}
        </Badge>
      </div>

      {/* Image Section */}
      <PromoImageSection
        venueId={venueId}
        promoTitle={title}
        promoDescription={subtitle}
        imageUrl={promoImageUrl}
        onImageChange={setPromoImageUrl}
      />

      {/* Social Media Content */}
      <SocialMediaContentSection
        promoTitle={title}
        promoDescription={subtitle || ''}
        venueName={venueName}
        deepLink={getDeepLink()}
      />

      {/* Commission Notice */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
        <p className="text-xs text-amber-400">
          💡 A 15% commission applies to each redemption.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <Button 
          variant="outline" 
          onClick={() => setManualStep('details')}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Promo'
          )}
        </Button>
      </div>
    </div>
  );

  const renderManualMode = () => (
    <div className="mt-6">
      {manualStep === 'details' && renderManualDetailsStep()}
      {manualStep === 'media' && renderManualMediaStep()}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Create Promo
          </SheetTitle>
          <SheetDescription>
            Create a promotional offer for {venueName}
          </SheetDescription>
        </SheetHeader>

        {mode === 'choose' && renderChooseMode()}
        {mode === 'ai' && renderAIMode()}
        {mode === 'manual' && renderManualMode()}
      </SheetContent>
    </Sheet>
  );
}
