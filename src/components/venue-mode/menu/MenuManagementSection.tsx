import { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  UtensilsCrossed, 
  ChevronDown,
  ChevronRight,
  Sparkles,
  Lightbulb,
  X,
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMenus, useMenuItems, Menu, MenuItem } from '@/hooks/useMenus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MenuReview {
  overallAssessment: string;
  suggestions: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }>;
  itemImprovements: Array<{
    itemName: string;
    currentIssue: string;
    suggestedChange: string;
  }>;
  missingOpportunities: string[];
  quickWins: string[];
}

interface MenuManagementSectionProps {
  venueId: string | null;
}

export default function MenuManagementSection({ venueId }: MenuManagementSectionProps) {
  const { menus, isLoading, createMenu, updateMenu, deleteMenu, refetch } = useMenus(venueId);
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [menuForm, setMenuForm] = useState({ name: '', description: '' });
  const [dialogTab, setDialogTab] = useState<'manual' | 'ai'>('manual');

  // AI generation state
  const [aiForm, setAiForm] = useState({
    menuName: '',
    cuisineType: 'International',
    menuType: 'Food & Drinks',
    itemCount: '10',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // AI extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI review state
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [menuReview, setMenuReview] = useState<MenuReview | null>(null);

  const handleOpenMenuDialog = (menu?: Menu) => {
    if (menu) {
      setEditingMenu(menu);
      setMenuForm({ name: menu.name, description: menu.description || '' });
      setDialogTab('manual');
    } else {
      setEditingMenu(null);
      setMenuForm({ name: '', description: '' });
      setAiForm({ menuName: '', cuisineType: 'International', menuType: 'Food & Drinks', itemCount: '10' });
    }
    setIsMenuDialogOpen(true);
  };

  const handleSaveMenu = async () => {
    if (!venueId || !menuForm.name.trim()) return;

    if (editingMenu) {
      await updateMenu({ 
        id: editingMenu.id, 
        name: menuForm.name.trim(),
        description: menuForm.description.trim() || null
      });
    } else {
      await createMenu({ 
        venue_id: venueId, 
        name: menuForm.name.trim(),
        description: menuForm.description.trim() || null
      });
    }
    setIsMenuDialogOpen(false);
    setMenuForm({ name: '', description: '' });
  };

  const handleAIGenerate = async () => {
    if (!venueId) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-menu', {
        body: {
          venueId,
          menuName: aiForm.menuName.trim() || undefined,
          cuisineType: aiForm.cuisineType,
          menuType: aiForm.menuType,
          itemCount: parseInt(aiForm.itemCount) || 10,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Created "${data.menuName}" with ${data.itemsCreated} items`);
        await refetch(); // Refresh the menu list
        setIsMenuDialogOpen(false);
        setAiForm({ menuName: '', cuisineType: 'International', menuType: 'Food & Drinks', itemCount: '10' });
      } else {
        throw new Error(data?.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(error.message || 'Failed to generate menu');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !venueId) return;

    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF, image, Excel, or CSV file');
      return;
    }

    setIsExtracting(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('extract-menu', {
        body: {
          venueId,
          fileBase64: base64,
          fileName: file.name,
          fileType: file.type,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Extracted ${data.itemsCreated} items from ${file.name}`);
      } else {
        throw new Error(data?.error || 'Extraction failed');
      }
    } catch (error) {
      console.error('Menu extraction error:', error);
      toast.error('Failed to extract menu. Please try again or add items manually.');
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAIReview = async () => {
    if (!venueId || menus.length === 0) {
      toast.error('Add some menu items first before requesting a review');
      return;
    }

    setIsReviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('review-menu', {
        body: { venueId },
      });

      if (error) throw error;

      if (data?.success && data?.review) {
        setMenuReview(data.review);
        setReviewSheetOpen(true);
      } else {
        throw new Error(data?.error || 'Review failed');
      }
    } catch (error: any) {
      console.error('Menu review error:', error);
      toast.error(error.message || 'Failed to review menu. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'medium': return 'bg-amber-500/20 text-amber-600 border-amber-500/30';
      case 'low': return 'bg-primary/20 text-primary border-primary/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!venueId) {
    return (
      <div className="text-center py-8">
        <UtensilsCrossed className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">Select a venue to manage menus</p>
      </div>
    );
  }

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
        Create and manage your venue's menus. Upload a file to automatically extract menu items using AI.
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenMenuDialog()}>
              <Plus className="w-4 h-4 mr-1" />
              Add Menu
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMenu ? 'Edit Menu' : 'Create Menu'}</DialogTitle>
            </DialogHeader>
            
            {editingMenu ? (
              // Edit mode - only show manual form
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Menu Name *</Label>
                  <Input
                    value={menuForm.name}
                    onChange={(e) => setMenuForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Drinks, Food, Desserts"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={menuForm.description}
                    onChange={(e) => setMenuForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>
                <Button onClick={handleSaveMenu} className="w-full" disabled={!menuForm.name.trim()}>
                  Save Changes
                </Button>
              </div>
            ) : (
              // Create mode - show tabs for manual vs AI
              <Tabs value={dialogTab} onValueChange={(v) => setDialogTab(v as 'manual' | 'ai')} className="pt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                  <TabsTrigger value="ai" className="flex items-center gap-1">
                    <Wand2 className="w-3.5 h-3.5" />
                    AI Generate
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Menu Name *</Label>
                    <Input
                      value={menuForm.name}
                      onChange={(e) => setMenuForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Drinks, Food, Desserts"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={menuForm.description}
                      onChange={(e) => setMenuForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Optional description..."
                      rows={2}
                    />
                  </div>
                  <Button onClick={handleSaveMenu} className="w-full" disabled={!menuForm.name.trim()}>
                    Create Menu
                  </Button>
                </TabsContent>
                
                <TabsContent value="ai" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Menu Name (optional)</Label>
                    <Input
                      value={aiForm.menuName}
                      onChange={(e) => setAiForm(p => ({ ...p, menuName: e.target.value }))}
                      placeholder="AI will suggest a name if empty"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Cuisine Type</Label>
                      <Select 
                        value={aiForm.cuisineType} 
                        onValueChange={(v) => setAiForm(p => ({ ...p, cuisineType: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="International">International</SelectItem>
                          <SelectItem value="Indonesian">Indonesian</SelectItem>
                          <SelectItem value="Japanese">Japanese</SelectItem>
                          <SelectItem value="Italian">Italian</SelectItem>
                          <SelectItem value="Mexican">Mexican</SelectItem>
                          <SelectItem value="Thai">Thai</SelectItem>
                          <SelectItem value="Indian">Indian</SelectItem>
                          <SelectItem value="American">American</SelectItem>
                          <SelectItem value="Mediterranean">Mediterranean</SelectItem>
                          <SelectItem value="Chinese">Chinese</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Menu Type</Label>
                      <Select 
                        value={aiForm.menuType} 
                        onValueChange={(v) => setAiForm(p => ({ ...p, menuType: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Food & Drinks">Food & Drinks</SelectItem>
                          <SelectItem value="Food Only">Food Only</SelectItem>
                          <SelectItem value="Drinks Only">Drinks Only</SelectItem>
                          <SelectItem value="Cocktails">Cocktails</SelectItem>
                          <SelectItem value="Desserts">Desserts</SelectItem>
                          <SelectItem value="Brunch">Brunch</SelectItem>
                          <SelectItem value="Bar Snacks">Bar Snacks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Number of Items</Label>
                    <Select 
                      value={aiForm.itemCount} 
                      onValueChange={(v) => setAiForm(p => ({ ...p, itemCount: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 items</SelectItem>
                        <SelectItem value="10">10 items</SelectItem>
                        <SelectItem value="15">15 items</SelectItem>
                        <SelectItem value="20">20 items</SelectItem>
                        <SelectItem value="25">25 items</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={handleAIGenerate} 
                    className="w-full" 
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Menu with AI
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    AI will create a complete menu with items, descriptions & prices
                  </p>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isExtracting}
        >
          {isExtracting ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-1" />
          )}
          {isExtracting ? 'Extracting...' : 'Upload & Extract'}
        </Button>

        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleAIReview}
          disabled={isReviewing || menus.length === 0}
        >
          {isReviewing ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Lightbulb className="w-4 h-4 mr-1" />
          )}
          {isReviewing ? 'Analyzing...' : 'AI Review'}
        </Button>
      </div>

      {/* Supported formats hint */}
      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
        <span>Supported:</span>
        <Badge variant="outline" className="text-xs py-0">PDF</Badge>
        <Badge variant="outline" className="text-xs py-0">Excel</Badge>
        <Badge variant="outline" className="text-xs py-0">CSV</Badge>
        <Badge variant="outline" className="text-xs py-0">Images</Badge>
      </div>

      {/* Menus List */}
      {menus.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-xl">
          <UtensilsCrossed className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No menus yet</p>
          <p className="text-muted-foreground text-xs">Create a menu or upload a file to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {menus.map((menu) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              isExpanded={expandedMenuId === menu.id}
              onToggle={() => setExpandedMenuId(expandedMenuId === menu.id ? null : menu.id)}
              onEdit={() => handleOpenMenuDialog(menu)}
              onDelete={() => deleteMenu(menu.id)}
              onUpdate={updateMenu}
            />
          ))}
        </div>
      )}

      {/* AI Review Sheet */}
      <Sheet open={reviewSheetOpen} onOpenChange={setReviewSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              AI Menu Review
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="flex-1 -mx-6 px-6">
            {menuReview && (
              <div className="space-y-6 py-4">
                {/* Overall Assessment */}
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Overall Assessment</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {menuReview.overallAssessment}
                  </p>
                </div>

                {/* Quick Wins */}
                {menuReview.quickWins?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Quick Wins
                    </h4>
                    <ul className="space-y-1.5">
                      {menuReview.quickWins.map((win, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          {win}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {menuReview.suggestions?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Improvement Suggestions</h4>
                    <div className="space-y-3">
                      {menuReview.suggestions.map((suggestion, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-sm text-foreground">{suggestion.title}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs shrink-0 ${getPriorityColor(suggestion.priority)}`}
                            >
                              {suggestion.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                          <Badge variant="secondary" className="text-xs">{suggestion.category}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Item Improvements */}
                {menuReview.itemImprovements?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Item Improvements</h4>
                    <div className="space-y-2">
                      {menuReview.itemImprovements.map((item, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                          <span className="font-medium text-sm text-foreground">{item.itemName}</span>
                          <p className="text-xs text-destructive/80">Issue: {item.currentIssue}</p>
                          <p className="text-xs text-primary">Suggestion: {item.suggestedChange}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Opportunities */}
                {menuReview.missingOpportunities?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Missing Opportunities</h4>
                    <ul className="space-y-1.5">
                      {menuReview.missingOpportunities.map((opp, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-amber-500 mt-1">+</span>
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface MenuCardProps {
  menu: Menu;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (data: Partial<Menu> & { id: string }) => Promise<Menu>;
}

function MenuCard({ menu, isExpanded, onToggle, onEdit, onDelete, onUpdate }: MenuCardProps) {
  const { items, isLoading, createItem, updateItem, deleteItem } = useMenuItems(menu.id);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    dietary_tags: [] as string[],
  });

  const handleOpenItemDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        description: item.description || '',
        price: item.price?.toString() || '',
        category: item.category || '',
        dietary_tags: item.dietary_tags || [],
      });
    } else {
      setEditingItem(null);
      setItemForm({ name: '', description: '', price: '', category: '', dietary_tags: [] });
    }
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) return;

    const itemData = {
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || null,
      price: itemForm.price ? parseFloat(itemForm.price) : null,
      category: itemForm.category.trim() || null,
      dietary_tags: itemForm.dietary_tags,
    };

    try {
      if (editingItem) {
        await updateItem({ id: editingItem.id, ...itemData });
      } else {
        await createItem({ menu_id: menu.id, ...itemData });
      }
      setIsItemDialogOpen(false);
    } catch (err: any) {
      console.error('Save item error:', err);
      toast.error(err?.message || 'Failed to save item');
    }
  };

  const toggleDietaryTag = (tag: string) => {
    setItemForm(p => ({
      ...p,
      dietary_tags: p.dietary_tags.includes(tag)
        ? p.dietary_tags.filter(t => t !== tag)
        : [...p.dietary_tags, tag]
    }));
  };

  const dietaryOptions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Spicy', 'Contains Nuts'];

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <div>
            <h4 className="font-medium text-foreground">{menu.name}</h4>
            {menu.description && (
              <p className="text-xs text-muted-foreground">{menu.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Badge variant={menu.is_active ? 'default' : 'secondary'} className="text-xs">
            {(items?.length ?? 0)} items
          </Badge>
          <Switch
            checked={menu.is_active}
            onCheckedChange={(checked) => onUpdate({ id: menu.id, is_active: checked })}
          />
          <Button size="icon" variant="ghost" onClick={onEdit}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Menu?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete "{menu.name}" and all its items. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Items */}
      {isExpanded && (
        <div className="border-t border-border">
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No items in this menu</p>
            ) : (
              <div className="space-y-2">
                {(items ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">{item.name}</span>
                        {item.category && (
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        )}
                        {!item.is_available && (
                          <Badge variant="secondary" className="text-xs">Unavailable</Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      )}
                      {(item.dietary_tags?.length ?? 0) > 0 && (
                        <div className="flex gap-1 mt-1">
                          {(item.dietary_tags ?? []).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs py-0">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {item.price && (
                        <span className="text-sm font-medium text-foreground">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.price)}
                        </span>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenItemDialog(item)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove "{item.name}" from this menu?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteItem(item.id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Item Button */}
            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenItemDialog()}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Item Name *</Label>
                    <Input
                      value={itemForm.name}
                      onChange={(e) => setItemForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Margherita Pizza"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={itemForm.description}
                      onChange={(e) => setItemForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Optional description..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Price (IDR)</Label>
                      <Input
                        type="number"
                        value={itemForm.price}
                        onChange={(e) => setItemForm(p => ({ ...p, price: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input
                        value={itemForm.category}
                        onChange={(e) => setItemForm(p => ({ ...p, category: e.target.value }))}
                        placeholder="e.g., Starters"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dietary Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {dietaryOptions.map(tag => (
                        <Badge
                          key={tag}
                          variant={itemForm.dietary_tags.includes(tag) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleDietaryTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleSaveItem} className="w-full" disabled={!itemForm.name.trim()}>
                    {editingItem ? 'Save Changes' : 'Add Item'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
}
