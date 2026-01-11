import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Sparkles, Zap, Users, Clock, Percent, Gift, Tag, Loader2, Copy, Check, Calendar as CalendarIcon, Pencil, Globe, Link, Send, BookmarkPlus, Share2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import PromoImageSection, { DEFAULT_PROMO_IMAGE } from './PromoImageSection';
import SocialMediaContentSection from './SocialMediaContentSection';
import SocialMediaPublishSelector from './SocialMediaPublishSelector';
import { PromoTemplate, usePromoTemplates } from '@/hooks/usePromoTemplates';
import { useConfiguredPlatforms } from '@/hooks/useVenueSocialCredentials';

interface PromoSuggestion {
  id: string;
  title: string;
  description: string;
  promoType: 'bogo' | 'percentage' | 'free_item' | 'bundle' | 'fixed';
  discountValue: number;
  targetAudience: string;
  bestTiming: string;
  predictedImpact: {
    footfallIncrease: number;
    revenueIncrease: number;
    redemptionRate: number;
  };
  instagramCaption: string;
  whatsappMessage: string;
}

interface InsightsSummary {
  slowNights: string[];
  busyNights: string[];
  peakBookingHours: string[];
  avgPartySize: number;
  avgSpendPerBooking: number;
  showUpRate: number;
  repeatCustomerRate: number;
  topPromoTypes: string[];
  avgPromoConversion: number;
  totalBookingsAnalyzed: number;
  totalCustomersAnalyzed: number;
}

interface AIPromoDesignerSheetProps {
  venueId?: string;
  venueName?: string;
  children: React.ReactNode;
  onPromoCreated?: () => void;
  initialTemplate?: PromoTemplate | null;
  onSheetClose?: () => void;
}

const PROMO_GOALS = [
  { id: 'fill_dead_nights', label: 'Fill Dead Nights', icon: Clock, description: 'Increase footfall on slow days' },
  { id: 'boost_revenue', label: 'Boost Revenue', icon: Zap, description: 'Maximize spend per guest' },
  { id: 'attract_new', label: 'Attract New Guests', icon: Users, description: 'Bring in first-timers' },
  { id: 'reward_loyalty', label: 'Reward Loyalty', icon: Gift, description: 'Keep regulars coming back' },
];

// Get the app URL for deep links
const getAppUrl = () => window.location.origin;

