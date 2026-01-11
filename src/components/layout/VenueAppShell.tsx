import { ReactNode } from 'react';
import StaffBottomNav from './StaffBottomNav';
import { PoweredBySimplify } from '@/components/branding';

interface VenueAppShellProps {
  children: ReactNode;
}

export default function VenueAppShell({ children }: VenueAppShellProps) {
  return (
    <div className="min-h-screen bg-background dark pb-24">
      <main className="flex-1">
        {children}
      </main>
      <div className="fixed bottom-16 left-0 right-0 py-2 bg-background/80 backdrop-blur-sm border-t border-border z-40">
        <PoweredBySimplify />
      </div>
      <StaffBottomNav />
    </div>
  );
}
