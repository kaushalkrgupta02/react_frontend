import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Link2, Trash2, RefreshCw, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { useProviderMappings, ProviderMapping } from '@/hooks/useProviderMappings';
import { toast } from 'sonner';

interface ProviderConnectionPanelProps {
  venueId: string;
}

const PROVIDERS = [
  { id: 'tablecheck', name: 'TableCheck', description: 'Restaurant reservation system' },
  { id: 'opentable', name: 'OpenTable', description: 'Global dining reservations' },
  { id: 'sevenrooms', name: 'SevenRooms', description: 'Guest experience platform' },
  { id: 'chope', name: 'Chope', description: 'Asia dining reservations' },
  { id: 'grab', name: 'Grab', description: 'Southeast Asia super app' },
  { id: 'resy', name: 'Resy', description: 'Premium restaurant bookings' },
] as const;

export function ProviderConnectionPanel({ venueId }: ProviderConnectionPanelProps) {
  const { mappings, isLoading, createMapping, updateMapping, deleteMapping, testConnection } = useProviderMappings(venueId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form state - only venue ID needed now (API keys are platform-level)
  const [newProvider, setNewProvider] = useState<ProviderMapping['provider'] | ''>('');
  const [newProviderVenueId, setNewProviderVenueId] = useState('');

  const handleAddProvider = async () => {
    if (!newProvider || !newProviderVenueId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    const result = await createMapping({
      venue_id: venueId,
      provider: newProvider,
      provider_venue_id: newProviderVenueId,
    });

    setIsSubmitting(false);
    if (result.success) {
      toast.success('Provider connected successfully');
      setIsDialogOpen(false);
      setNewProvider('');
      setNewProviderVenueId('');
    } else {
      toast.error(result.error || 'Failed to connect provider');
    }
  };

  const handleToggleActive = async (mapping: ProviderMapping) => {
    const result = await updateMapping(mapping.id, { is_active: !mapping.is_active });
    if (result.success) {
      toast.success(mapping.is_active ? 'Provider disabled' : 'Provider enabled');
    } else {
      toast.error(result.error || 'Failed to update provider');
    }
  };

  const handleToggleSync = async (mapping: ProviderMapping) => {
    const result = await updateMapping(mapping.id, { sync_enabled: !mapping.sync_enabled });
    if (result.success) {
      toast.success(mapping.sync_enabled ? 'Sync disabled' : 'Sync enabled');
    } else {
      toast.error(result.error || 'Failed to update sync');
    }
  };

  const handleTestConnection = async (mappingId: string) => {
    setTestingId(mappingId);
    const result = await testConnection(mappingId);
    setTestingId(null);
    if (result.success) {
      toast.success('Connection successful');
    } else {
      toast.error(result.error || 'Connection failed');
    }
  };

  const handleDelete = async (mappingId: string) => {
    const result = await deleteMapping(mappingId);
    if (result.success) {
      toast.success('Provider disconnected');
    } else {
      toast.error(result.error || 'Failed to disconnect provider');
    }
    setDeleteConfirmId(null);
  };

  const getProviderInfo = (providerId: string) => {
    return PROVIDERS.find(p => p.id === providerId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              External Providers
            </CardTitle>
            <CardDescription>
              Connect external booking systems. API keys are configured at platform level in Admin settings.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect External Provider</DialogTitle>
                <DialogDescription>
                  Link this venue to an external booking system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={newProvider} onValueChange={(v) => setNewProvider(v as ProviderMapping['provider'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div>
                            <span className="font-medium">{provider.name}</span>
                            <span className="text-muted-foreground text-xs ml-2">{provider.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Provider Venue ID / Shop ID</Label>
                  <Input
                    placeholder="e.g., 12345 or venue-slug"
                    value={newProviderVenueId}
                    onChange={(e) => setNewProviderVenueId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The venue identifier in the external system
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProvider} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Connect
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : mappings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No providers connected</p>
            <p className="text-sm">Add a provider to sync reservations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mappings.map((mapping) => {
              const providerInfo = getProviderInfo(mapping.provider);
              return (
                <div
                  key={mapping.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{providerInfo?.name || mapping.provider}</span>
                        {mapping.is_active ? (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ID: {mapping.provider_venue_id}
                      </p>
                      {mapping.last_sync_at && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last sync: {new Date(mapping.last_sync_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <Label className="text-xs text-muted-foreground">Sync</Label>
                      <Switch
                        checked={mapping.sync_enabled}
                        onCheckedChange={() => handleToggleSync(mapping)}
                      />
                    </div>
                    <div className="flex items-center gap-2 mr-2">
                      <Label className="text-xs text-muted-foreground">Active</Label>
                      <Switch
                        checked={mapping.is_active}
                        onCheckedChange={() => handleToggleActive(mapping)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(mapping.id)}
                      disabled={testingId === mapping.id}
                    >
                      {testingId === mapping.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(mapping.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Provider?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection to this external booking provider. Any pending syncs will be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}