import { Ticket } from 'lucide-react';

interface EmptyPassListProps {
  message?: string;
  description?: string;
}

export function EmptyPassList({ 
  message = 'No passes for today',
  description = 'Passes purchased for today will appear here'
}: EmptyPassListProps) {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
        <Ticket className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">{message}</p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
