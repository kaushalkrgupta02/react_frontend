import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface VenueSocialCredential {
  id: string;
  venue_id: string;
  platform: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  account_id: string | null;
  account_name: string | null;
  is_active: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export function useVenueSocialCredentials(venueId?: string) {
  return useQuery({
    queryKey: ['venue-social-credentials', venueId],
    queryFn: async () => {
      if (!venueId) return [];

      const { data, error } = await supabase
        .from('venue_social_credentials')
        .select('*')
        .eq('venue_id', venueId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching social credentials:', error);
        throw error;
      }

      return data as VenueSocialCredential[];
    },
    enabled: !!venueId,
  });
}

export function useConfiguredPlatforms(venueId?: string) {
  const { data: credentials } = useVenueSocialCredentials(venueId);

  // App is always configured
  const configuredPlatforms = ['app'];
  
  if (credentials) {
    credentials.forEach((cred) => {
      if (cred.is_active && cred.access_token) {
        configuredPlatforms.push(cred.platform);
      }
    });
  }

  return configuredPlatforms;
}

export function useUpsertSocialCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      venueId,
      platform,
      accessToken,
      refreshToken,
      accountId,
      accountName,
      metadata,
    }: {
      venueId: string;
      platform: string;
      accessToken?: string;
      refreshToken?: string;
      accountId?: string;
      accountName?: string;
      metadata?: Json;
    }) => {
      // First try to get existing record
      const { data: existing } = await supabase
        .from('venue_social_credentials')
        .select('id')
        .eq('venue_id', venueId)
        .eq('platform', platform)
        .maybeSingle();

      let result;
      
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('venue_social_credentials')
          .update({
            access_token: accessToken || null,
            refresh_token: refreshToken || null,
            account_id: accountId || null,
            account_name: accountName || null,
            metadata: metadata || {},
            is_active: true,
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('venue_social_credentials')
          .insert([{
            venue_id: venueId,
            platform,
            access_token: accessToken || null,
            refresh_token: refreshToken || null,
            account_id: accountId || null,
            account_name: accountName || null,
            metadata: metadata || {},
            is_active: true,
          }])
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['venue-social-credentials', variables.venueId] });
      toast.success(`${variables.platform} connected successfully!`);
    },
    onError: (error) => {
      console.error('Error saving social credential:', error);
      toast.error('Failed to save credentials');
    },
  });
}

export function useDeleteSocialCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ venueId, platform }: { venueId: string; platform: string }) => {
      const { error } = await supabase
        .from('venue_social_credentials')
        .delete()
        .eq('venue_id', venueId)
        .eq('platform', platform);

      if (error) throw error;
      return { venueId, platform };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['venue-social-credentials', data.venueId] });
      toast.success('Platform disconnected');
    },
    onError: (error) => {
      console.error('Error deleting social credential:', error);
      toast.error('Failed to disconnect platform');
    },
  });
}
