import { useState } from 'react';
import { 
  Instagram, 
  MessageCircle, 
  Twitter, 
  Facebook, 
  Music2,
  Globe,
  Check,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface SocialPlatform {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  isConfigured: boolean;
  description: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { 
    id: 'app', 
    label: 'App', 
    icon: Globe, 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10',
    isConfigured: true, // Always available
    description: 'Publish to the app for customers to see'
  },
  { 
    id: 'instagram', 
    label: 'Instagram', 
    icon: Instagram, 
    color: 'text-pink-500', 
    bgColor: 'bg-pink-500/10',
    isConfigured: false,
    description: 'Post to Instagram (requires Meta Business credentials)'
  },
  { 
    id: 'whatsapp', 
    label: 'WhatsApp', 
    icon: MessageCircle, 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10',
    isConfigured: false,
    description: 'Send via WhatsApp Business (requires WhatsApp Business API)'
  },
  { 
    id: 'tiktok', 
    label: 'TikTok', 
    icon: Music2, 
    color: 'text-foreground', 
    bgColor: 'bg-foreground/10',
    isConfigured: false,
    description: 'Post to TikTok (requires TikTok Business credentials)'
  },
  { 
    id: 'facebook', 
    label: 'Facebook', 
    icon: Facebook, 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-500/10',
    isConfigured: false,
    description: 'Post to Facebook Page (requires Meta Business credentials)'
  },
  { 
    id: 'twitter', 
    label: 'X', 
    icon: Twitter, 
    color: 'text-foreground', 
    bgColor: 'bg-foreground/10',
    isConfigured: false,
    description: 'Post to X/Twitter (requires X API credentials)'
  },
];

interface SocialMediaPublishSelectorProps {
  selectedPlatforms: string[];
  onPlatformsChange: (platforms: string[]) => void;
  configuredPlatforms?: string[];
  onConfigureClick?: () => void;
  compact?: boolean;
}

export default function SocialMediaPublishSelector({
  selectedPlatforms,
  onPlatformsChange,
  configuredPlatforms = ['app'],
  onConfigureClick,
  compact = false,
}: SocialMediaPublishSelectorProps) {
  const togglePlatform = (platformId: string) => {
    const isConfigured = configuredPlatforms.includes(platformId);
    
    if (!isConfigured && platformId !== 'app') {
      // Can't select unconfigured platforms
      return;
    }
    
    if (selectedPlatforms.includes(platformId)) {
      onPlatformsChange(selectedPlatforms.filter(p => p !== platformId));
    } else {
      onPlatformsChange([...selectedPlatforms, platformId]);
    }
  };

  const platforms = SOCIAL_PLATFORMS.map(p => ({
    ...p,
    isConfigured: configuredPlatforms.includes(p.id),
  }));

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Publish to</p>
          {onConfigureClick && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onConfigureClick}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Configure
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const isSelected = selectedPlatforms.includes(platform.id);
            const isDisabled = !platform.isConfigured && platform.id !== 'app';
            
            return (
              <TooltipProvider key={platform.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => togglePlatform(platform.id)}
                      disabled={isDisabled}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                        transition-all border
                        ${isSelected 
                          ? `${platform.bgColor} border-current ${platform.color}` 
                          : isDisabled
                            ? 'bg-muted/50 border-border/50 text-muted-foreground/50 cursor-not-allowed'
                            : 'bg-secondary border-border text-muted-foreground hover:border-primary/50'
                        }
                      `}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {platform.label}
                      {isSelected && <Check className="w-3 h-3" />}
                      {isDisabled && <AlertCircle className="w-3 h-3" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {isDisabled 
                        ? `${platform.label} not configured. Go to settings to connect.`
                        : platform.description
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
        
        {selectedPlatforms.length === 0 && (
          <p className="text-xs text-amber-500">
            Select at least one platform to publish
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Where to Publish</h3>
          <p className="text-xs text-muted-foreground">
            Select platforms to share your promo
          </p>
        </div>
        {onConfigureClick && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onConfigureClick}
            className="text-xs"
          >
            Configure Platforms
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      <div className="grid gap-2">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          const isSelected = selectedPlatforms.includes(platform.id);
          const isDisabled = !platform.isConfigured && platform.id !== 'app';
          
          return (
            <div
              key={platform.id}
              onClick={() => !isDisabled && togglePlatform(platform.id)}
              className={`
                flex items-center gap-3 p-3 rounded-xl border transition-all
                ${isDisabled 
                  ? 'opacity-50 cursor-not-allowed bg-muted/30' 
                  : 'cursor-pointer hover:border-primary/50'
                }
                ${isSelected 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-card border-border'
                }
              `}
            >
              <Checkbox
                checked={isSelected}
                disabled={isDisabled}
                onCheckedChange={() => togglePlatform(platform.id)}
                className="pointer-events-none"
              />
              
              <div className={`p-2 rounded-lg ${platform.bgColor}`}>
                <Icon className={`w-4 h-4 ${platform.color}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{platform.label}</p>
                  {platform.isConfigured ? (
                    <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30">
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Not configured
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {platform.description}
                </p>
              </div>
              
              {isDisabled && (
                <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>
      
      {selectedPlatforms.length === 0 && (
        <p className="text-sm text-amber-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Select at least one platform to publish
        </p>
      )}
      
      <p className="text-xs text-muted-foreground">
        All social media posts will include a link back to the app for booking.
      </p>
    </div>
  );
}
