import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Extended roles for venue staff
export type AppRole = 
  | 'admin' 
  | 'venue_manager' 
  | 'user'
  | 'guest' 
  | 'manager' 
  | 'reception' 
  | 'waitress' 
  | 'kitchen' 
  | 'bar';

function isTestMode(): boolean {
  return sessionStorage.getItem('testModeAuth') === 'true';
}

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    // Test mode: grant full access (admin + venue_manager + manager)
    if (isTestMode()) {
      setRoles(['admin', 'venue_manager', 'manager', 'user']);
      setIsLoading(false);
      return;
    }

    const fetchRoles = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;
        setRoles((data?.map(r => r.role) as AppRole[]) || []);
      } catch (error) {
        console.error('Error fetching user roles:', error);
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isVenueManager = hasRole('venue_manager');
  const isManager = hasRole('manager');
  const isReception = hasRole('reception');
  const isWaitress = hasRole('waitress');
  const isKitchen = hasRole('kitchen');
  const isBar = hasRole('bar');
  
  const canAccessDashboard = isAdmin || isVenueManager || isManager;
  const canManageStaff = isAdmin || isManager;
  const canAccessPOS = isAdmin || isManager || isWaitress || isReception;
  const canAccessKitchen = isAdmin || isManager || isKitchen;
  const canAccessBar = isAdmin || isManager || isBar;

  return {
    roles,
    isLoading,
    hasRole,
    isAdmin,
    isVenueManager,
    isManager,
    isReception,
    isWaitress,
    isKitchen,
    isBar,
    canAccessDashboard,
    canManageStaff,
    canAccessPOS,
    canAccessKitchen,
    canAccessBar,
  };
}
