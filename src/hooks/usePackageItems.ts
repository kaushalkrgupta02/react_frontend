import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PackageItemType = 'entry' | 'drink' | 'food' | 'experience' | 'other';
export type RedemptionRule = 'once' | 'multiple' | 'unlimited';

export interface PackageItem {
  id: string;
  package_id: string;
  item_type: PackageItemType;
  item_name: string;
  quantity: number;
  redemption_rule: RedemptionRule;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export const ITEM_TYPE_OPTIONS: { value: PackageItemType; label: string; icon: string }[] = [
  { value: 'entry', label: 'Entry', icon: '🚪' },
  { value: 'drink', label: 'Drink', icon: '🍾' },
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'experience', label: 'Experience', icon: '⭐' },
  { value: 'other', label: 'Other', icon: '📦' },
];

export const REDEMPTION_RULE_OPTIONS: { value: RedemptionRule; label: string; description: string }[] = [
  { value: 'once', label: 'One-time', description: 'Can only be redeemed once' },
  { value: 'multiple', label: 'Multiple', description: 'Can be redeemed in parts up to quantity' },
  { value: 'unlimited', label: 'Unlimited', description: 'No limit on redemptions' },
];

export function usePackageItems(packageId: string | null) {
  const [items, setItems] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!packageId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('package_items')
        .select('*')
        .eq('package_id', packageId)
        .order('sort_order');

      if (error) throw error;
      setItems(data as PackageItem[]);
    } catch (error) {
      console.error('Error fetching package items:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (
    itemData: Omit<PackageItem, 'id' | 'created_at'>
  ): Promise<{ success: boolean; error?: string; data?: PackageItem }> => {
    try {
      const { data, error } = await supabase
        .from('package_items')
        .insert(itemData)
        .select()
        .single();

      if (error) throw error;
      await fetchItems();
      return { success: true, data: data as PackageItem };
    } catch (error: any) {
      console.error('Error creating package item:', error);
      return { success: false, error: error.message };
    }
  };

  const updateItem = async (
    itemId: string,
    updates: Partial<Omit<PackageItem, 'id' | 'package_id' | 'created_at'>>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('package_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;
      await fetchItems();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating package item:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteItem = async (itemId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('package_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      await fetchItems();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting package item:', error);
      return { success: false, error: error.message };
    }
  };

  const bulkCreateItems = async (
    itemsData: Omit<PackageItem, 'id' | 'created_at'>[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (itemsData.length === 0) return { success: true };
    
    try {
      const { error } = await supabase
        .from('package_items')
        .insert(itemsData);

      if (error) throw error;
      await fetchItems();
      return { success: true };
    } catch (error: any) {
      console.error('Error bulk creating package items:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteAllItems = async (pkgId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('package_items')
        .delete()
        .eq('package_id', pkgId);

      if (error) throw error;
      await fetchItems();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting all package items:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    items,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
    bulkCreateItems,
    deleteAllItems,
    refetch: fetchItems,
  };
}
