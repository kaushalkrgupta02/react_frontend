import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface StaffProfile {
  id: string;
  user_id: string;
  venue_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useStaffProfile() {
  const { user } = useAuth();
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStaffProfile(null);
      setIsLoading(false);
      return;
    }

    const fetchStaffProfile = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('staff_profiles')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;
        setStaffProfile(data);
      } catch (error) {
        console.error('Error fetching staff profile:', error);
        setStaffProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaffProfile();
  }, [user]);

  return {
    staffProfile,
    venueId: staffProfile?.venue_id || null,
    isLoading,
  };
}
