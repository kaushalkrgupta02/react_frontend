import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withApiBase } from '@/lib/config';
import { getAuthHeader } from '@/lib/utilsAuth';

export interface Promo {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  deep_link: string | null;
  created_at: string;
  venue_id: string | null;
}

export function usePromos() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPromos = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('promos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch promos:', error);
        setIsLoading(false);
        return;
      }

      setPromos((data ?? []) as Promo[]);
      setIsLoading(false);
    };

    fetchPromos();
  }, []);

  return { promos, isLoading };
}

export function usePromo(id: string | undefined) {
  const [promo, setPromo] = useState<Promo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const fetchPromo = async () => {
      setIsLoading(true);
      try {
        const url = withApiBase(`/api/v1/venues/promos/${encodeURIComponent(id)}`);
        const headers = { ...(await getAuthHeader()) };
        const res = await fetch(url, { headers });
        if (!res.ok) {
          console.error('Failed to fetch promo via API:', await res.text());
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setPromo(data as Promo | null);
      } catch (error) {
        console.error('Failed to fetch promo via API:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromo();
  }, [id]);

  return { promo, isLoading };
}