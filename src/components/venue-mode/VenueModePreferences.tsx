import { useState, useEffect, useRef } from 'react';
import { Settings2, Package, Zap, RefreshCw, Plus, Trash2, Edit2, Loader2, Volume2, VolumeX, Users, CalendarDays, LayoutGrid, Grid3X3, Building2, Upload, X, Megaphone, Share2, Sparkles, UserPlus, UtensilsCrossed, Shield } from 'lucide-react';
import { useAdminVenues, AdminVenue } from '@/hooks/useAdminVenues';
import { useVenuePackages, VenuePackage } from '@/hooks/useVenuePackages';
import { usePackageItems } from '@/hooks/usePackageItems';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { isAudioMuted, setAudioMuted, playCheckInSound } from '@/lib/audioFeedback';
import TableManagement from './TableManagement';
import EnhancedPackageDialog from './packages/EnhancedPackageDialog';
import { PackageItemForm } from './packages/PackageItemsBuilder';
import PromosSettingsSection from './promo/PromosSettingsSection';
import SocialMediaSettingsSection from './promo/SocialMediaSettingsSection';
import { GuestImportSection } from './crm';
import MenuManagementSection from './menu/MenuManagementSection';
import StaffManagementSection from './staff/StaffManagementSection';
import { useUserRole } from '@/hooks/useUserRole';
import { getAuthHeader } from '@/lib/utilsAuth';
import { withApiBase } from '@/lib/config';

type SubTab = 'branding' | 'booking' | 'packages' | 'lineskip' | 'promos' | 'social' | 'guests' | 'menu' | 'staff';

interface VenueModePreferencesProps {
  selectedVenueId: string | null;
}

interface BookingExperienceSectionProps {
  venues: AdminVenue[];
  onUpdate: (venueId: string, settings: Partial<AdminVenue>) => Promise<{ success: boolean; error?: string }>;
  selectedVenueId: string | null;
}

interface BrandingSectionProps {
  venue: AdminVenue | null;
  onUpdate: (venueId: string, settings: Partial<AdminVenue>) => Promise<{ success: boolean; error?: string }>;
}

