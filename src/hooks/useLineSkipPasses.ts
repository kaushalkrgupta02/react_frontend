import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LineSkipPass {
  id: string;
  user_id: string;
  venue_id: string;
  purchase_date: string;
  status: 'active' | 'used' | 'refunded';
  price: number;
  pass_type: 'entry' | 'vip';
  free_item_claimed: boolean;
  created_at: string;
  venue?: {
    id: string;
    name: string;
    cover_image_url: string | null;
  };
}

export function useLineSkipPasses() {
  const { user } = useAuth();
  const [passes, setPasses] = useState<LineSkipPass[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPasses = useCallback(async () => {
    if (!user) {
      setPasses([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('line_skip_passes')
        .select(`
          *,
          venue:venues(id, name, cover_image_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPasses(data as LineSkipPass[]);
      setPasses(data as LineSkipPass[]);
    } catch (error) {
      console.error('Error fetching passes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPasses();
  }, [fetchPasses]);

  const purchasePass = async (venueId: string): Promise<{ success: boolean; passId?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // TODO: Integrate Stripe payment here before calling the purchase function
      // For POC, we proceed directly with the "purchase"

      const { data, error } = await supabase
        .rpc('purchase_line_skip_pass', {
          p_venue_id: venueId,
          p_user_id: user.id,
        });

      if (error) throw error;

      const result = data as { success: boolean; pass_id?: string; error?: string };

      if (result.success) {
        await fetchPasses();
        return { success: true, passId: result.pass_id };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Error purchasing pass:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    passes,
    isLoading,
    purchasePass,
    refetch: fetchPasses,
  };
}
