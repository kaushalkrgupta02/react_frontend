import { useState, useRef } from 'react';
import { 
  Instagram, 
  MessageCircle, 
  Twitter, 
  Facebook, 
  Music2, 
  Copy, 
  Check, 
  Pencil, 
  Sparkles, 
  Send, 
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SocialMediaContent {
  instagram: string;
  whatsapp: string;
  tiktok: string;
  facebook: string;
  twitter: string;
}

interface SocialMediaContentSectionProps {
  promoTitle: string;
  promoDescription: string;
  venueName?: string;
  deepLink: string;
  initialContent?: Partial<SocialMediaContent>;
  onContentChange?: (content: SocialMediaContent) => void;
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-500' },
  { id: 'tiktok', label: 'TikTok', icon: Music2, color: 'text-foreground' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-500' },
  { id: 'twitter', label: 'X', icon: Twitter, color: 'text-foreground' },
] as const;

type PlatformId = typeof PLATFORMS[number]['id'];

const generateDefaultContent = (
  platform: PlatformId,
  promoTitle: string,
  promoDescription: string,
  venueName: string,
  deepLink: string
): string => {
  const venue = venueName || 'our venue';
  
  switch (platform) {
    case 'instagram':
      return `🎉 ${promoTitle}\n\n${promoDescription}\n\n📍 ${venue}\n\n👉 Link in bio to book!\n\n#promo #nightlife #deals #${venue.replace(/\s+/g, '')}`;
    case 'whatsapp':
      return `Hey! 🎉\n\n${promoTitle} at ${venue}!\n\n${promoDescription}\n\n📲 Book now: ${deepLink}`;
    case 'tiktok':
      return `${promoTitle} 🔥\n\n${promoDescription}\n\n📍 ${venue}\n\n#fyp #promo #nightlife #deals`;
    case 'facebook':
      return `🎉 ${promoTitle}\n\n${promoDescription}\n\n📍 ${venue}\n\n👉 Book now: ${deepLink}`;
    case 'twitter':
      return `🎉 ${promoTitle} at ${venue}!\n\n${promoDescription}\n\n📲 ${deepLink}`;
    default:
      return promoDescription;
  }
};

export default function SocialMediaContentSection({
  promoTitle,
  promoDescription,
  venueName = 'Venue',
  deepLink,
  initialContent,
  onContentChange,
}: SocialMediaContentSectionProps) {
  const [activeTab, setActiveTab] = useState<PlatformId>('instagram');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isAIEditing, setIsAIEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const editInputRef = useRef<HTMLInputElement>(null);
  
  // Content state for each platform
  const [content, setContent] = useState<SocialMediaContent>(() => {
    const defaults: SocialMediaContent = {
      instagram: initialContent?.instagram || generateDefaultContent('instagram', promoTitle, promoDescription, venueName, deepLink),
      whatsapp: initialContent?.whatsapp || generateDefaultContent('whatsapp', promoTitle, promoDescription, venueName, deepLink),
      tiktok: initialContent?.tiktok || generateDefaultContent('tiktok', promoTitle, promoDescription, venueName, deepLink),
      facebook: initialContent?.facebook || generateDefaultContent('facebook', promoTitle, promoDescription, venueName, deepLink),
      twitter: initialContent?.twitter || generateDefaultContent('twitter', promoTitle, promoDescription, venueName, deepLink),
    };
    return defaults;
  });

  const handleCopy = (text: string, platform: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(platform);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleManualEdit = (platform: PlatformId, newValue: string) => {
    const updated = { ...content, [platform]: newValue };
    setContent(updated);
    onContentChange?.(updated);
  };

  const handleAIEdit = async () => {
    if (!editPrompt.trim()) return;

    setIsAIEditing(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-social-content', {
        body: {
          platform: activeTab,
          currentContent: content[activeTab],
          editPrompt: editPrompt.trim(),
          promoTitle,
          promoDescription,
          venueName,
          deepLink,
        },
      });

      if (error) throw error;

      if (data?.content) {
        const updated = { ...content, [activeTab]: data.content };
        setContent(updated);
        onContentChange?.(updated);
        toast.success(`${PLATFORMS.find(p => p.id === activeTab)?.label} content updated!`);
      }
    } catch (error) {
      console.error('Error editing with AI:', error);
      
      // Fallback: Simple local edit for demo
      let edited = content[activeTab];
      const prompt = editPrompt.toLowerCase();
      
      if (prompt.includes('shorter') || prompt.includes('brief')) {
        edited = edited.split('\n\n').slice(0, 2).join('\n\n');
      } else if (prompt.includes('more emoji')) {
        edited = edited.replace(/\./g, '! 🎉');
      } else if (prompt.includes('urgent')) {
        edited = `⚡ LIMITED TIME! ⚡\n\n${edited}\n\n⏰ Don't miss out!`;
      } else if (prompt.includes('casual') || prompt.includes('friendly')) {
        edited = edited.replace(/!/g, ' 😊').replace(/\./g, '!');
      }
      
      const updated = { ...content, [activeTab]: edited };
      setContent(updated);
      onContentChange?.(updated);
      toast.success('Content updated!');
    } finally {
      setIsAIEditing(false);
      setEditPrompt('');
      setIsEditing(false);
    }
  };

  const regenerateContent = async (platform: PlatformId) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-social-content', {
        body: {
          platform,
          promoTitle,
          promoDescription,
          venueName,
          deepLink,
          regenerate: true,
        },
      });

      if (error) throw error;

      if (data?.content) {
        const updated = { ...content, [platform]: data.content };
        setContent(updated);
        onContentChange?.(updated);
        toast.success('Content regenerated!');
      }
    } catch (error) {
      console.error('Error regenerating:', error);
      // Fallback: regenerate with defaults
      const newContent = generateDefaultContent(platform, promoTitle, promoDescription, venueName, deepLink);
      const updated = { ...content, [platform]: newContent };
      setContent(updated);
      onContentChange?.(updated);
      toast.success('Content regenerated!');
    }
  };

  const activePlatform = PLATFORMS.find(p => p.id === activeTab);
  const ActiveIcon = activePlatform?.icon || Instagram;

  return (
    <div className="space-y-3">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm font-medium text-foreground"
      >
        <span>Social Media Content</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-3">
          {/* Platform Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PlatformId)}>
            <TabsList className="w-full grid grid-cols-5 h-9">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                return (
                  <TabsTrigger 
                    key={platform.id} 
                    value={platform.id}
                    className="px-1 data-[state=active]:bg-primary/20"
                  >
                    <Icon className={`w-4 h-4 ${platform.color}`} />
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {PLATFORMS.map((platform) => (
              <TabsContent key={platform.id} value={platform.id} className="mt-3 space-y-3">
                {/* Content Display/Edit */}
                <div className="p-3 bg-card rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <platform.icon className={`w-3 h-3 ${platform.color}`} />
                      {platform.label}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(content[platform.id], platform.id)}
                      className="h-6 px-2"
                    >
                      {copiedField === platform.id ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  
                  <Textarea
                    value={content[platform.id]}
                    onChange={(e) => handleManualEdit(platform.id, e.target.value)}
                    className="min-h-[100px] text-sm resize-none bg-transparent border-0 p-0 focus-visible:ring-0"
                    placeholder={`Write your ${platform.label} content...`}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(!isEditing);
                      if (!isEditing) {
                        setTimeout(() => editInputRef.current?.focus(), 100);
                      }
                    }}
                    className="flex-1 text-xs"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {isEditing ? 'Cancel AI Edit' : 'Edit with AI'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateContent(platform.id)}
                    className="flex-1 text-xs"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Regenerate
                  </Button>
                </div>

                {/* AI Edit Input */}
                {isEditing && (
                  <div className="flex gap-2">
                    <Input
                      ref={editInputRef}
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="e.g., Make it shorter, add urgency, more emojis..."
                      className="flex-1 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isAIEditing) {
                          handleAIEdit();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleAIEdit}
                      disabled={!editPrompt.trim() || isAIEditing}
                      className="px-3"
                    >
                      {isAIEditing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}
