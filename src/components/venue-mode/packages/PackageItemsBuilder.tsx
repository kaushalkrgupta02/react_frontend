import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ITEM_TYPE_OPTIONS, REDEMPTION_RULE_OPTIONS, PackageItemType, RedemptionRule } from '@/hooks/usePackageItems';

export interface PackageItemForm {
  id: string;
  item_type: PackageItemType;
  item_name: string;
  quantity: number;
  redemption_rule: RedemptionRule;
}

interface PackageItemsBuilderProps {
  items: PackageItemForm[];
  onChange: (items: PackageItemForm[]) => void;
}

export default function PackageItemsBuilder({ items, onChange }: PackageItemsBuilderProps) {
  const addItem = () => {
    const newItem: PackageItemForm = {
      id: `temp-${Date.now()}`,
      item_type: 'other',
      item_name: '',
      quantity: 1,
      redemption_rule: 'once',
    };
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof PackageItemForm, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const getItemIcon = (type: PackageItemType) => {
    return ITEM_TYPE_OPTIONS.find(opt => opt.value === type)?.icon || '📦';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Package Contents</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">No items added yet</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addItem}
            className="mt-2"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div 
              key={item.id}
              className="p-3 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-2">
                <div className="mt-3 text-muted-foreground cursor-move">
                  <GripVertical className="w-4 h-4" />
                </div>
                
                <div className="flex-1 space-y-3">
                  {/* First Row: Type and Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Item Type</label>
                      <Select
                        value={item.item_type}
                        onValueChange={(value) => updateItem(index, 'item_type', value)}
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue>
                            <span className="flex items-center gap-2">
                              <span className="text-base">{getItemIcon(item.item_type)}</span>
                              <span className="font-medium">
                                {ITEM_TYPE_OPTIONS.find(opt => opt.value === item.item_type)?.label}
                              </span>
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_TYPE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className="flex items-center gap-2">
                                <span className="text-base">{opt.icon}</span>
                                <span>{opt.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Item Name</label>
                      <Input
                        value={item.item_name}
                        onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                        placeholder="e.g., VIP Entry, Champagne"
                        className="h-10"
                      />
                    </div>
                  </div>

                  {/* Second Row: Quantity and Redemption */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Quantity</label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Redemption Rule</label>
                      <Select
                        value={item.redemption_rule}
                        onValueChange={(value) => updateItem(index, 'redemption_rule', value)}
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REDEMPTION_RULE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  className="mt-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {items.length} item{items.length !== 1 ? 's' : ''} in this package
        </p>
      )}
    </div>
  );
}
