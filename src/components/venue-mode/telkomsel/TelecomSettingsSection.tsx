import { useState } from 'react';
import { Phone, Radio, MapPin, Building2, Loader2, Settings, RefreshCw, AlertCircle, Target, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { AdminVenue } from '@/hooks/useAdminVenues';
import GeoTargetedPromoSheet from '../promo/GeoTargetedPromoSheet';

interface TelecomSettingsSectionProps {
  venues: AdminVenue[];
  selectedVenueId: string | null;
}

type TelecomProvider = 'telkomsel' | 'indosat' | 'xl';

interface ProviderConfig {
  id: TelecomProvider;
  name: string;
  color: string;
  apiKeyPlaceholder: string;
  defaultApiUrl: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'telkomsel',
    name: 'Telkomsel',
    color: 'text-red-500',
    apiKeyPlaceholder: 'Enter Telkomsel API Key',
    defaultApiUrl: 'https://api.telkomsel.mock/v1',
  },
  {
    id: 'indosat',
    name: 'Indosat Ooredoo',
    color: 'text-yellow-500',
    apiKeyPlaceholder: 'Enter Indosat API Key',
    defaultApiUrl: 'https://api.indosat.mock/v1',
  },
  {
    id: 'xl',
    name: 'XL Axiata',
    color: 'text-blue-500',
    apiKeyPlaceholder: 'Enter XL Axiata API Key',
    defaultApiUrl: 'https://api.xl.mock/v1',
  },
];

interface ProviderState {
  apiKey: string;
  apiUrl: string;
  isConnected: boolean;
  autoStatusEnabled: boolean;
  syncInterval: string;
}

