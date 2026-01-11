import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProviderMapping {
  id: string;
  venue_id: string;
  provider: 'tablecheck' | 'opentable' | 'sevenrooms' | 'chope' | 'grab' | 'resy';
  provider_venue_id: string;
  policies: Record<string, any>;
  seating_types: string[];
  timezone: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProviderMappingParams {
  venue_id: string;
  provider: ProviderMapping['provider'];
  provider_venue_id: string;
  api_credentials?: {
    apiKey: string;
    shopId?: string;
  };
  policies?: Record<string, any>;
  seating_types?: string[];
}

export function useProviderMappings(venueId?: string) {
  const [mappings, setMappings] = useState<ProviderMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = useCallback(async () => {
    if (!venueId) {
      setMappings([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('venue_provider_mappings')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMappings((data as unknown as ProviderMapping[]) || []);
    } catch (err: any) {
      console.error('Error fetching provider mappings:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const createMapping = async (params: CreateProviderMappingParams): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: insertError } = await supabase
        .from('venue_provider_mappings')
        .insert({
          venue_id: params.venue_id,
          provider: params.provider,
          provider_venue_id: params.provider_venue_id,
          api_credentials_encrypted: params.api_credentials ? JSON.stringify(params.api_credentials) : null,
          policies: params.policies || {},
          seating_types: params.seating_types || [],
          is_active: true,
        });

      if (insertError) throw insertError;
      await fetchMappings();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating provider mapping:', err);
      return { success: false, error: err.message };
    }
  };

  const updateMapping = async (
    mappingId: string, 
    updates: Partial<CreateProviderMappingParams> & { is_active?: boolean; sync_enabled?: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const updateData: any = {};
      
      if (updates.provider_venue_id !== undefined) updateData.provider_venue_id = updates.provider_venue_id;
      if (updates.api_credentials) updateData.api_credentials_encrypted = JSON.stringify(updates.api_credentials);
      if (updates.policies !== undefined) updateData.policies = updates.policies;
      if (updates.seating_types !== undefined) updateData.seating_types = updates.seating_types;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.sync_enabled !== undefined) updateData.sync_enabled = updates.sync_enabled;

      const { error: updateError } = await supabase
        .from('venue_provider_mappings')
        .update(updateData)
        .eq('id', mappingId);

      if (updateError) throw updateError;
      await fetchMappings();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating provider mapping:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteMapping = async (mappingId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: deleteError } = await supabase
        .from('venue_provider_mappings')
        .delete()
        .eq('id', mappingId);

      if (deleteError) throw deleteError;
      await fetchMappings();
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting provider mapping:', err);
      return { success: false, error: err.message };
    }
  };

  const testConnection = async (mappingId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const mapping = mappings.find(m => m.id === mappingId);
      if (!mapping) throw new Error('Mapping not found');

      const { data, error: invokeError } = await supabase.functions.invoke('reservation-api', {
        body: {
          action: 'availability',
          venueId: mapping.venue_id,
          date: new Date().toISOString().split('T')[0],
          partySize: 2,
        }
      });

      if (invokeError) throw invokeError;
      
      return { success: true };
    } catch (err: any) {
      console.error('Error testing connection:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    mappings,
    isLoading,
    error,
    createMapping,
    updateMapping,
    deleteMapping,
    testConnection,
    refetch: fetchMappings,
  };
}
