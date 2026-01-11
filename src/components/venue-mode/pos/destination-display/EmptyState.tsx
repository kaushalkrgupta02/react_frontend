import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { ChefHat, Wine } from 'lucide-react';
import type { DestinationType } from './types';

interface EmptyStateProps {
  destination: DestinationType;
}

export const EmptyState = memo(function EmptyState({ destination }: EmptyStateProps) {
  const Icon = destination === 'bar' ? Wine : ChefHat;

  return (
    <Card className="p-12 text-center">
      <Icon className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
      <h2 className="text-xl font-medium text-muted-foreground">No pending orders</h2>
      <p className="text-sm text-muted-foreground mt-1">
        New orders will appear here automatically
      </p>
    </Card>
  );
});
