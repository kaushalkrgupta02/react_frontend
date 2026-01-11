import { useState, useEffect, useRef } from 'react';
import { Users, Clock, DollarSign, Plus, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useVenueTables, VenueTable } from '@/hooks/useVenueTables';
import { useTableSessions, TableSession } from '@/hooks/useTableSessions';
import { formatDistanceToNow } from 'date-fns';
import { withApiBase } from '@/lib/config';
import { getAuthHeader } from '@/lib/utilsAuth';

interface LiveFloorViewProps {
  venueId: string;
  onTableClick: (table: VenueTable, session?: TableSession) => void;
  onOpenWalkIn: () => void;
}

export default function LiveFloorView({ venueId, onTableClick, onOpenWalkIn }: LiveFloorViewProps) {
const { tables, isLoading: tablesLoading, refetch: refetchTables } = useVenueTables(venueId);
  const { sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useTableSessions(venueId);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [availability, setAvailability] = useState<{ total: number; available: number; reserved: number; other: number; available_tables: { id: string; table_number: string; seats: number }[] } | null>(null);
  
  const isLoading = tablesLoading || sessionsLoading || availability === null;

  // Group tables by zone
  const zones = [...new Set(tables.map(t => t.location_zone || 'Main'))];
  
  const filteredTables = selectedZone 
    ? tables.filter(t => (t.location_zone || 'Main') === selectedZone)
    : tables;

  // Get session for a table
  const getTableSession = (tableId: string): TableSession | undefined => {
    return sessions.find(s => s.table_id === tableId);
  };

  // Calculate running total for a session
  const getSessionTotal = (session: TableSession): number => {
    let total = 0;
    session.orders?.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items?.forEach(item => {
          if (item.status !== 'cancelled') {
            total += item.quantity * item.unit_price;
          }
        });
      }
    });
    return total;
  };

  const getTableStatus = (table: VenueTable, session?: TableSession) => {
    if (!table.is_active) return 'inactive';
    if (table.status === 'maintenance') return 'maintenance';
    if (session) {
      if (session.status === 'billing') return 'billing';
      return 'occupied';
    }
    if (table.status === 'reserved') return 'reserved';
    return 'available';
  };

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    occupied: 'bg-primary/20 border-primary/50 text-primary',
    billing: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
    reserved: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    maintenance: 'bg-muted border-border text-muted-foreground',
    inactive: 'bg-muted/50 border-border/50 text-muted-foreground'
  };

  // Summary stats (use availability when available)
  const totalTables = availability ? availability.total : tables.filter(t => t.is_active).length;
  const occupiedTables = sessions.length;
  const availableTables = availability ? availability.available : Math.max(0, totalTables - occupiedTables);
  const totalGuests = sessions.reduce((sum, s) => sum + s.guest_count, 0);
  const totalRevenue = sessions.reduce((sum, s) => sum + getSessionTotal(s), 0);

  // Fetch availability (debounced) whenever venue or sessions change
  const availabilityAbortRef = useRef<AbortController | null>(null);
  const availabilityTimeoutRef = useRef<number | null>(null);

  const fetchAvailability = async (signal?: AbortSignal) => {
    if (!venueId) return;
    try {
      const url = withApiBase(`/api/v1/sessions/venue/${venueId}/tables/availability`);
      const headers = await getAuthHeader();
      const resp = await fetch(url, { headers, signal });
      if (!resp.ok) {
        console.error('Failed to fetch table availability', resp.status);
        setAvailability(null);
        return;
      }
      const data = await resp.json();
      setAvailability(data);
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return;
      console.error('Error fetching availability', err);
      setAvailability(null);
    }
  };

  useEffect(() => {
    if (!venueId) return;

    // clear prior timeout and abort
    if (availabilityTimeoutRef.current) {
      window.clearTimeout(availabilityTimeoutRef.current);
    }
    if (availabilityAbortRef.current) {
      availabilityAbortRef.current.abort();
    }

    const ac = new AbortController();
    availabilityAbortRef.current = ac;
    availabilityTimeoutRef.current = window.setTimeout(() => {
      fetchAvailability(ac.signal);
    }, 300);

    return () => {
      if (availabilityTimeoutRef.current) window.clearTimeout(availabilityTimeoutRef.current);
      if (availabilityAbortRef.current) {
        availabilityAbortRef.current.abort();
        availabilityAbortRef.current = null;
      }
    };
  }, [venueId, sessions.length]);

  // Debounced refetch of tables when sessions change to avoid rapid calls
  const refetchTablesTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (!venueId) return;
    if (refetchTablesTimeoutRef.current) window.clearTimeout(refetchTablesTimeoutRef.current);
    refetchTablesTimeoutRef.current = window.setTimeout(() => {
      refetchTables?.();
    }, 300);
    return () => {
      if (refetchTablesTimeoutRef.current) window.clearTimeout(refetchTablesTimeoutRef.current);
    };
  }, [sessions.length, venueId]);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-3 bg-emerald-500/10 border-emerald-500/30">
          <div className="text-xs text-muted-foreground">Available</div>
          <div className="text-xl font-bold text-emerald-400">{availableTables}</div>
        </Card>
        <Card className="p-3 bg-primary/10 border-primary/30">
          <div className="text-xs text-muted-foreground">Occupied</div>
          <div className="text-xl font-bold text-primary">{occupiedTables}</div>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> Guests
          </div>
          <div className="text-xl font-bold">{totalGuests}</div>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Revenue
          </div>
          <div className="text-lg font-bold">{(totalRevenue / 1000).toFixed(0)}K</div>
        </Card>
      </div>

      {/* Zone Filter */}
      {zones.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedZone === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedZone(null)}
          >
            All
          </Button>
          {zones.map(zone => (
            <Button
              key={zone}
              variant={selectedZone === zone ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedZone(zone)}
            >
              {zone}
            </Button>
          ))}
        </div>
      )}

      {/* Walk-in Button */}
      <Button 
        onClick={onOpenWalkIn} 
        variant="outline" 
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Open Walk-in Session (No Table)
      </Button>

      {/* Table Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredTables.map(table => {
          const session = getTableSession(table.id);
          const status = getTableStatus(table, session);
          const sessionTotal = session ? getSessionTotal(session) : 0;

          return (
            <Card
              key={table.id}
              onClick={() => onTableClick(table, session)}
              className={cn(
                'p-3 cursor-pointer transition-all hover:scale-[1.02] border-2',
                statusColors[status]
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-lg">{table.table_number}</div>
                  <div className="text-xs opacity-70">
                    {table.seats} seats • {table.location_zone || 'Main'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </div>

              {session ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs">
                    <Users className="w-3 h-3" />
                    {session.guest_count} guests
                    {session.guest_name && (
                      <span className="opacity-70">• {session.guest_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(session.opened_at), { addSuffix: false })}
                  </div>
                  {sessionTotal > 0 && (
                    <div className="flex items-center gap-1 text-xs font-medium">
                      <DollarSign className="w-3 h-3" />
                      {sessionTotal.toLocaleString()}
                    </div>
                  )}
                  {session.status === 'billing' && (
                    <Badge variant="outline" className="text-amber-400 border-amber-400/50 text-xs">
                      Billing
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="text-xs capitalize opacity-70">{status}</div>
              )}
            </Card>
          );
        })}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No tables found. Add tables in Settings.
        </div>
      )}
    </div>
  );
}
