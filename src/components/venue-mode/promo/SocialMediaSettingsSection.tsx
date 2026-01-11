import { useState } from 'react';
import { Instagram, MessageCircle, Facebook, Music2, Twitter, Check, Loader2, Unlink, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useVenueSocialCredentials, useUpsertSocialCredential, useDeleteSocialCredential } from '@/hooks/useVenueSocialCredentials';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface SocialMediaSettingsSectionProps {
  selectedVenueId: string | null;
}

type Platform = 'instagram' | 'whatsapp' | 'tiktok' | 'facebook' | 'twitter';

interface PlatformConfig {
  id: Platform;
  name: string;
  icon: typeof Instagram;
  color: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  helpText: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-500',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'Your Instagram Graph API access token', type: 'password' },
      { key: 'account_id', label: 'Account ID', placeholder: 'Your Instagram Business Account ID' },
    ],
    helpText: 'Requires Meta Business Suite and Instagram Graph API access.',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    icon: MessageCircle,
    color: 'text-green-500',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'WhatsApp Business API token', type: 'password' },
      { key: 'account_id', label: 'Phone Number ID', placeholder: 'Your WhatsApp Business phone number ID' },
    ],
    helpText: 'Requires WhatsApp Business API access through Meta.',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Music2,
    color: 'text-foreground',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'TikTok API access token', type: 'password' },
      { key: 'account_id', label: 'Open ID', placeholder: 'Your TikTok Open ID' },
    ],
    helpText: 'Requires TikTok for Business developer account.',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    fields: [
      { key: 'access_token', label: 'Page Access Token', placeholder: 'Facebook Page access token', type: 'password' },
      { key: 'account_id', label: 'Page ID', placeholder: 'Your Facebook Page ID' },
    ],
    helpText: 'Requires Facebook Page and Graph API access.',
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: Twitter,
    color: 'text-foreground',
    fields: [
      { key: 'access_token', label: 'API Key', placeholder: 'Twitter API Key', type: 'password' },
      { key: 'refresh_token', label: 'API Secret', placeholder: 'Twitter API Secret', type: 'password' },
      { key: 'account_id', label: 'Bearer Token', placeholder: 'Twitter Bearer Token', type: 'password' },
    ],
    helpText: 'Requires Twitter Developer account with API v2 access.',
  },
];

export default function SocialMediaSettingsSection({ selectedVenueId }: SocialMediaSettingsSectionProps) {
  const { data: credentials = [], isLoading } = useVenueSocialCredentials(selectedVenueId ?? undefined);
  const upsertMutation = useUpsertSocialCredential();
  const deleteMutation = useDeleteSocialCredential();
  
  const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  if (!selectedVenueId) {
    return (
      <div className="text-center py-8">
        <Link2 className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">Select a venue to configure social media</p>
      </div>
    );
  }

  const getCredentialForPlatform = (platform: Platform) => {
    return credentials.find(c => c.platform === platform);
  };

  const handleConnect = (platform: PlatformConfig) => {
    setConnectingPlatform(platform.id);
    setFormData({});
  };

  const handleSaveCredentials = async (platform: PlatformConfig) => {
    if (!selectedVenueId) return;

    // Validate required fields
    const missingFields = platform.fields.filter(f => !formData[f.key]?.trim());
    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    try {
      await upsertMutation.mutateAsync({
        venueId: selectedVenueId,
        platform: platform.id,
        accessToken: formData.access_token || undefined,
        refreshToken: formData.refresh_token || undefined,
        accountId: formData.account_id || undefined,
        accountName: formData.account_name || platform.name,
      });
      setConnectingPlatform(null);
      setFormData({});
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  const handleDisconnect = async (platform: Platform) => {
    if (!selectedVenueId) return;

    setIsDeleting(platform);
    try {
      await deleteMutation.mutateAsync({ venueId: selectedVenueId, platform });
    } catch (error) {
      console.error('Error disconnecting:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect your social media accounts to publish promos directly from the app.
      </p>

      <Accordion type="single" collapsible className="space-y-2">
        {PLATFORMS.map((platform) => {
          const credential = getCredentialForPlatform(platform.id);
          const isConnected = credential?.is_active;
          const Icon = platform.icon;

          return (
            <AccordionItem
              key={platform.id}
              value={platform.id}
              className="bg-card rounded-xl border border-border px-4"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${platform.color}`} />
                  <span className="font-medium text-foreground">{platform.name}</span>
                  {isConnected && (
                    <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" />
                      Connected
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">{platform.helpText}</p>

                  {isConnected ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {credential.account_name || platform.name}
                          </p>
                          {credential.account_id && (
                            <p className="text-xs text-muted-foreground">
                              ID: {credential.account_id.slice(0, 8)}...
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(platform.id)}
                          disabled={isDeleting === platform.id}
                        >
                          {isDeleting === platform.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Unlink className="w-4 h-4 mr-1" />
                              Disconnect
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Dialog open={connectingPlatform === platform.id} onOpenChange={(open) => {
                      if (!open) {
                        setConnectingPlatform(null);
                        setFormData({});
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleConnect(platform)}
                        >
                          <Link2 className="w-4 h-4 mr-2" />
                          Connect {platform.name}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Icon className={`w-5 h-5 ${platform.color}`} />
                            Connect {platform.name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p className="text-sm text-muted-foreground">{platform.helpText}</p>
                          
                          {platform.fields.map((field) => (
                            <div key={field.key} className="space-y-2">
                              <Label htmlFor={field.key}>{field.label}</Label>
                              <Input
                                id={field.key}
                                type={field.type || 'text'}
                                placeholder={field.placeholder}
                                value={formData[field.key] || ''}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  [field.key]: e.target.value
                                }))}
                              />
                            </div>
                          ))}

                          <Button
                            className="w-full"
                            onClick={() => handleSaveCredentials(platform)}
                            disabled={upsertMutation.isPending}
                          >
                            {upsertMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Check className="w-4 h-4 mr-2" />
                            )}
                            Save & Connect
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="bg-secondary/30 rounded-lg p-4 mt-4">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Social media credentials are stored securely. When you publish a promo, 
          it will be posted to all connected platforms with a link back to the app for bookings.
        </p>
      </div>
    </div>
  );
}
