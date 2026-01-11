import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VenuePOSSettings {
  id: string;
  venue_id: string;
  tax_rate: number;
  service_charge_rate: number;
  currency: string;
  auto_print_kitchen: boolean;
  auto_print_bar: boolean;
  require_table_for_orders: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<VenuePOSSettings, 'id' | 'venue_id' | 'created_at' | 'updated_at'> = {
  tax_rate: 10,
  service_charge_rate: 5,
  currency: 'IDR',
  auto_print_kitchen: false,
  auto_print_bar: false,
  require_table_for_orders: true
};

export function useVenuePOSSettings(venueId: string | null) {
  const [settings, setSettings] = useState<VenuePOSSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!venueId) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('venue_pos_settings')
        .select('*')
        .eq('venue_id', venueId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as VenuePOSSettings);
      } else {
        // Create default settings if none exist
        const { data: newSettings, error: createError } = await supabase
          .from('venue_pos_settings')
          .insert({
            venue_id: venueId,
            ...DEFAULT_SETTINGS
          })
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings as VenuePOSSettings);
      }
    } catch (error) {
      console.error('Error fetching POS settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<VenuePOSSettings>): Promise<boolean> => {
    if (!venueId || !settings) return false;

    try {
      const { error } = await supabase
        .from('venue_pos_settings')
        .update(updates)
        .eq('venue_id', venueId);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Settings updated');
      return true;
    } catch (error) {
      console.error('Error updating POS settings:', error);
      toast.error('Failed to update settings');
      return false;
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    refetch: fetchSettings
  };
}
