import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PackageType = 'entry' | 'bottle' | 'food' | 'experience' | 'event' | 'custom';

export interface VenuePackage {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  price: number | null;
  availability_start: string | null;
  availability_end: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // New fields
  package_type: PackageType | null;
  valid_from: string | null;
  valid_until: string | null;
  max_quantity: number | null;
  sold_count: number;
  image_url: string | null;
}

export const PACKAGE_TYPE_OPTIONS: { value: PackageType; label: string; icon: string; description: string }[] = [
  { value: 'entry', label: 'Entry Package', icon: '🚪', description: 'Entry + extras' },
  { value: 'bottle', label: 'Bottle Service', icon: '🍾', description: 'Table + bottles' },
  { value: 'food', label: 'Food Package', icon: '🍽️', description: 'Meals & drinks' },
  { value: 'experience', label: 'Experience', icon: '⭐', description: 'Special events' },
  { value: 'event', label: 'Event Package', icon: '🎉', description: 'Special occasion' },
  { value: 'custom', label: 'Custom', icon: '📦', description: 'Build your own' },
];

export function useVenuePackages(venueId: string | null) {
  const [packages, setPackages] = useState<VenuePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPackages = useCallback(async () => {
    if (!venueId) {
      setPackages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('venue_packages')
        .select('*')
        .eq('venue_id', venueId)
        .order('sort_order')
        .order('created_at');

      if (error) throw error;
      setPackages(data as VenuePackage[]);
    } catch (error) {
      console.error('Error fetching packages:', error);
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const createPackage = async (
    packageData: Partial<Omit<VenuePackage, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>
  ): Promise<{ success: boolean; error?: string; data?: VenuePackage }> => {
    if (!venueId) return { success: false, error: 'No venue selected' };

    try {
      const { data, error } = await supabase
        .from('venue_packages')
        .insert({
          venue_id: venueId,
          name: packageData.name || 'New Package',
          description: packageData.description,
          price: packageData.price,
          package_type: packageData.package_type || 'custom',
          valid_from: packageData.valid_from,
          valid_until: packageData.valid_until,
          max_quantity: packageData.max_quantity,
          image_url: packageData.image_url,
          is_active: packageData.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchPackages();
      return { success: true, data: data as VenuePackage };
    } catch (error: any) {
      console.error('Error creating package:', error);
      return { success: false, error: error.message };
    }
  };

  const updatePackage = async (
    packageId: string,
    updates: Partial<Omit<VenuePackage, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('venue_packages')
        .update(updates)
        .eq('id', packageId);

      if (error) throw error;
      await fetchPackages();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating package:', error);
      return { success: false, error: error.message };
    }
  };

  const deletePackage = async (packageId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('venue_packages')
        .delete()
        .eq('id', packageId);

      if (error) throw error;
      await fetchPackages();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting package:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    packages,
    isLoading,
    createPackage,
    updatePackage,
    deletePackage,
    refetch: fetchPackages,
  };
}