export default function TelecomSettingsSection({ venues, selectedVenueId }: TelecomSettingsSectionProps) {
  const [activeProvider, setActiveProvider] = useState<TelecomProvider>('telkomsel');
  const [isTesting, setIsTesting] = useState(false);

  const [providerStates, setProviderStates] = useState<Record<TelecomProvider, ProviderState>>({
    telkomsel: {
      apiKey: 'DEMO_TELKOMSEL_API_KEY_12345',
      apiUrl: 'https://api.telkomsel.mock/v1',
      isConnected: false,
      autoStatusEnabled: false,
      syncInterval: '15',
    },
    indosat: {
      apiKey: '',
      apiUrl: 'https://api.indosat.mock/v1',
      isConnected: false,
      autoStatusEnabled: false,
      syncInterval: '15',
    },
    xl: {
      apiKey: '',
      apiUrl: 'https://api.xl.mock/v1',
      isConnected: false,
      autoStatusEnabled: false,
      syncInterval: '15',
    },
  });

  const displayVenues = selectedVenueId 
    ? venues.filter(v => v.id === selectedVenueId)
    : venues;

  const currentState = providerStates[activeProvider];
  const currentProvider = PROVIDERS.find(p => p.id === activeProvider)!;

  const updateProviderState = (updates: Partial<ProviderState>) => {
    setProviderStates(prev => ({
      ...prev,
      [activeProvider]: { ...prev[activeProvider], ...updates },
    }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    updateProviderState({ isConnected: true });
    toast.success(`${currentProvider.name} API connected successfully (Demo Mode)`);
    setIsTesting(false);
  };

  const handleSaveConfig = () => {
    toast.success(`${currentProvider.name} configuration saved`);
  };

  const handleSyncNow = async () => {
    toast.info(`Syncing crowd data from ${currentProvider.name}...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.success('Crowd data synced for all venues');
  };

  const connectedCount = Object.values(providerStates).filter(s => s.isConnected).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          Telecom Integration
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Connect to Indonesian telecom providers for location-based crowd analytics and geo-targeted promotions.
        </p>
        {connectedCount > 0 && (
          <p className="text-xs text-primary mt-1">
            {connectedCount} provider{connectedCount > 1 ? 's' : ''} connected
          </p>
        )}
      </div>

      {/* Provider Tabs */}
      <Tabs value={activeProvider} onValueChange={(v) => setActiveProvider(v as TelecomProvider)}>
        <TabsList className="grid grid-cols-3 w-full">
          {PROVIDERS.map(provider => (
            <TabsTrigger 
              key={provider.id} 
              value={provider.id}
              className="relative"
            >
              <span className={provider.color}>{provider.name}</span>
              {providerStates[provider.id].isConnected && (
                <Check className="w-3 h-3 text-status-quiet absolute -top-1 -right-1" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROVIDERS.map(provider => (
          <TabsContent key={provider.id} value={provider.id} className="space-y-4 mt-4">
            {/* API Configuration */}
            <div className="bg-card rounded-xl p-4 border border-border space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-medium text-foreground">{provider.name} API Configuration</h4>
                {providerStates[provider.id].isConnected && (
                  <span className="px-2 py-0.5 bg-status-quiet/20 text-status-quiet text-xs font-medium rounded-full">
                    Connected
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground">API Key</label>
                  <Input
                    type="password"
                    value={providerStates[provider.id].apiKey}
                    onChange={(e) => updateProviderState({ apiKey: e.target.value })}
                    placeholder={provider.apiKeyPlaceholder}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">API URL</label>
                  <Input
                    value={providerStates[provider.id].apiUrl}
                    onChange={(e) => updateProviderState({ apiUrl: e.target.value })}
                    placeholder={provider.defaultApiUrl}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button onClick={handleSaveConfig}>
                  Save Configuration
                </Button>
              </div>

              {/* Demo Mode Notice */}
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-500">
                  Demo Mode: Using mock {provider.name} API. In production, replace with actual credentials.
                </p>
              </div>
            </div>

            {/* Auto Status Updates */}
            <div className="bg-card rounded-xl p-4 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-foreground">Auto Status Updates</h4>
                    <p className="text-xs text-muted-foreground">
                      Automatically update venue crowd status from {provider.name} data
                    </p>
                  </div>
                </div>
                <Switch
                  checked={providerStates[provider.id].autoStatusEnabled}
                  onCheckedChange={(checked) => updateProviderState({ autoStatusEnabled: checked })}
                />
              </div>

              {providerStates[provider.id].autoStatusEnabled && (
                <div className="pl-6 space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Sync Interval (minutes)</label>
                    <Input
                      type="number"
                      min={5}
                      max={60}
                      value={providerStates[provider.id].syncInterval}
                      onChange={(e) => updateProviderState({ syncInterval: e.target.value })}
                      className="mt-1 w-32"
                    />
                  </div>

                  <Button variant="outline" size="sm" onClick={handleSyncNow}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Venue-specific Settings */}
      <div className="space-y-3">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          Venue Crowd Thresholds
        </h4>
        <p className="text-xs text-muted-foreground">
          Set density thresholds for auto-updating venue status (applies to all connected providers)
        </p>

        {displayVenues.map(venue => (
          <div key={venue.id} className="bg-card rounded-xl p-4 border border-border space-y-3">
            <h5 className="font-medium text-foreground text-sm">{venue.name}</h5>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Quiet (&lt; people)</label>
                <Input type="number" defaultValue={50} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Moderate (&lt; people)</label>
                <Input type="number" defaultValue={100} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Busy (&lt; people)</label>
                <Input type="number" defaultValue={200} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Packed (&gt;= people)</label>
                <Input type="number" defaultValue={300} className="mt-1 h-8 text-sm" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Geo-Targeting Settings */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-foreground">Geo-Targeting Defaults</h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Home Zone Radius (km)</label>
            <Input type="number" defaultValue={5} step={0.5} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Office Zone Radius (km)</label>
            <Input type="number" defaultValue={2} step={0.5} className="mt-1 h-8 text-sm" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          These defaults are used when creating geo-targeted promotions (works with all connected providers).
        </p>
      </div>

      {/* Create Geo-Targeted Promo */}
      {selectedVenueId && displayVenues[0] && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-foreground">Geo-Targeted Promotions</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Create promos that target users based on their home or office location (all telecom providers)
          </p>
          <GeoTargetedPromoSheet
            venueId={selectedVenueId}
            venueName={displayVenues[0].name}
          >
            <Button className="w-full">
              <MapPin className="w-4 h-4 mr-2" />
              Create Location-Based Promo
            </Button>
          </GeoTargetedPromoSheet>
        </div>
      )}
    </div>
  );
}
