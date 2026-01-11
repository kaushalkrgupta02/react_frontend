import { memo } from 'react';
import { RefreshCw } from 'lucide-react';

export const LoadingState = memo(function LoadingState() {
  return (
    <div className="flex items-center justify-center h-[80vh]">
      <RefreshCw className="h-12 w-12 animate-spin text-muted-foreground" />
    </div>
  );
});