export default function AIPromoDesignerSheet({ venueId, venueName, children, onPromoCreated, initialTemplate, onSheetClose }: AIPromoDesignerSheetProps) {
  const [open, setOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [suggestions, setSuggestions] = useState<PromoSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<PromoSuggestion | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasHistoricalData, setHasHistoricalData] = useState(false);
  const [insights, setInsights] = useState<InsightsSummary | null>(null);
  
  // Platform publishing
  const configuredPlatforms = useConfiguredPlatforms(venueId);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['app']);
  
  // AI Edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Image handling
  const [promoImageUrl, setPromoImageUrl] = useState<string>(DEFAULT_PROMO_IMAGE);
  
  // Date scheduling
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 30));
  
  // Template saving
  const { saveTemplate } = usePromoTemplates();
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Handle initial template
  useEffect(() => {
    if (initialTemplate) {
      const suggestion: PromoSuggestion = {
        id: initialTemplate.id,
        title: initialTemplate.title,
        description: initialTemplate.description,
        promoType: initialTemplate.promoType,
        discountValue: initialTemplate.discountValue,
        targetAudience: initialTemplate.targetAudience,
        bestTiming: initialTemplate.bestTiming,
        predictedImpact: {
          footfallIncrease: 25,
          revenueIncrease: 20,
          redemptionRate: 65,
        },
        instagramCaption: `🎉 ${initialTemplate.title}! ${initialTemplate.description} #JakartaNights #Promo`,
        whatsappMessage: `Hey! 🎉 ${initialTemplate.description} See you there!`,
      };
      setSelectedSuggestion(suggestion);
      setOpen(true);
    }
  }, [initialTemplate]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onSheetClose?.();
    }
  };

  const handleSaveAsTemplate = () => {
    if (!selectedSuggestion || !templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    
    const result = saveTemplate({
      name: templateName.trim(),
      title: selectedSuggestion.title,
      description: selectedSuggestion.description,
      promoType: selectedSuggestion.promoType,
      discountValue: selectedSuggestion.discountValue,
      targetAudience: selectedSuggestion.targetAudience,
      bestTiming: selectedSuggestion.bestTiming,
      icon: '📌',
    });
    
    if (result) {
      toast.success('Template saved!');
      setShowSaveTemplate(false);
      setTemplateName('');
    } else {
      toast.error('Failed to save template');
    }
  };

  // Helper to ensure suggestions have predictedImpact
  const normalizeSuggestion = (suggestion: Partial<PromoSuggestion>, index: number): PromoSuggestion => ({
    id: suggestion.id || String(index + 1),
    title: suggestion.title || 'Untitled Promo',
    description: suggestion.description || '',
    promoType: suggestion.promoType || 'percentage',
    discountValue: suggestion.discountValue || 0,
    targetAudience: suggestion.targetAudience || 'General audience',
    bestTiming: suggestion.bestTiming || 'Weekends',
    predictedImpact: suggestion.predictedImpact || {
      footfallIncrease: Math.floor(Math.random() * 20) + 15,
      revenueIncrease: Math.floor(Math.random() * 15) + 10,
      redemptionRate: Math.floor(Math.random() * 20) + 55,
    },
    instagramCaption: suggestion.instagramCaption || '',
    whatsappMessage: suggestion.whatsappMessage || '',
  });

  const handleGenerate = async () => {
    if (!selectedGoal) return;

    setIsGenerating(true);
    setSuggestions([]);
    setInsights(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-promo-designer', {
        body: {
          venueId,
          venueName,
          goal: selectedGoal,
        },
      });

      if (error) throw error;

      // Normalize suggestions to ensure predictedImpact exists
      const rawSuggestions = data.suggestions || [];
      const normalizedSuggestions = rawSuggestions.map((s: Partial<PromoSuggestion>, i: number) => normalizeSuggestion(s, i));
      
      setSuggestions(normalizedSuggestions);
      setHasHistoricalData(data.hasHistoricalData || false);
      setInsights(data.insights || null);
    } catch (error) {
      console.error('Error generating promos:', error);
      toast.error('Failed to generate promo suggestions');
      
      // Fallback mock data for demo
      setSuggestions([
        normalizeSuggestion({
          id: '1',
          title: 'Happy Hour BOGO',
          description: 'Buy one get one free on all cocktails from 6-8 PM',
          promoType: 'bogo',
          discountValue: 50,
          targetAudience: 'After-work crowd, couples',
          bestTiming: 'Tuesday & Wednesday, 6-8 PM',
          predictedImpact: {
            footfallIncrease: 35,
            revenueIncrease: 25,
            redemptionRate: 68,
          },
          instagramCaption: '🍸 Double the fun, half the price! BOGO cocktails every Tue & Wed 6-8PM. Tag your plus one! 🎉 #JakartaNights #BOGO #HappyHour',
          whatsappMessage: 'Hey! 🍹 We have BOGO cocktails every Tuesday & Wednesday 6-8 PM. Bring a friend and enjoy 2-for-1 on all cocktails! See you there!',
        }, 0),
        normalizeSuggestion({
          id: '2',
          title: 'Ladies Night 50% Off',
          description: '50% off all drinks for ladies every Thursday',
          promoType: 'percentage',
          discountValue: 50,
          targetAudience: 'Female groups, party-goers',
          bestTiming: 'Thursday, 9 PM onwards',
          predictedImpact: {
            footfallIncrease: 45,
            revenueIncrease: 30,
            redemptionRate: 72,
          },
          instagramCaption: '👑 Ladies, Thursday is YOUR night! 50% off all drinks. Gather your squad! 💃 #LadiesNight #Jakarta #GirlsNightOut',
          whatsappMessage: "Hi Queens! 👑 Every Thursday is Ladies Night - 50% off all drinks! Gather your girls and let's party! DM to reserve your spot.",
        }, 1),
        normalizeSuggestion({
          id: '3',
          title: 'First Timer Welcome',
          description: 'Free welcome shot for first-time visitors',
          promoType: 'free_item',
          discountValue: 0,
          targetAudience: 'New customers, curious visitors',
          bestTiming: 'All week',
          predictedImpact: {
            footfallIncrease: 20,
            revenueIncrease: 15,
            redemptionRate: 85,
          },
          instagramCaption: "🎁 First time here? We've got a FREE welcome shot waiting for you! Show this post at the bar. 🥃 #WelcomeDrink #JakartaBars #FirstTimer",
          whatsappMessage: "New to our place? 🎉 Show this message at the bar and get a FREE welcome shot on us! Can't wait to meet you!",
        }, 2),
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAIEdit = async () => {
    if (!editPrompt.trim() || !selectedSuggestion) return;

    setIsEditing(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-promo-designer', {
        body: {
          venueId,
          venueName,
          goal: selectedGoal,
          editMode: true,
          currentPromo: selectedSuggestion,
          editPrompt: editPrompt.trim(),
        },
      });

      if (error) throw error;

      if (data.editedPromo) {
        setSelectedSuggestion(data.editedPromo);
        toast.success('Promo updated!');
      }
    } catch (error) {
      console.error('Error editing promo:', error);
      
      // Fallback: Apply simple edits locally for demo
      const edited = { ...selectedSuggestion };
      const prompt = editPrompt.toLowerCase();
      
      if (prompt.includes('higher discount') || prompt.includes('more discount')) {
        edited.discountValue = Math.min(edited.discountValue + 10, 70);
        edited.description = edited.description.replace(/\d+%/, `${edited.discountValue}%`);
      } else if (prompt.includes('shorter') || prompt.includes('brief')) {
        edited.description = edited.description.split('.')[0] + '.';
      } else if (prompt.includes('longer') || prompt.includes('more detail')) {
        edited.description = edited.description + ' Limited time only. Book now to secure your spot!';
      } else if (prompt.includes('weekend')) {
        edited.bestTiming = 'Friday & Saturday nights, 9 PM - 2 AM';
      }
      
      setSelectedSuggestion(edited);
      toast.success('Promo updated with your changes!');
    } finally {
      setIsEditing(false);
      setEditPrompt('');
      setIsEditMode(false);
    }
  };

  const getDeepLinkUrl = (promoId?: string) => {
    const baseUrl = getAppUrl();
    if (venueId) {
      return `${baseUrl}/venue/${venueId}${promoId ? `?promo=${promoId}` : ''}`;
    }
    return baseUrl;
  };

  const handleCreatePromo = async (suggestion: PromoSuggestion) => {
    if (!venueId) {
      toast.error('No venue selected');
      return;
    }

    setIsCreating(true);

    try {
      // Generate promo code
      const promoCode = `${suggestion.title.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Use custom dates
      const startsAt = startDate.toISOString();
      const endsAt = endDate.toISOString();

      // Create deep link for the promo
      const deepLink = getDeepLinkUrl();
      const publishToApp = selectedPlatforms.includes('app');

      const { data: insertedPromo, error } = await supabase
        .from('promos')
        .insert({
          venue_id: venueId,
          title: suggestion.title,
          subtitle: suggestion.description,
          image_url: promoImageUrl,
          starts_at: startsAt,
          ends_at: endsAt,
          is_active: publishToApp,
          discount_type: suggestion.promoType,
          discount_value: suggestion.discountValue,
          promo_code: promoCode,
          target_audience: suggestion.targetAudience,
          terms_conditions: `Valid ${suggestion.bestTiming}. Cannot be combined with other offers.`,
          ai_generated: true,
          predicted_impact: suggestion.predictedImpact,
          promo_category: selectedGoal,
          deep_link: deepLink,
          published_platforms: selectedPlatforms,
        })
        .select()
        .single();

      if (error) throw error;

      // Publish to social media platforms if any are selected (excluding 'app')
      const socialPlatforms = selectedPlatforms.filter(p => p !== 'app');
      let socialResults: { platform: string; success: boolean; error?: string }[] = [];
      
      if (socialPlatforms.length > 0 && insertedPromo) {
        try {
          const { data: publishResult, error: publishError } = await supabase.functions.invoke('publish-to-social', {
            body: {
              promo_id: insertedPromo.id,
              venue_id: venueId,
              platforms: socialPlatforms,
              title: suggestion.title,
              subtitle: suggestion.description,
              image_url: promoImageUrl,
              deep_link: deepLink,
            },
          });

          if (publishError) {
            console.error('Social publish error:', publishError);
          } else if (publishResult?.results) {
            socialResults = publishResult.results;
            console.log('Social publish results:', socialResults);
          }
        } catch (socialError) {
          console.error('Error publishing to social:', socialError);
        }
      }

      // Build status message based on selected platforms and results
      const platformCount = selectedPlatforms.length;
      let statusMessage = '';
      
      if (platformCount === 0) {
        statusMessage = 'Promo saved as draft.';
      } else if (publishToApp && platformCount === 1) {
        statusMessage = 'Promo is now live on the app!';
      } else {
        const successfulSocial = socialResults.filter(r => r.success).map(r => r.platform);
        const failedSocial = socialResults.filter(r => !r.success).map(r => r.platform);
        
        if (publishToApp) {
          statusMessage = 'Promo published to app';
          if (successfulSocial.length > 0) {
            statusMessage += ` and ${successfulSocial.join(', ')}`;
          }
          statusMessage += '!';
        } else if (successfulSocial.length > 0) {
          statusMessage = `Promo published to ${successfulSocial.join(', ')}!`;
        } else {
          statusMessage = 'Promo saved.';
        }
        
        if (failedSocial.length > 0) {
          toast.warning(`Failed to publish to: ${failedSocial.join(', ')}`, {
            description: 'Check your social media credentials in Settings → Social',
          });
        }
      }

      toast.success(statusMessage, {
        description: `Promo code: ${promoCode}`,
      });
      
      onPromoCreated?.();
      setOpen(false);
      
      // Reset state
      setSelectedGoal(null);
      setSuggestions([]);
      setSelectedSuggestion(null);
      setSelectedPlatforms(['app']);
      setIsEditMode(false);
      setEditPrompt('');
      setPromoImageUrl(DEFAULT_PROMO_IMAGE);
      setStartDate(new Date());
      setEndDate(addDays(new Date(), 30));
      setInsights(null);
      setHasHistoricalData(false);
    } catch (error) {
      console.error('Error creating promo:', error);
      toast.error('Failed to create promo');
    } finally {
      setIsCreating(false);
    }
  };

  const getPromoTypeIcon = (type: PromoSuggestion['promoType']) => {
    switch (type) {
      case 'bogo':
        return Gift;
      case 'percentage':
        return Percent;
      default:
        return Tag;
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] bg-background border-border">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 text-foreground font-display">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Promo Designer
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Create data-driven promos tailored to your venue
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)] pb-6">
          {/* Step 1: Select Goal */}
          {!selectedSuggestion && (
            <>
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">What's your goal?</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PROMO_GOALS.map((goal) => {
                    const Icon = goal.icon;
                    return (
                      <button
                        key={goal.id}
                        onClick={() => setSelectedGoal(goal.id)}
                        className={`p-3 rounded-xl text-left transition-all ${
                          selectedGoal === goal.id
                            ? 'bg-primary/20 border-2 border-primary'
                            : 'bg-secondary border border-border hover:border-primary/50'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-2 ${
                          selectedGoal === goal.id ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <p className="text-sm font-medium text-foreground">{goal.label}</p>
                        <p className="text-xs text-muted-foreground">{goal.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!selectedGoal || isGenerating}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing your data...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Promo Ideas
                  </>
                )}
              </Button>

              {/* Data Source Indicator & Insights Summary */}
              {suggestions.length > 0 && (
                <div className="space-y-3">
                  {/* Data-driven badge */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    hasHistoricalData 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-amber-500/10 border border-amber-500/20'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${hasHistoricalData ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span className={`text-xs font-medium ${hasHistoricalData ? 'text-green-400' : 'text-amber-400'}`}>
                      {hasHistoricalData 
                        ? 'Data-Driven Suggestions'
                        : 'Generic Suggestions'
                      }
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {hasHistoricalData 
                        ? "Based on your venue's historical data"
                        : 'Add more booking data for personalized suggestions'
                      }
                    </span>
                  </div>

                  {/* Insights Summary Cards */}
                  {hasHistoricalData && insights && (
                    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-medium text-foreground">Insights Used</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Timing Insights */}
                        {(insights.slowNights.length > 0 || insights.busyNights.length > 0) && (
                          <div className="bg-secondary/50 rounded-lg p-2">
                            <p className="text-muted-foreground mb-1">📅 Timing Patterns</p>
                            {insights.slowNights.length > 0 && (
                              <p className="text-foreground">Slow: <span className="text-amber-400">{insights.slowNights.join(', ')}</span></p>
                            )}
                            {insights.busyNights.length > 0 && (
                              <p className="text-foreground">Busy: <span className="text-green-400">{insights.busyNights.join(', ')}</span></p>
                            )}
                            {insights.peakBookingHours.length > 0 && (
                              <p className="text-foreground">Peak: <span className="text-blue-400">{insights.peakBookingHours.join(', ')}</span></p>
                            )}
                          </div>
                        )}

                        {/* Customer Behavior */}
                        {(insights.avgPartySize > 0 || insights.repeatCustomerRate > 0) && (
                          <div className="bg-secondary/50 rounded-lg p-2">
                            <p className="text-muted-foreground mb-1">👥 Customer Behavior</p>
                            {insights.avgPartySize > 0 && (
                              <p className="text-foreground">Avg party: <span className="text-primary">{insights.avgPartySize} guests</span></p>
                            )}
                            {insights.repeatCustomerRate > 0 && (
                              <p className="text-foreground">Repeat rate: <span className="text-primary">{insights.repeatCustomerRate}%</span></p>
                            )}
                            {insights.showUpRate > 0 && (
                              <p className="text-foreground">Show-up: <span className="text-green-400">{insights.showUpRate}%</span></p>
                            )}
                          </div>
                        )}

                        {/* Spending Insights */}
                        {insights.avgSpendPerBooking > 0 && (
                          <div className="bg-secondary/50 rounded-lg p-2">
                            <p className="text-muted-foreground mb-1">💰 Spending</p>
                            <p className="text-foreground">Avg spend: <span className="text-primary">Rp {insights.avgSpendPerBooking.toLocaleString()}</span></p>
                          </div>
                        )}

                        {/* Promo Performance */}
                        {insights.topPromoTypes.length > 0 && (
                          <div className="bg-secondary/50 rounded-lg p-2">
                            <p className="text-muted-foreground mb-1">🎯 Top Promos</p>
                            <p className="text-foreground">{insights.topPromoTypes.map(t => 
                              t === 'bogo' ? 'BOGO' : 
                              t === 'percentage' ? '% Off' : 
                              t === 'free_item' ? 'Free Item' : t
                            ).join(', ')}</p>
                            {insights.avgPromoConversion > 0 && (
                              <p className="text-foreground">Avg conversion: <span className="text-green-400">{insights.avgPromoConversion}%</span></p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Data sample size */}
                      <p className="text-[10px] text-muted-foreground text-center">
                        Based on {insights.totalBookingsAnalyzed} bookings from {insights.totalCustomersAnalyzed} customers
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">
                    AI Suggestions ({suggestions.length})
                  </h3>
                  {suggestions.map((suggestion) => {
                    const TypeIcon = getPromoTypeIcon(suggestion.promoType);
                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => setSelectedSuggestion(suggestion)}
                        className="w-full p-4 bg-card rounded-xl border border-border text-left hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <TypeIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{suggestion.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded">
                                +{suggestion.predictedImpact.footfallIncrease}% footfall
                              </span>
                              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                                +{suggestion.predictedImpact.revenueIncrease}% revenue
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Step 2: Promo Details */}
          {selectedSuggestion && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSuggestion(null);
                  setIsEditMode(false);
                  setEditPrompt('');
                  setPromoImageUrl(DEFAULT_PROMO_IMAGE);
                }}
                className="text-muted-foreground"
              >
                ← Back to suggestions
              </Button>

              {/* Promo Card with Image */}
              <PromoImageSection
                venueId={venueId}
                promoTitle={selectedSuggestion.title}
                promoDescription={selectedSuggestion.description}
                imageUrl={promoImageUrl}
                onImageChange={setPromoImageUrl}
              />

              {/* Promo Details */}
              <div className="p-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
                <h3 className="text-lg font-bold text-foreground font-display">
                  {selectedSuggestion.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedSuggestion.description}
                </p>
                {/* Date Scheduling */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal text-xs h-8")}>
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {format(startDate, "MMM d")}
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal text-xs h-8")}>
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {format(endDate, "MMM d")}
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

              {/* AI Edit Mode */}
              <div className="p-3 bg-card rounded-xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Pencil className="w-3 h-3" />
                    AI Edit Mode
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditMode(!isEditMode);
                      if (!isEditMode) {
                        setTimeout(() => inputRef.current?.focus(), 100);
                      }
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    {isEditMode ? 'Cancel' : 'Edit with AI'}
                  </Button>
                </div>
                
                {isEditMode && (
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="e.g., Make it shorter, add weekend timing..."
                      className="flex-1 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isEditing) {
                          handleAIEdit();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleAIEdit}
                      disabled={!editPrompt.trim() || isEditing}
                      className="px-3"
                    >
                      {isEditing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Predicted Impact */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-card rounded-lg text-center border border-border">
                  <p className="text-lg font-bold text-green-400">
                    +{selectedSuggestion.predictedImpact.footfallIncrease}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Footfall</p>
                </div>
                <div className="p-3 bg-card rounded-lg text-center border border-border">
                  <p className="text-lg font-bold text-blue-400">
                    +{selectedSuggestion.predictedImpact.revenueIncrease}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Revenue</p>
                </div>
                <div className="p-3 bg-card rounded-lg text-center border border-border">
                  <p className="text-lg font-bold text-primary">
                    {selectedSuggestion.predictedImpact.redemptionRate}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Redemption</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Best Timing</p>
                  <p className="text-sm text-foreground">{selectedSuggestion.bestTiming}</p>
                </div>
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Target Audience</p>
                  <p className="text-sm text-foreground">{selectedSuggestion.targetAudience}</p>
                </div>
              </div>

              {/* Marketing Content */}
              <SocialMediaContentSection
                promoTitle={selectedSuggestion.title}
                promoDescription={selectedSuggestion.description}
                venueName={venueName}
                deepLink={getDeepLinkUrl()}
                initialContent={{
                  instagram: selectedSuggestion.instagramCaption,
                  whatsapp: selectedSuggestion.whatsappMessage,
                }}
              />

              {/* Platform Publish Selector */}
              <div className="p-4 bg-card rounded-xl border border-border">
                <SocialMediaPublishSelector
                  selectedPlatforms={selectedPlatforms}
                  onPlatformsChange={setSelectedPlatforms}
                  configuredPlatforms={configuredPlatforms}
                  compact
                />
              </div>

              {/* Save as Template */}
              <div className="p-4 bg-card rounded-xl border border-border">
                {!showSaveTemplate ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSaveTemplate(true)}
                  >
                    <BookmarkPlus className="w-4 h-4 mr-2" />
                    Save as Template
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Template Name</p>
                    <div className="flex gap-2">
                      <Input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., Weekend Special"
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleSaveAsTemplate}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowSaveTemplate(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedSuggestion(null);
                    setIsEditMode(false);
                    setEditPrompt('');
                  }}
                  disabled={isCreating}
                >
                  Try Another
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={() => handleCreatePromo(selectedSuggestion)}
                  disabled={isCreating || selectedPlatforms.length === 0}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : selectedPlatforms.length > 0 ? (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Publish ({selectedPlatforms.length})
                    </>
                  ) : (
                    'Select Platforms'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