function BrandingSection({ venue, onUpdate }: BrandingSectionProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [name, setName] = useState(venue?.name || '');
  const [logoUrl, setLogoUrl] = useState(venue?.cover_image_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(venue?.name || '');
    setLogoUrl(venue?.cover_image_url || '');
  }, [venue]);

  const handleSave = async () => {
    if (!venue) return;
    setIsUpdating(true);
    const result = await onUpdate(venue.id, { 
      name: name.trim() || venue.name,
      cover_image_url: logoUrl || null
    });
    if (result.success) {
      toast.success('Branding updated');
    } else {
      toast.error(result.error || 'Failed to update');
    }
    setIsUpdating(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !venue) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);

      const headers = { ...(await getAuthHeader()) };

      const resp = await fetch(withApiBase(`/api/v1/venues/${venue.id}/logo`), {
        method: 'POST',
        headers,
        body: form,
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Upload failed');
      }

      const data = await resp.json();
      const url = data.file_url || data.cover_image_url || data.url || data.public_url;
      if (!url) throw new Error('No URL returned from server');

      setLogoUrl(url);
      toast.success('Logo uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
  };

  if (!venue) {
    return (
      <div className="text-center py-8">
        <Building2 className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">Select a venue to configure branding</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Customize your venue's name and logo displayed in Venue Mode.
      </p>

      <div className="bg-card rounded-xl p-4 border border-border space-y-4">
        {/* Logo Upload */}
        <div>
          <label className="text-sm font-medium text-foreground">Venue Logo</label>
          <p className="text-xs text-muted-foreground mb-3">Displayed in the header (recommended: square image, max 2MB)</p>
          
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative">
                <img 
                  src={logoUrl} 
                  alt="Venue logo" 
                  className="w-16 h-16 rounded-lg object-cover border border-border"
                />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30">
                <Building2 className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {logoUrl ? 'Change' : 'Upload'}
            </Button>
          </div>
        </div>

        {/* Venue Name */}
        <div>
          <label className="text-sm font-medium text-foreground">Venue Name</label>
          <p className="text-xs text-muted-foreground mb-2">Displayed instead of "Venue Mode" in the header</p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter venue name"
            className="mt-1"
          />
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          className="w-full"
          disabled={isUpdating}
        >
          {isUpdating ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Save Branding
        </Button>
      </div>

      {/* Preview */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <p className="text-xs text-muted-foreground mb-3">Preview</p>
        <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <h4 className="font-bold text-foreground">{name || 'Venue Mode'}</h4>
            <p className="text-xs text-muted-foreground">Demo Mode</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingExperienceSection({ venues, onUpdate, selectedVenueId }: BookingExperienceSectionProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(isAudioMuted());

  const handleMuteToggle = (checked: boolean) => {
    const muted = !checked;
    setAudioMuted(muted);
    setIsMuted(muted);
    if (!muted) {
      playCheckInSound();
    }
  };

  const handleToggle = async (venueId: string, field: keyof AdminVenue, value: boolean) => {
    setUpdatingId(venueId);
    const result = await onUpdate(venueId, { [field]: value });
    if (result.success) {
      toast.success('Setting updated');
    } else {
      toast.error(result.error || 'Failed to update');
    }
    setUpdatingId(null);
  };

  const handleNumberChange = async (venueId: string, field: keyof AdminVenue, value: string) => {
    const numValue = value ? parseInt(value) : null;
    setUpdatingId(venueId);
    const result = await onUpdate(venueId, { [field]: numValue });
    if (result.success) {
      toast.success('Setting updated');
    } else {
      toast.error(result.error || 'Failed to update');
    }
    setUpdatingId(null);
  };

  const handleTableChange = async (venueId: string, tables: string, seatsPerTable: number | null) => {
    const numTables = tables ? parseInt(tables) : null;
    const seats = seatsPerTable || 4;
    const totalCapacity = numTables ? numTables * seats : null;
    
    setUpdatingId(venueId);
    const result = await onUpdate(venueId, { 
      total_tables: numTables,
      total_capacity: totalCapacity
    });
    if (result.success) {
      toast.success('Tables updated');
    } else {
      toast.error(result.error || 'Failed to update');
    }
    setUpdatingId(null);
  };

  const handleSeatsChange = async (venueId: string, seats: string, totalTables: number | null) => {
    const numSeats = seats ? parseInt(seats) : null;
    const tables = totalTables || 10;
    const totalCapacity = numSeats ? tables * numSeats : null;
    
    setUpdatingId(venueId);
    const result = await onUpdate(venueId, { 
      seats_per_table: numSeats,
      total_capacity: totalCapacity
    });
    if (result.success) {
      toast.success('Seats updated');
    } else {
      toast.error(result.error || 'Failed to update');
    }
    setUpdatingId(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure how guests book at your venues.
      </p>
      
      {/* Sound Settings Card */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Volume2 className="w-5 h-5 text-primary" />
            )}
            <div>
              <h4 className="font-medium text-foreground">Sound Effects</h4>
              <p className="text-xs text-muted-foreground">Audio feedback for check-in actions</p>
            </div>
          </div>
          <Switch
            checked={!isMuted}
            onCheckedChange={handleMuteToggle}
          />
        </div>
      </div>
      
      {venues.map(venue => (
        <div key={venue.id} className="bg-card rounded-xl p-4 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">{venue.name}</h4>
            {updatingId === venue.id && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
          
          {/* Table Configuration */}
          <div className="py-2 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground font-medium">Table Configuration</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Tables</label>
                <Input
                  type="number"
                  min={1}
                  value={venue.total_tables || ''}
                  onChange={(e) => handleTableChange(venue.id, e.target.value, venue.seats_per_table)}
                  className="h-8 mt-1"
                  placeholder="10"
                  disabled={updatingId === venue.id}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Seats/Table</label>
                <Input
                  type="number"
                  min={1}
                  value={venue.seats_per_table || ''}
                  onChange={(e) => handleSeatsChange(venue.id, e.target.value, venue.total_tables)}
                  className="h-8 mt-1"
                  placeholder="4"
                  disabled={updatingId === venue.id}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Capacity</label>
                <div className="h-8 mt-1 flex items-center px-3 bg-secondary/50 rounded-md text-sm text-foreground">
                  {venue.total_capacity || ((venue.total_tables || 10) * (venue.seats_per_table || 4))}
                </div>
              </div>
            </div>
          </div>

          {/* Party Size Limits */}
          <div className="py-2 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Party size limits</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Min</label>
                <Input
                  type="number"
                  min={1}
                  value={venue.min_party_size || ''}
                  onChange={(e) => handleNumberChange(venue.id, 'min_party_size', e.target.value)}
                  className="h-8 mt-1"
                  placeholder="1"
                  disabled={updatingId === venue.id}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Max</label>
                <Input
                  type="number"
                  min={1}
                  value={venue.max_party_size || ''}
                  onChange={(e) => handleNumberChange(venue.id, 'max_party_size', e.target.value)}
                  className="h-8 mt-1"
                  placeholder="20"
                  disabled={updatingId === venue.id}
                />
              </div>
            </div>
          </div>

          {/* Allow Special Requests */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <span className="text-sm text-foreground">Allow special requests</span>
              <p className="text-xs text-muted-foreground">Enable notes/requests field</p>
            </div>
            <Switch
              checked={venue.allow_special_requests}
              onCheckedChange={(checked) => handleToggle(venue.id, 'allow_special_requests', checked)}
              disabled={updatingId === venue.id}
            />
          </div>

          {/* Max Bookings Per Night */}
          <div className="py-2 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Max bookings per night</span>
            </div>
            <Input
              type="number"
              min={1}
              value={venue.max_bookings_per_night || ''}
              onChange={(e) => handleNumberChange(venue.id, 'max_bookings_per_night', e.target.value)}
              className="h-8"
              placeholder="No limit"
              disabled={updatingId === venue.id}
            />
            <p className="text-xs text-muted-foreground mt-1">Leave empty for unlimited</p>
          </div>
        </div>
      ))}

      {/* Individual Table Configuration */}
      {selectedVenueId && (
        <div className="bg-card rounded-xl p-4 border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">Individual Tables</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure each table with seats, location, minimum spend, and special features.
          </p>
          <TableManagement venueId={selectedVenueId} />
        </div>
      )}
    </div>
  );
}

function PackagesSection({ venues }: { venues: AdminVenue[] }) {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(venues[0]?.id || null);
  const { packages, isLoading, createPackage, updatePackage, deletePackage } = useVenuePackages(selectedVenueId);
  const { bulkCreateItems, deleteAllItems } = usePackageItems(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<VenuePackage | null>(null);

  const handleSave = async (
    data: Partial<VenuePackage>, 
    items: PackageItemForm[]
  ): Promise<{ success: boolean; packageId?: string }> => {
    let result;
    let packageId: string;

    if (editingPackage) {
      result = await updatePackage(editingPackage.id, data);
      packageId = editingPackage.id;
      
      if (result.success) {
        // Delete existing items and recreate
        await deleteAllItems(editingPackage.id);
      }
    } else {
      const createResult = await createPackage(data);
      result = createResult;
      packageId = createResult.data?.id || '';
    }

    if (result.success && packageId && items.length > 0) {
      // Create package items
      const itemsToCreate = items.map((item, index) => ({
        package_id: packageId,
        item_type: item.item_type,
        item_name: item.item_name,
        quantity: item.quantity,
        redemption_rule: item.redemption_rule,
        sort_order: index,
        notes: null,
      }));
      
      await bulkCreateItems(itemsToCreate);
    }

    if (result.success) {
      toast.success(editingPackage ? 'Package updated' : 'Package created');
      setEditingPackage(null);
      return { success: true, packageId };
    } else {
      toast.error(result.error || 'Failed to save');
      return { success: false };
    }
  };

  const handleEdit = (pkg: VenuePackage) => {
    setEditingPackage(pkg);
    setIsDialogOpen(true);
  };

  const handleDelete = async (packageId: string) => {
    const result = await deletePackage(packageId);
    if (result.success) {
      toast.success('Package deleted');
    } else {
      toast.error(result.error || 'Failed to delete');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (venues.length === 0) {
    return <p className="text-muted-foreground text-sm">No venues available</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage packages with itemized contents for entry, drinks, food, and experiences.
      </p>

      {/* Venue Selector */}
      {venues.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {venues.map(venue => (
            <button
              key={venue.id}
              onClick={() => setSelectedVenueId(venue.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedVenueId === venue.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {venue.name}
            </button>
          ))}
        </div>
      )}

      {/* Create Package with AI Button */}
      <Button 
        className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 py-6 text-base"
        onClick={() => {
          setEditingPackage(null);
          setIsDialogOpen(true);
        }}
      >
        <Sparkles className="w-5 h-5 mr-2" />
        Create Package with AI
      </Button>

      {/* Enhanced Package Dialog */}
      {selectedVenueId && (
        <EnhancedPackageDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingPackage(null);
          }}
          editingPackage={editingPackage}
          venueId={selectedVenueId}
          venueName={venues.find(v => v.id === selectedVenueId)?.name}
          onSave={handleSave}
        />
      )}

      {/* Packages List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No packages yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create packages with entry, drinks, food & more</p>
        </div>
      ) : (
        <div className="space-y-2">
          {packages.map(pkg => {
            const typeIcon = pkg.package_type === 'entry' ? '🚪' 
              : pkg.package_type === 'bottle' ? '🍾'
              : pkg.package_type === 'food' ? '🍽️'
              : pkg.package_type === 'experience' ? '⭐'
              : pkg.package_type === 'event' ? '🎉'
              : '📦';
            
            return (
              <div key={pkg.id} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  {pkg.image_url ? (
                    <img 
                      src={pkg.image_url} 
                      alt={pkg.name}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">{typeIcon}</span>
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{pkg.name}</p>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{pkg.description}</p>
                        )}
                      </div>
                      {!pkg.is_active && (
                        <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3 text-sm">
                        {pkg.price && (
                          <span className="font-medium text-primary">{formatPrice(pkg.price)}</span>
                        )}
                        {pkg.sold_count > 0 && (
                          <span className="text-muted-foreground">{pkg.sold_count} sold</span>
                        )}
                        {pkg.max_quantity && (
                          <span className="text-muted-foreground">
                            {pkg.max_quantity - pkg.sold_count} left
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(pkg)}
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(pkg.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PassesSection({ venues, onUpdate }: { 
  venues: AdminVenue[]; 
  onUpdate: (venueId: string, settings: Partial<AdminVenue>) => Promise<{ success: boolean; error?: string }>;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingPass, setEditingPass] = useState<{ venueId: string; type: 'entry' | 'vip' } | null>(null);
  const [editValues, setEditValues] = useState<{ price: string; limit: string; freeItem: string }>({ 
    price: '', 
    limit: '', 
    freeItem: '' 
  });

  const handleToggle = async (venueId: string, passType: 'entry' | 'vip', enabled: boolean) => {
    setUpdatingId(venueId);
    const field = passType === 'entry' ? 'entry_pass_enabled' : 'vip_pass_enabled';
    const result = await onUpdate(venueId, { [field]: enabled });
    if (result.success) {
      toast.success(enabled ? `${passType === 'entry' ? 'Entry' : 'VIP'} Pass enabled` : `${passType === 'entry' ? 'Entry' : 'VIP'} Pass disabled`);
    } else {
      toast.error(result.error || 'Failed to update');
    }
    setUpdatingId(null);
  };

  const handleSaveSettings = async (venueId: string, passType: 'entry' | 'vip') => {
    setUpdatingId(venueId);
    const updates: Partial<AdminVenue> = passType === 'entry' 
      ? {
          entry_pass_price: editValues.price ? parseFloat(editValues.price) : null,
          entry_pass_daily_limit: editValues.limit ? parseInt(editValues.limit) : null,
        }
      : {
          vip_pass_price: editValues.price ? parseFloat(editValues.price) : null,
          vip_pass_daily_limit: editValues.limit ? parseInt(editValues.limit) : null,
          vip_pass_free_item: editValues.freeItem || null,
        };
    
    const result = await onUpdate(venueId, updates);
    if (result.success) {
      toast.success('Settings saved');
      setEditingPass(null);
    } else {
      toast.error(result.error || 'Failed to save');
    }
    setUpdatingId(null);
  };

  const handleReset = async (venueId: string, passType: 'entry' | 'vip') => {
    setUpdatingId(venueId);
    const field = passType === 'entry' ? 'entry_pass_sold_count' : 'vip_pass_sold_count';
    const result = await onUpdate(venueId, { [field]: 0 });
    if (result.success) {
      toast.success('Counter reset');
    } else {
      toast.error(result.error || 'Failed to reset');
    }
    setUpdatingId(null);
  };

  const startEditing = (venueId: string, passType: 'entry' | 'vip', venue: AdminVenue) => {
    setEditingPass({ venueId, type: passType });
    if (passType === 'entry') {
      setEditValues({
        price: venue.entry_pass_price?.toString() || '',
        limit: venue.entry_pass_daily_limit?.toString() || '',
        freeItem: '',
      });
    } else {
      setEditValues({
        price: venue.vip_pass_price?.toString() || '',
        limit: venue.vip_pass_daily_limit?.toString() || '',
        freeItem: venue.vip_pass_free_item || '',
      });
    }
  };

  const renderPassCard = (
    venue: AdminVenue, 
    passType: 'entry' | 'vip',
    enabled: boolean,
    price: number | null,
    limit: number | null,
    soldCount: number,
    freeItem?: string | null
  ) => {
    const isEditing = editingPass?.venueId === venue.id && editingPass?.type === passType;
    const label = passType === 'entry' ? 'Entry Pass' : 'VIP Pass';
    const icon = passType === 'entry' ? '🎫' : '⭐';
    
    return (
      <div className="bg-secondary/30 rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="font-medium text-foreground">{label}</span>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => handleToggle(venue.id, passType, checked)}
            disabled={updatingId === venue.id}
          />
        </div>
        
        {enabled && (
          <>
            {isEditing ? (
              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <label className="text-xs text-muted-foreground">Price (IDR)</label>
                  <Input
                    type="number"
                    value={editValues.price}
                    onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                    placeholder="150000"
                    className="mt-1 h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Daily Limit</label>
                  <Input
                    type="number"
                    value={editValues.limit}
                    onChange={(e) => setEditValues({ ...editValues, limit: e.target.value })}
                    placeholder="50"
                    className="mt-1 h-8"
                  />
                </div>
                {passType === 'vip' && (
                  <div>
                    <label className="text-xs text-muted-foreground">Free Item Included</label>
                    <Input
                      value={editValues.freeItem}
                      onChange={(e) => setEditValues({ ...editValues, freeItem: e.target.value })}
                      placeholder="e.g., Welcome Drink, Beer, Cocktail"
                      className="mt-1 h-8"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Leave empty for no free item</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveSettings(venue.id, passType)}
                    disabled={updatingId === venue.id}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingPass(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="text-foreground">
                    {price ? `Rp ${price.toLocaleString()}` : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Daily Limit</span>
                  <span className="text-foreground">{limit || 'No limit'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sold Today</span>
                  <span className="text-foreground">{soldCount}</span>
                </div>
                {passType === 'vip' && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Free Item</span>
                    <span className="text-foreground">
                      {freeItem ? `🎁 ${freeItem}` : 'None'}
                    </span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditing(venue.id, passType, venue)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReset(venue.id, passType)}
                    disabled={updatingId === venue.id}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure Entry Pass and VIP Pass options for skip-the-line access.
      </p>
      
      {venues.map(venue => (
        <div key={venue.id} className="bg-card rounded-xl p-4 border border-border space-y-4">
          <h4 className="font-medium text-foreground">{venue.name}</h4>
          
          <div className="grid gap-3">
            {/* Entry Pass */}
            {renderPassCard(
              venue,
              'entry',
              venue.entry_pass_enabled,
              venue.entry_pass_price,
              venue.entry_pass_daily_limit,
              venue.entry_pass_sold_count
            )}
            
            {/* VIP Pass */}
            {renderPassCard(
              venue,
              'vip',
              venue.vip_pass_enabled,
              venue.vip_pass_price,
              venue.vip_pass_daily_limit,
              venue.vip_pass_sold_count,
              venue.vip_pass_free_item
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VenueModePreferences({ selectedVenueId }: VenueModePreferencesProps) {
  const { venues, isLoading, updateLineSkipSettings } = useAdminVenues();
  const { isManager, isAdmin, isVenueManager } = useUserRole();
  const [activeTab, setActiveTab] = useState<SubTab>('booking');

  // Filter to selected venue if one is selected
  const displayVenues = selectedVenueId 
    ? venues.filter(v => v.id === selectedVenueId)
    : venues;

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedVenue = selectedVenueId 
    ? venues.find(v => v.id === selectedVenueId) || null
    : venues[0] || null;

  const baseTabs = [
    { id: 'booking' as SubTab, label: 'Booking', icon: Settings2 },
    { id: 'lineskip' as SubTab, label: 'Passes', icon: Zap },
    { id: 'packages' as SubTab, label: 'Packages', icon: Package },
    { id: 'menu' as SubTab, label: 'Menu', icon: UtensilsCrossed },
    { id: 'promos' as SubTab, label: 'Promos', icon: Megaphone },
    { id: 'guests' as SubTab, label: 'Guests', icon: UserPlus },
    { id: 'social' as SubTab, label: 'Social', icon: Share2 },
    { id: 'branding' as SubTab, label: 'Branding', icon: Building2 },
  ];

  // Add Staff tab for managers and admins
  const canManageStaff = isManager || isAdmin || isVenueManager;
  const tabs = canManageStaff
    ? [...baseTabs, { id: 'staff' as SubTab, label: 'Staff', icon: Shield }]
    : baseTabs;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex border-b border-border bg-background px-4 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'branding' && (
          <BrandingSection venue={selectedVenue} onUpdate={updateLineSkipSettings} />
        )}
        {activeTab === 'booking' && (
          <BookingExperienceSection venues={displayVenues} onUpdate={updateLineSkipSettings} selectedVenueId={selectedVenueId} />
        )}
        {activeTab === 'packages' && (
          <PackagesSection venues={displayVenues} />
        )}
        {activeTab === 'lineskip' && (
          <PassesSection venues={displayVenues} onUpdate={updateLineSkipSettings} />
        )}
        {activeTab === 'promos' && (
          <PromosSettingsSection venues={displayVenues} selectedVenueId={selectedVenueId} />
        )}
        {activeTab === 'social' && (
          <SocialMediaSettingsSection selectedVenueId={selectedVenueId} />
        )}
        {activeTab === 'guests' && (
          <GuestImportSection venueId={selectedVenueId} />
        )}
        {activeTab === 'menu' && (
          <MenuManagementSection venueId={selectedVenueId} />
        )}
        {activeTab === 'staff' && canManageStaff && (
          <StaffManagementSection venueId={selectedVenueId} />
        )}
      </div>
    </div>
  );
}