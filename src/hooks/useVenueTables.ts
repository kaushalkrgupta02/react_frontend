import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VenueTable {
  id: string;
  venue_id: string;
  table_number: string;
  seats: number;
  status: 'available' | 'reserved' | 'maintenance';
  location_zone: 'indoor' | 'outdoor' | 'vip' | 'terrace' | 'rooftop' | 'bar' | null;
  minimum_spend: number | null;
  notes: string | null;
  special_features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type VenueTableInsert = Omit<VenueTable, 'id' | 'created_at' | 'updated_at'>;
export type VenueTableUpdate = Partial<Omit<VenueTable, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>;

export function useVenueTables(venueId: string | null) {
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTables = useCallback(async () => {
    if (!venueId) {
      setTables([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('venue_tables')
        .select('*')
        .eq('venue_id', venueId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTables(data as VenueTable[]);
    } catch (error) {
      console.error('Error fetching venue tables:', error);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const addTable = async (
    tableData: Partial<VenueTableInsert>
  ): Promise<{ success: boolean; error?: string; table?: VenueTable }> => {
    if (!venueId) return { success: false, error: 'No venue selected' };

    try {
      const { data, error } = await supabase
        .from('venue_tables')
        .insert({
          venue_id: venueId,
          table_number: tableData.table_number || `Table ${tables.length + 1}`,
          seats: tableData.seats || 4,
          status: tableData.status || 'available',
          location_zone: tableData.location_zone || 'indoor',
          minimum_spend: tableData.minimum_spend || null,
          notes: tableData.notes || null,
          special_features: tableData.special_features || [],
          is_active: tableData.is_active ?? true,
          sort_order: tableData.sort_order ?? tables.length,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchTables();
      return { success: true, table: data as VenueTable };
    } catch (error: any) {
      console.error('Error adding table:', error);
      return { success: false, error: error.message };
    }
  };

  const updateTable = async (
    tableId: string,
    updates: VenueTableUpdate
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('venue_tables')
        .update(updates)
        .eq('id', tableId);

      if (error) throw error;
      await fetchTables();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating table:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteTable = async (
    tableId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('venue_tables')
        .delete()
        .eq('id', tableId);

      if (error) throw error;
      await fetchTables();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting table:', error);
      return { success: false, error: error.message };
    }
  };

  const totalSeats = tables.filter(t => t.is_active && t.status !== 'maintenance').reduce((sum, t) => sum + t.seats, 0);
  const availableTables = tables.filter(t => t.is_active && t.status === 'available').length;

  return {
    tables,
    isLoading,
    addTable,
    updateTable,
    deleteTable,
    refetch: fetchTables,
    totalSeats,
    availableTables,
  };
}
