import { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart, Search, ChefHat, Utensils, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMenus, useMenuItems } from '@/hooks/useMenus';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionOrders, OrderItem } from '@/hooks/useSessionOrders';
import { SessionOrder, SessionOrderItem } from '@/hooks/useTableSessions';
import { toast } from 'sonner';

interface OrderTakingSheetProps {
  venueId: string;
  sessionId: string | null;
  open: boolean;
  onClose: () => void;
  onOrderSubmitted: () => void;
  editingOrder?: SessionOrder | null; // Order to edit
}

interface CartItem extends OrderItem {
  id: string;
  existingItemId?: string; // If editing existing item
  isDeleted?: boolean; // Mark for deletion
}

export default function OrderTakingSheet({
  venueId,
  sessionId,
  open,
  onClose,
  onOrderSubmitted,
  editingOrder
}: OrderTakingSheetProps) {
  const { menus, refetch: refetchMenus } = useMenus(venueId);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const { items: menuItems, refetch: refetchMenuItems } = useMenuItems(selectedMenuId);
  const { createOrder, addItemsToOrder, updateItemQuantity, deleteOrderItem, isSubmitting } = useSessionOrders(sessionId);
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isEditMode = !!editingOrder;

  // Set first menu as default
  useEffect(() => {
    if (menus.length > 0 && !selectedMenuId) {
      setSelectedMenuId(menus[0].id);
    }
  }, [menus, selectedMenuId]);

  // Refetch menus and menu items when sheet is opened
  useEffect(() => {
    if (!open) return;
    // Only refetch if we have no menus cached or the cache is older than 60s
    const state = queryClient.getQueryState(['menus', venueId]);
    const lastUpdated = state?.dataUpdatedAt || 0;
    const now = Date.now();

    if (!menus || menus.length === 0 || (now - lastUpdated) > 60_000) {
      refetchMenus();
    }

    // For menu items, only refetch if selected menu has no cached items or is stale
    if (selectedMenuId) {
      const mState = queryClient.getQueryState(['menu-items', selectedMenuId]);
      const mLastUpdated = mState?.dataUpdatedAt || 0;
      if (!mState || !mState.data || (now - mLastUpdated) > 60_000) {
        refetchMenuItems();
      }
    }
  }, [open, refetchMenus, refetchMenuItems, selectedMenuId, menus, queryClient, venueId]);

  // Load existing order items when editing
  useEffect(() => {
    if (open && editingOrder?.items) {
      const existingItems: CartItem[] = editingOrder.items
        .filter(item => item.status !== 'cancelled')
        .map(item => ({
          id: item.id,
          existingItemId: item.id,
          menu_item_id: item.menu_item_id || undefined,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          destination: item.destination,
          notes: item.notes || undefined,
        }));
      setCart(existingItems);
      setOrderNotes(editingOrder.notes || '');
    } else if (!open) {
      setCart([]);
      setOrderNotes('');
      setSearchQuery('');
    }
  }, [open, editingOrder]);

  // Get unique categories
  const categories = [...new Set(menuItems.map(item => item.category || 'Other'))];

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory && item.is_available;
  });

  const addToCart = (item: typeof menuItems[0]) => {
    const existing = cart.find(c => c.menu_item_id === item.id);
    
    if (existing) {
      setCart(cart.map(c => 
        c.menu_item_id === item.id 
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, {
        id: item.id,
        menu_item_id: item.id,
        item_name: item.name,
        quantity: 1,
        unit_price: item.price || 0,
        destination: item.category?.toLowerCase().includes('drink') || 
                     item.category?.toLowerCase().includes('beverage') ||
                     item.category?.toLowerCase().includes('cocktail')
          ? 'bar' : 'kitchen'
      }]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart(cart.map(item => 
      item.id === itemId ? { ...item, notes } : item
    ));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const handleSubmitOrder = async () => {
    if (!sessionId) return;

    if (isEditMode && editingOrder) {
      // Handle edits: update quantities, delete removed items, add new items
      const existingItemIds = editingOrder.items?.map(i => i.id) || [];
      const currentItemIds = cart.filter(c => c.existingItemId).map(c => c.existingItemId!);
      
      // Items to delete (were in original but not in cart now)
      const itemsToDelete = existingItemIds.filter(id => !currentItemIds.includes(id));
      
      // Items with changed quantities
      const itemsToUpdate = cart.filter(c => {
        if (!c.existingItemId) return false;
        const original = editingOrder.items?.find(i => i.id === c.existingItemId);
        return original && original.quantity !== c.quantity;
      });
      
      // New items (no existingItemId)
      const newItems = cart.filter(c => !c.existingItemId);

      // Execute all changes
      await Promise.all([
        ...itemsToDelete.map(id => deleteOrderItem(id)),
        ...itemsToUpdate.map(item => updateItemQuantity(item.existingItemId!, item.quantity)),
      ]);

      if (newItems.length > 0) {
        await addItemsToOrder(editingOrder.id, newItems.map(({ id, existingItemId, ...item }) => item));
      }

      toast.success('Order updated');
      onOrderSubmitted();
      onClose();
    } else {
      // Create new order
      if (cart.length === 0) return;
      
      const result = await createOrder({
        session_id: sessionId,
        items: cart.map(({ id, existingItemId, ...item }) => item),
        notes: orderNotes || undefined
      });

      if (result) {
        onOrderSubmitted();
        onClose();
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center justify-between">
            <span>{isEditMode ? `Edit Order #${editingOrder?.order_number}` : 'Add Order'}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Menu Section */}
          <div className="flex-1 flex flex-col border-r border-border">
            {/* Menu Tabs */}
            {menus.length > 1 && (
              <div className="p-2 border-b border-border overflow-x-auto">
                <div className="flex gap-2">
                  {menus.map(menu => (
                    <Button
                      key={menu.id}
                      variant={selectedMenuId === menu.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedMenuId(menu.id)}
                    >
                      {menu.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            {categories.length > 1 && (
              <div className="p-2 border-b border-border overflow-x-auto">
                <div className="flex gap-2">
                  <Button
                    variant={selectedCategory === null ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All
                  </Button>
                  {categories.map(cat => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Items */}
            <ScrollArea className="flex-1">
              <div className="p-2 grid grid-cols-2 gap-2">
                {filteredItems.map(item => (
                  <Card
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-sm line-clamp-2">{item.name}</span>
                      {item.category?.toLowerCase().includes('drink') ? (
                        <Utensils className="w-3 h-3 text-blue-400 flex-shrink-0 ml-1" />
                      ) : (
                        <ChefHat className="w-3 h-3 text-orange-400 flex-shrink-0 ml-1" />
                      )}
                    </div>
                    <div className="text-sm text-primary font-medium">
                      {(item.price || 0).toLocaleString()}
                    </div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {item.description}
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No items found
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Cart Section */}
          <div className="w-72 flex flex-col bg-card">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Cart ({cart.length})
              </span>
              {cart.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCart([])}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {cart.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Tap items to add
                  </div>
                )}

                {cart.map(item => (
                  <Card key={item.id} className="p-2">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.item_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.unit_price.toLocaleString()} × {item.quantity} = {(item.unit_price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${item.destination === 'bar' ? 'text-blue-400' : 'text-orange-400'}`}
                      >
                        {item.destination}
                      </Badge>
                    </div>

                    <Input
                      placeholder="Notes..."
                      value={item.notes || ''}
                      onChange={(e) => updateItemNotes(item.id, e.target.value)}
                      className="mt-2 h-7 text-xs"
                    />
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border space-y-2">
              <Textarea
                placeholder="Order notes..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="h-16 text-sm resize-none"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-lg">{cartTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="p-4 border-t border-border">
          <Button 
            onClick={handleSubmitOrder}
            disabled={(cart.length === 0 && !isEditMode) || isSubmitting || !sessionId}
            className="w-full"
            size="lg"
          >
            {isSubmitting 
              ? 'Saving...' 
              : isEditMode 
                ? 'Save Changes' 
                : `Send Order (${cartTotal.toLocaleString()} IDR)`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
