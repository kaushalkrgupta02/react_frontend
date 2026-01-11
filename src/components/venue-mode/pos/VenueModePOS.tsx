import { useState } from 'react';
import { VenueTable } from '@/hooks/useVenueTables';
import { TableSession, useTableSessions } from '@/hooks/useTableSessions';
import { LiveFloorView, TableSessionPanel, WalkInSessionDialog } from './index';
import DestinationDisplayScreen from './DestinationDisplayScreen';
import { Button } from '@/components/ui/button';
import { LayoutGrid, ChefHat, Wine } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'floor' | 'kitchen' | 'bar';

interface VenueModePOSProps {
  venueId: string | null;
}

export default function VenueModePOS({ venueId }: VenueModePOSProps) {
  const { refetch } = useTableSessions(venueId);
  const [selectedTable, setSelectedTable] = useState<VenueTable | null>(null);
  const [selectedSession, setSelectedSession] = useState<TableSession | undefined>(undefined);
  const [showPanel, setShowPanel] = useState(false);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('floor');

  if (!venueId) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a venue to manage orders
      </div>
    );
  }

  const handleTableClick = (table: VenueTable, session?: TableSession) => {
    setSelectedTable(table);
    setSelectedSession(session);
    setShowPanel(true);
  };

  const handleWalkInCreated = async (sessionId: string) => {
    await refetch();
  };

  const viewModes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'floor', label: 'Floor', icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'kitchen', label: 'Kitchen', icon: <ChefHat className="h-4 w-4" /> },
    { id: 'bar', label: 'Bar', icon: <Wine className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        {viewModes.map((mode) => (
          <Button
            key={mode.id}
            variant={viewMode === mode.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode(mode.id)}
            className={cn(
              "gap-2",
              viewMode === mode.id && "shadow-sm"
            )}
          >
            {mode.icon}
            {mode.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'floor' && (
          <>
            <LiveFloorView
              venueId={venueId}
              onTableClick={handleTableClick}
              onOpenWalkIn={() => setShowWalkIn(true)}
            />

            <TableSessionPanel
              venueId={venueId}
              table={selectedTable}
              session={selectedSession || null}
              open={showPanel}
              onClose={() => {
                setShowPanel(false);
                setSelectedTable(null);
                setSelectedSession(undefined);
              }}
              onRefresh={refetch}
            />

            <WalkInSessionDialog
              venueId={venueId}
              open={showWalkIn}
              onClose={() => setShowWalkIn(false)}
              onSessionCreated={handleWalkInCreated}
            />
          </>
        )}

        {viewMode === 'kitchen' && (
          <DestinationDisplayScreen
            venueId={venueId}
            destination="kitchen"
            title="Kitchen Display"
          />
        )}

        {viewMode === 'bar' && (
          <DestinationDisplayScreen
            venueId={venueId}
            destination="bar"
            title="Bar Display"
          />
        )}
      </div>
    </div>
  );
}
