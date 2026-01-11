import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchVenueMenus, fetchMenuItems, createMenu as apiCreateMenu, updateMenu as apiUpdateMenu, deleteMenu as apiDeleteMenu, createMenuItem as apiCreateMenuItem, updateMenuItem as apiUpdateMenuItem, deleteMenuItem as apiDeleteMenuItem } from '@/lib/menuApi';
import { toast } from 'sonner';

export interface Menu {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  is_available: boolean;
  dietary_tags: string[];
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useMenus(venueId: string | null) {
  const queryClient = useQueryClient();

  const { data: menus = [], isLoading: menusLoading } = useQuery({
    queryKey: ['menus', venueId],
    queryFn: async () => {
      if (!venueId) return [];
      return await fetchVenueMenus(venueId);
    },
    enabled: !!venueId,
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  // Prefetch items for the first menu to make UX snappier
  useEffect(() => {
    if (menus && menus.length > 0) {
      const firstMenuId = menus[0].id;
      queryClient.prefetchQuery(['menu-items', firstMenuId], () => fetchMenuItems(firstMenuId));
    }
  }, [menus, queryClient]);

  const createMenu = useMutation({
    mutationFn: async (menu: Partial<Menu> & { venue_id: string; name: string }) => {
      // Call backend to create menu
      return await apiCreateMenu(menu.venue_id, { name: menu.name, description: (menu as any).description || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus', venueId] });
      toast.success('Menu created');
    },
    onError: (error) => {
      console.error('Error creating menu:', error);
      toast.error('Failed to create menu');
    },
  });

  const updateMenu = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Menu> & { id: string }) => {
      return await apiUpdateMenu(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus', venueId] });
      toast.success('Menu updated');
    },
    onError: (error) => {
      console.error('Error updating menu:', error);
      toast.error('Failed to update menu');
    },
  });

  const deleteMenu = useMutation({
    mutationFn: async (menuId: string) => {
      return await apiDeleteMenu(menuId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus', venueId] });
      toast.success('Menu deleted');
    },
    onError: (error) => {
      console.error('Error deleting menu:', error);
      toast.error('Failed to delete menu');
    },
  });

  return {
    menus,
    isLoading: menusLoading,
    createMenu: createMenu.mutateAsync,
    updateMenu: updateMenu.mutateAsync,
    deleteMenu: deleteMenu.mutateAsync,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['menus', venueId] }),
  };
}

export function useMenuItems(menuId: string | null) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ['menu-items', menuId],
    queryFn: async () => {
      if (!menuId) return [];
      return await fetchMenuItems(menuId);
    },
    enabled: !!menuId,
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  const createItem = useMutation({
    mutationFn: async (item: Partial<MenuItem> & { menu_id: string; name: string }) => {
      return await apiCreateMenuItem(item.menu_id, { name: item.name, description: (item as any).description || null, price: (item as any).price || null, category: (item as any).category || null, dietary_tags: (item as any).dietary_tags || [], is_available: (item as any).is_available, image_url: (item as any).image_url || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', menuId] });
      toast.success('Item added');
    },
    onError: (error) => {
      console.error('Error creating item:', error);
      toast.error('Failed to add item');
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MenuItem> & { id: string }) => {
      return await apiUpdateMenuItem(id, updates as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', menuId] });
      toast.success('Item updated');
    },
    onError: (error) => {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiDeleteMenuItem(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', menuId] });
      toast.success('Item deleted');
    },
    onError: (error) => {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    },
  });

  const bulkCreateItems = useMutation({
    mutationFn: async (items: Array<Partial<MenuItem> & { menu_id: string; name: string }>) => {
      // Create items one-by-one via API (no bulk endpoint available)
      const created = await Promise.all(items.map(it => apiCreateMenuItem(it.menu_id, { name: it.name, description: (it as any).description || null, price: (it as any).price || null, category: (it as any).category || null, dietary_tags: (it as any).dietary_tags || [], is_available: (it as any).is_available, image_url: (it as any).image_url || null })));
      return created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', menuId] });
      toast.success(`${data.length} items added`);
    },
    onError: (error) => {
      console.error('Error creating items:', error);
      toast.error('Failed to add items');
    },
  });

  return {
    items,
    isLoading: itemsLoading,
    refetch: refetchItems,
    createItem: createItem.mutateAsync,
    updateItem: updateItem.mutateAsync,
    deleteItem: deleteItem.mutateAsync,
    bulkCreateItems: bulkCreateItems.mutateAsync,
  };
}
