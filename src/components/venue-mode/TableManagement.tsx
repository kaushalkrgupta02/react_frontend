import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, MapPin, Users, DollarSign, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useVenueTables, VenueTable, VenueTableUpdate } from '@/hooks/useVenueTables';

interface TableManagementProps {
  venueId: string | null;
}

const locationLabels: Record<string, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  vip: 'VIP',
  terrace: 'Terrace',
  rooftop: 'Rooftop',
  bar: 'Bar Area',
};

const statusColors: Record<string, string> = {
  available: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  reserved: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  maintenance: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const featureOptions = [
  'Window View',
  'Private',
  'Booth',
  'High Top',
  'Wheelchair Accessible',
  'Near DJ',
  'Quiet Corner',
  'Stage View',
];

export default function TableManagement({ venueId }: TableManagementProps) {
  const { tables, isLoading, addTable, updateTable, deleteTable, totalSeats, availableTables } = useVenueTables(venueId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VenueTableUpdate>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newTable, setNewTable] = useState({
    table_number: '',
    seats: 4,
    location_zone: 'indoor' as const,
    minimum_spend: '',
    notes: '',
    special_features: [] as string[],
  });

  if (!venueId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Select a venue to manage tables
      </div>
    );
  }

  const handleAddTable = async () => {
    if (!newTable.table_number.trim()) {
      toast.error('Table number is required');
      return;
    }

    const result = await addTable({
      table_number: newTable.table_number,
      seats: newTable.seats,
      location_zone: newTable.location_zone,
      minimum_spend: newTable.minimum_spend ? parseFloat(newTable.minimum_spend) : null,
      notes: newTable.notes || null,
      special_features: newTable.special_features,
    });

    if (result.success) {
      toast.success('Table added');
      setIsAdding(false);
      setNewTable({
        table_number: '',
        seats: 4,
        location_zone: 'indoor',
        minimum_spend: '',
        notes: '',
        special_features: [],
      });
    } else {
      toast.error(result.error || 'Failed to add table');
    }
  };

  const handleStartEdit = (table: VenueTable) => {
    setEditingId(table.id);
    setEditForm({
      table_number: table.table_number,
      seats: table.seats,
      status: table.status,
      location_zone: table.location_zone,
      minimum_spend: table.minimum_spend,
      notes: table.notes,
      special_features: table.special_features,
      is_active: table.is_active,
    });
  };

  const handleSaveEdit = async (tableId: string) => {
    const result = await updateTable(tableId, editForm);
    if (result.success) {
      toast.success('Table updated');
      setEditingId(null);
      setEditForm({});
    } else {
      toast.error(result.error || 'Failed to update table');
    }
  };

  const handleDelete = async (tableId: string) => {
    const result = await deleteTable(tableId);
    if (result.success) {
      toast.success('Table removed');
    } else {
      toast.error(result.error || 'Failed to remove table');
    }
  };

  const toggleFeature = (feature: string, isNew: boolean) => {
    if (isNew) {
      setNewTable(prev => ({
        ...prev,
        special_features: prev.special_features.includes(feature)
          ? prev.special_features.filter(f => f !== feature)
          : [...prev.special_features, feature],
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        special_features: (prev.special_features || []).includes(feature)
          ? (prev.special_features || []).filter(f => f !== feature)
          : [...(prev.special_features || []), feature],
      }));
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading tables...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{(tables || []).length}</div>
            <div className="text-xs text-muted-foreground">Total Tables</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{totalSeats}</div>
            <div className="text-xs text-muted-foreground">Total Seats</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Table Button or Form */}
      {!isAdding ? (
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Table
        </Button>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">New Table</h4>
              <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Table Number/Name</Label>
                <Input
                  value={newTable.table_number}
                  onChange={(e) => setNewTable(prev => ({ ...prev, table_number: e.target.value }))}
                  placeholder="e.g. T1, VIP-1"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Seats</Label>
                <Input
                  type="number"
                  min={1}
                  value={newTable.seats}
                  onChange={(e) => setNewTable(prev => ({ ...prev, seats: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Location Zone</Label>
                <Select
                  value={newTable.location_zone}
                  onValueChange={(v) => setNewTable(prev => ({ ...prev, location_zone: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(locationLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min. Spend (IDR)</Label>
                <Input
                  type="number"
                  value={newTable.minimum_spend}
                  onChange={(e) => setNewTable(prev => ({ ...prev, minimum_spend: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Special Features</Label>
              <div className="flex flex-wrap gap-1.5">
                {featureOptions.map(feature => (
                  <Badge
                    key={feature}
                    variant={newTable.special_features.includes(feature) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleFeature(feature, true)}
                  >
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={newTable.notes}
                onChange={(e) => setNewTable(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about this table..."
                rows={2}
              />
            </div>

            <Button onClick={handleAddTable} className="w-full">
              <Check className="w-4 h-4 mr-2" />
              Add Table
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table List */}
      <div className="space-y-2">
        {tables.map(table => (
          <Card 
            key={table.id} 
            className={`bg-card border-border transition-opacity ${!table.is_active ? 'opacity-50' : ''}`}
          >
            <CardContent className="p-3">
              {editingId === table.id ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">Edit Table</h4>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(table.id)}>
                        <Check className="w-4 h-4 text-emerald-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Table Number</Label>
                      <Input
                        value={editForm.table_number || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, table_number: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Seats</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editForm.seats || 1}
                        onChange={(e) => setEditForm(prev => ({ ...prev, seats: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select
                        value={editForm.status || 'available'}
                        onValueChange={(v) => setEditForm(prev => ({ ...prev, status: v as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="reserved">Reserved</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Location</Label>
                      <Select
                        value={editForm.location_zone || 'indoor'}
                        onValueChange={(v) => setEditForm(prev => ({ ...prev, location_zone: v as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(locationLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Min. Spend (IDR)</Label>
                    <Input
                      type="number"
                      value={editForm.minimum_spend || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, minimum_spend: e.target.value ? parseFloat(e.target.value) : null }))}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Special Features</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {featureOptions.map(feature => (
                        <Badge
                          key={feature}
                          variant={(editForm.special_features || []).includes(feature) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleFeature(feature, false)}
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Active</Label>
                    <Switch
                      checked={editForm.is_active ?? true}
                      onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_active: checked }))}
                    />
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{table.table_number}</span>
                      <Badge variant="outline" className={statusColors[table.status]}>
                        {table.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {table.seats} seats
                      </span>
                      {table.location_zone && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {locationLabels[table.location_zone]}
                        </span>
                      )}
                      {table.minimum_spend && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {table.minimum_spend.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {(table.special_features || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(table.special_features || []).map(feature => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            <Sparkles className="w-2.5 h-2.5 mr-1" />
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {table.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{table.notes}</p>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleStartEdit(table)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(table.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {(tables || []).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No tables configured yet. Add your first table above.
          </div>
        )}
      </div>
    </div>
  );
}
