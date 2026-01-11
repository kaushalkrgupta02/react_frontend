import { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, X, ChevronRight, ChevronLeft, Sparkles, BookmarkPlus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VenuePackage, PACKAGE_TYPE_OPTIONS, PackageType } from '@/hooks/useVenuePackages';
import { usePackageItems, PackageItemType, RedemptionRule } from '@/hooks/usePackageItems';
import { usePackageTemplates, PackageTemplate } from '@/hooks/usePackageTemplates';
import PackageItemsBuilder, { PackageItemForm } from './PackageItemsBuilder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPackage: VenuePackage | null;
  venueId: string;
  venueName?: string;
  onSave: (data: Partial<VenuePackage>, items: PackageItemForm[]) => Promise<{ success: boolean; packageId?: string }>;
}

type Step = 'basics' | 'items' | 'settings';

export default function EnhancedPackageDialog({
  open,
  onOpenChange,
  editingPackage,
  venueId,
  venueName,
  onSave,
}: EnhancedPackageDialogProps) {
  const [step, setStep] = useState<Step>('basics');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Templates
  const { templates, defaultTemplates, customTemplates, saveTemplate, deleteTemplate } = usePackageTemplates();
  const [showTemplates, setShowTemplates] = useState(true);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    package_type: 'custom' as PackageType,
    valid_from: '',
    valid_until: '',
    max_quantity: '',
    image_url: '',
    is_active: true,
  });
  
  const [items, setItems] = useState<PackageItemForm[]>([]);

  // Load existing items when editing
  const { items: existingItems, isLoading: itemsLoading } = usePackageItems(editingPackage?.id || null);

  useEffect(() => {
    if (editingPackage) {
      setFormData({
        name: editingPackage.name || '',
        description: editingPackage.description || '',
        price: editingPackage.price?.toString() || '',
        package_type: (editingPackage.package_type as PackageType) || 'custom',
        valid_from: editingPackage.valid_from || '',
        valid_until: editingPackage.valid_until || '',
        max_quantity: editingPackage.max_quantity?.toString() || '',
        image_url: editingPackage.image_url || '',
        is_active: editingPackage.is_active,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        package_type: 'custom',
        valid_from: '',
        valid_until: '',
        max_quantity: '',
        image_url: '',
        is_active: true,
      });
      setItems([]);
    }
    setStep('basics');
  }, [editingPackage, open]);

  useEffect(() => {
    if (existingItems.length > 0) {
      setItems(existingItems.map(item => ({
        id: item.id,
        item_type: item.item_type as PackageItemType,
        item_name: item.item_name,
        quantity: item.quantity,
        redemption_rule: item.redemption_rule as RedemptionRule,
      })));
    }
  }, [existingItems]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `package-${venueId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('venue-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('venue-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe the package you want to create');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-package-designer', {
        body: {
          prompt: aiPrompt,
          venueName: venueName,
          venueType: 'bar/nightclub',
        },
      });

      if (error) throw error;

      if (data?.success && data?.package) {
        const pkg = data.package;
        
        // Update form with AI-generated data
        setFormData(prev => ({
          ...prev,
          name: pkg.name || prev.name,
          description: pkg.description || prev.description,
          price: pkg.price?.toString() || prev.price,
          package_type: pkg.package_type || prev.package_type,
        }));

        // Update items
        if (pkg.items && Array.isArray(pkg.items)) {
          const newItems: PackageItemForm[] = pkg.items.map((item: any, index: number) => ({
            id: `ai-${Date.now()}-${index}`,
            item_type: item.item_type || 'other',
            item_name: item.item_name || 'Item',
            quantity: item.quantity || 1,
            redemption_rule: item.redemption_rule || 'once',
          }));
          setItems(newItems);
        }

        toast.success('Package generated! Review and customize as needed.');
        setAiPrompt('');
      } else {
        throw new Error(data?.error || 'Failed to generate package');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate package. Try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Package name is required');
      return;
    }

    setIsSaving(true);
    const packageData: Partial<VenuePackage> = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price: formData.price ? parseFloat(formData.price) : null,
      package_type: formData.package_type,
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null,
      max_quantity: formData.max_quantity ? parseInt(formData.max_quantity) : null,
      image_url: formData.image_url || null,
      is_active: formData.is_active,
    };

    const result = await onSave(packageData, items);
    setIsSaving(false);

    if (result.success) {
      onOpenChange(false);
    }
  };

  const steps: { id: Step; label: string }[] = [
    { id: 'basics', label: 'Basic Info' },
    { id: 'items', label: 'Package Items' },
    { id: 'settings', label: 'Settings' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);
  const canGoBack = currentStepIndex > 0;
  const canGoNext = currentStepIndex < steps.length - 1;
  const isLastStep = currentStepIndex === steps.length - 1;

  const goNext = () => {
    if (canGoNext) {
      setStep(steps[currentStepIndex + 1].id);
    }
  };

  const goBack = () => {
    if (canGoBack) {
      setStep(steps[currentStepIndex - 1].id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border w-[1100px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{editingPackage ? 'Edit Package' : 'Create Package'}</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 pb-4 border-b border-border">
          {steps.map((s, index) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => setStep(s.id)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  step === s.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto py-4 pr-3 space-y-4"
          style={{ scrollbarWidth: 'thin' }}
        >
          {step === 'basics' && (
            <>
              {/* AI Generator */}
              {!editingPackage && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Generate with AI</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., VIP bottle service for 6 people..."
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && !isGeneratingAI && handleGenerateWithAI()}
                    />
                    <Button
                      onClick={handleGenerateWithAI}
                      disabled={isGeneratingAI || !aiPrompt.trim()}
                      size="sm"
                    >
                      {isGeneratingAI ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Describe your package and AI will create name, description, price, and items
                  </p>
                </div>
              )}

              {/* Templates Section */}
              {!editingPackage && (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookmarkPlus className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Templates</span>
                      <span className="text-xs text-muted-foreground">({templates.length})</span>
                    </div>
                    {showTemplates ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {showTemplates && (
                    <div className="p-3 pt-0 space-y-3">
                      {/* Default Templates */}
                      {defaultTemplates.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">Quick Start</p>
                          <div className="grid grid-cols-2 gap-2">
                            {defaultTemplates.map((template) => (
                              <button
                                key={template.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    name: template.packageName,
                                    description: template.description,
                                    price: template.price.toString(),
                                    package_type: template.packageType,
                                  }));
                                  setItems(template.items.map((item, idx) => ({
                                    id: `tpl-${idx}`,
                                    item_type: item.item_type,
                                    item_name: item.item_name,
                                    quantity: item.quantity,
                                    redemption_rule: item.redemption_rule,
                                  })));
                                  toast.success(`${template.name} template loaded`);
                                }}
                                className="flex items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                              >
                                <span className="text-xl">{template.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                                  <p className="text-xs text-muted-foreground">Rp {(template.price / 1000000).toFixed(1)}M</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom Templates */}
                      {customTemplates.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">Saved Templates</p>
                          <div className="space-y-2">
                            {customTemplates.map((template) => (
                              <div
                                key={template.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      name: template.packageName,
                                      description: template.description,
                                      price: template.price.toString(),
                                      package_type: template.packageType,
                                    }));
                                    setItems(template.items.map((item, idx) => ({
                                      id: `tpl-${idx}`,
                                      item_type: item.item_type,
                                      item_name: item.item_name,
                                      quantity: item.quantity,
                                      redemption_rule: item.redemption_rule,
                                    })));
                                    toast.success(`${template.name} template loaded`);
                                  }}
                                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                                >
                                  <span className="text-xl">{template.icon}</span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{template.packageName}</p>
                                  </div>
                                </button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    deleteTemplate(template.id);
                                    toast.success('Template deleted');
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Package Type */}
              <div>
                <label className="text-sm font-medium text-foreground">Package Type</label>
                <Select
                  value={formData.package_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, package_type: value as PackageType }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGE_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Name */}
              <div>
                <label className="text-sm font-medium text-foreground">Package Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., New Year's VIP Table"
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What's included in this package..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Price */}
              <div>
                <label className="text-sm font-medium text-foreground">Price (IDR)</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="500000"
                  className="mt-1"
                />
              </div>

              {/* Image */}
              <div>
                <label className="text-sm font-medium text-foreground">Package Image</label>
                <div className="mt-2 flex items-center gap-4">
                  {formData.image_url ? (
                    <div className="relative">
                      <img 
                        src={formData.image_url} 
                        alt="Package" 
                        className="w-20 h-20 rounded-lg object-cover border border-border"
                      />
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30">
                      <span className="text-2xl">
                        {PACKAGE_TYPE_OPTIONS.find(o => o.value === formData.package_type)?.icon || '📦'}
                      </span>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
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
                    {formData.image_url ? 'Change' : 'Upload'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 'items' && (
            <>
              {itemsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <PackageItemsBuilder items={items} onChange={setItems} />
              )}
            </>
          )}

          {step === 'settings' && (
            <>
              {/* Validity Period */}
              <div>
                <label className="text-sm font-medium text-foreground">Validity Period</label>
                <p className="text-xs text-muted-foreground mb-2">When can this package be purchased?</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">From</label>
                    <Input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Until</label>
                    <Input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Max Quantity */}
              <div>
                <label className="text-sm font-medium text-foreground">Maximum Quantity</label>
                <p className="text-xs text-muted-foreground mb-2">Leave empty for unlimited</p>
                <Input
                  type="number"
                  min={1}
                  value={formData.max_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_quantity: e.target.value }))}
                  placeholder="Unlimited"
                  className="mt-1"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between py-3 border-t border-border">
                <div>
                  <span className="text-sm font-medium text-foreground">Active</span>
                  <p className="text-xs text-muted-foreground">Package is available for purchase</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              {/* Save as Template */}
              {!editingPackage && formData.name && (
                <div className="p-4 bg-card rounded-xl border border-border">
                  {!showSaveTemplate ? (
                    <Button
                      type="button"
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
                          placeholder="e.g., My VIP Package"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (!templateName.trim()) {
                              toast.error('Please enter a template name');
                              return;
                            }
                            saveTemplate({
                              name: templateName.trim(),
                              packageName: formData.name,
                              description: formData.description,
                              price: parseFloat(formData.price) || 0,
                              packageType: formData.package_type,
                              items: items.map(i => ({
                                item_type: i.item_type,
                                item_name: i.item_name,
                                quantity: i.quantity,
                                redemption_rule: i.redemption_rule,
                              })),
                              icon: '📦',
                            });
                            toast.success('Template saved!');
                            setShowSaveTemplate(false);
                            setTemplateName('');
                          }}
                        >
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setShowSaveTemplate(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="bg-secondary/30 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-foreground mb-2">Package Summary</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {formData.name || '—'}</p>
                  <p><span className="text-muted-foreground">Price:</span> {formData.price ? `Rp ${parseInt(formData.price).toLocaleString()}` : '—'}</p>
                  <p><span className="text-muted-foreground">Items:</span> {items.length} items</p>
                  <p><span className="text-muted-foreground">Status:</span> {formData.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={!canGoBack}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !formData.name.trim()}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingPackage ? 'Update Package' : 'Create Package'}
            </Button>
          ) : (
            <Button onClick={goNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
