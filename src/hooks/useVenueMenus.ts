import { useEffect, useState } from 'react';
import { fetchVenueMenus } from '@/lib/menuApi';

export function useVenueMenus(venueId: string | null) {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!venueId) {
      setMenus([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetchVenueMenus(venueId)
      .then(setMenus)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [venueId]);

  return { menus, loading, error };
}
