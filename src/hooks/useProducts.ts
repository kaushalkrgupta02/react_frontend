import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  venue_id: string | null;
  type: 'line_skip' | 'package' | 'drink';
  name: string;
  description: string | null;
  price_idr: number;
  is_active: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  venue?: {
    id: string;
    name: string;
  } | null;
}

export function useProducts(options?: {
  type?: string;
  venueId?: string | null;
  includeGlobal?: boolean;
}) {
  const { type, venueId, includeGlobal = true } = options || {};

  return useQuery({
    queryKey: ['products', type, venueId, includeGlobal],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from('products')
        .select(`
          *,
          venues:venue_id (
            id,
            name
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (type) {
        query = query.eq('type', type);
      }

      if (venueId) {
        if (includeGlobal) {
          query = query.or(`venue_id.eq.${venueId},venue_id.is.null`);
        } else {
          query = query.eq('venue_id', venueId);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch products:', error);
        throw error;
      }

      return (data || []).map((p: any) => ({
        id: p.id,
        venue_id: p.venue_id,
        type: p.type as 'line_skip' | 'package' | 'drink',
        name: p.name,
        description: p.description,
        price_idr: p.price_idr,
        is_active: p.is_active,
        metadata: p.metadata,
        created_at: p.created_at,
        venue: p.venues ? {
          id: p.venues.id,
          name: p.venues.name,
        } : null,
      }));
    },
  });
}

export function useVenueLineSkipProduct(venueId: string | null | undefined) {
  return useQuery({
    queryKey: ['product', 'line_skip', venueId],
    enabled: !!venueId,
    queryFn: async (): Promise<Product | null> => {
      if (!venueId) return null;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('venue_id', venueId)
        .eq('type', 'line_skip')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch line skip product:', error);
        return null;
      }

      return data as Product | null;
    },
  });
}

export function useVenuePackageProducts(venueId: string | null | undefined) {
  return useQuery({
    queryKey: ['products', 'package', venueId],
    enabled: !!venueId,
    queryFn: async (): Promise<Product[]> => {
      if (!venueId) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('venue_id', venueId)
        .eq('type', 'package')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Failed to fetch package products:', error);
        return [];
      }

      return data as Product[];
    },
  });
}

export function useDrinkProducts(venueId?: string | null) {
  return useQuery({
    queryKey: ['products', 'drink', venueId],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from('products')
        .select(`
          *,
          venues:venue_id (
            id,
            name
          )
        `)
        .eq('type', 'drink')
        .eq('is_active', true)
        .order('name');

      // Get global drinks and venue-specific drinks
      if (venueId) {
        query = query.or(`venue_id.eq.${venueId},venue_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch drink products:', error);
        return [];
      }

      return (data || []).map((p: any) => ({
        id: p.id,
        venue_id: p.venue_id,
        type: 'drink' as const,
        name: p.name,
        description: p.description,
        price_idr: p.price_idr,
        is_active: p.is_active,
        metadata: p.metadata,
        created_at: p.created_at,
        venue: p.venues ? {
          id: p.venues.id,
          name: p.venues.name,
        } : null,
      }));
    },
  });
}
