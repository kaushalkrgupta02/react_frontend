import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Key, Eye, EyeOff, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKeyConfig {
  id: string;
  name: string;
  provider: string;
  description: string;
  isConfigured: boolean;
  placeholder: string;
}

// These would typically be fetched from the backend
// For now, using dummy/placeholder configuration
const API_KEYS_CONFIG: ApiKeyConfig[] = [
  {
    id: 'resend',
    name: 'Resend API Key',
    provider: 'Resend',
    description: 'API key for sending invoice emails and receipts to guests',
    isConfigured: false, // Will check dynamically
    placeholder: 're_xxxxxxxxxxxx',
  },
  {
    id: 'tablecheck',
    name: 'TableCheck API Key',
    provider: 'TableCheck',
    description: 'API key for TableCheck reservation integration',
    isConfigured: true, // Dummy: pretend it's configured
    placeholder: 'tc_live_xxxxxxxxxxxx',
  },
  {
    id: 'opentable',
    name: 'OpenTable API Key',
    provider: 'OpenTable',
    description: 'API key for OpenTable reservation integration',
    isConfigured: false,
    placeholder: 'ot_xxxxxxxxxxxx',
  },
  {
    id: 'sevenrooms',
    name: 'SevenRooms API Key',
    provider: 'SevenRooms',
    description: 'API key for SevenRooms guest experience platform',
    isConfigured: false,
    placeholder: 'sr_xxxxxxxxxxxx',
  },
  {
    id: 'chope',
    name: 'Chope API Key',
    provider: 'Chope',
    description: 'API key for Chope dining reservations',
    isConfigured: false,
    placeholder: 'chope_xxxxxxxxxxxx',
  },
  {
    id: 'resy',
    name: 'Resy API Key',
    provider: 'Resy',
    description: 'API key for Resy premium bookings',
    isConfigured: false,
    placeholder: 'resy_xxxxxxxxxxxx',
  },
];

export default function ApiKeysConfigPanel() {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const handleSaveKey = async (keyId: string) => {
    const value = keyValues[keyId];
    if (!value || value.trim() === '') {
      toast.error('Please enter an API key');
      return;
    }

    setSaving(keyId);
    
    // Simulate saving - in production this would call an edge function
    // that stores the key in Supabase secrets
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success(`${API_KEYS_CONFIG.find(k => k.id === keyId)?.provider} API key saved`);
    setSaving(null);
    setEditingKey(null);
    setKeyValues(prev => ({ ...prev, [keyId]: '' }));
  };

  const toggleShowValue = (keyId: string) => {
    setShowValues(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          Platform API Keys
        </CardTitle>
        <CardDescription>
          Configure API keys for external booking providers. These keys are used across all venues.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {API_KEYS_CONFIG.map((config) => (
          <div
            key={config.id}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{config.name}</span>
                  {config.isConfigured ? (
                    <Badge variant="default" className="text-xs gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Not Set
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {config.description}
                </p>
              </div>
            </div>

            {editingKey === config.id ? (
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showValues[config.id] ? 'text' : 'password'}
                        placeholder={config.placeholder}
                        value={keyValues[config.id] || ''}
                        onChange={(e) => setKeyValues(prev => ({ ...prev, [config.id]: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => toggleShowValue(config.id)}
                      >
                        {showValues[config.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveKey(config.id)}
                    disabled={saving === config.id}
                  >
                    {saving === config.id ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingKey(null);
                      setKeyValues(prev => ({ ...prev, [config.id]: '' }));
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingKey(config.id)}
                >
                  {config.isConfigured ? 'Update Key' : 'Add Key'}
                </Button>
              </div>
            )}
          </div>
        ))}

        <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> API keys are stored securely and encrypted. Contact each provider to obtain API credentials for your platform.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}