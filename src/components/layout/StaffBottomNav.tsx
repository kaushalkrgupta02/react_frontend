import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { 
  ScanLine, 
  UtensilsCrossed, 
  CalendarCheck, 
  LayoutDashboard, 
  Settings2, 
  User,
  Users,
  ChefHat,
  Wine,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

// Role-specific navigation configurations
const roleNavConfigs: Record<AppRole, NavItem[]> = {
  // Manager has full access including Analytics, Deposits, Settings
  manager: [
    { path: '/', icon: ScanLine, label: 'Check In' },
    { path: '/orders', icon: UtensilsCrossed, label: 'Orders' },
    { path: '/tables', icon: CalendarCheck, label: 'Tables' },
    { path: '/analytics', icon: LayoutDashboard, label: 'Analytics' },
    { path: '/settings', icon: Settings2, label: 'Settings' },
  ],
  // Reception focuses on check-in and bookings
  reception: [
    { path: '/', icon: ScanLine, label: 'Check In' },
    { path: '/tables', icon: CalendarCheck, label: 'Tables' },
    { path: '/guests', icon: User, label: 'Guests' },
    { path: '/profile', icon: User, label: 'Profile' },
  ],
  // Waitress focuses on orders and tables
  waitress: [
    { path: '/orders', icon: UtensilsCrossed, label: 'Orders' },
    { path: '/tables', icon: CalendarCheck, label: 'Tables' },
    { path: '/', icon: ScanLine, label: 'Check In' },
    { path: '/profile', icon: User, label: 'Profile' },
  ],
  // Kitchen ONLY has access to kitchen orders
  kitchen: [
    { path: '/', icon: ChefHat, label: 'Kitchen' },
    { path: '/profile', icon: User, label: 'Profile' },
  ],
  // Bar ONLY has access to bar orders
  bar: [
    { path: '/', icon: Wine, label: 'Bar' },
    { path: '/profile', icon: User, label: 'Profile' },
  ],
  // Admin has same as manager
  admin: [
    { path: '/', icon: ScanLine, label: 'Check In' },
    { path: '/orders', icon: UtensilsCrossed, label: 'Orders' },
    { path: '/tables', icon: CalendarCheck, label: 'Tables' },
    { path: '/analytics', icon: LayoutDashboard, label: 'Analytics' },
    { path: '/settings', icon: Settings2, label: 'Settings' },
  ],
  // Venue manager - same as manager
  venue_manager: [
    { path: '/', icon: ScanLine, label: 'Check In' },
    { path: '/orders', icon: UtensilsCrossed, label: 'Orders' },
    { path: '/tables', icon: CalendarCheck, label: 'Tables' },
    { path: '/analytics', icon: LayoutDashboard, label: 'Analytics' },
    { path: '/settings', icon: Settings2, label: 'Settings' },
  ],
  // Default user - minimal access
  user: [
    { path: '/', icon: ScanLine, label: 'Check In' },
    { path: '/profile', icon: User, label: 'Profile' },
  ],
};

// Default nav for when role is not determined (minimal access)
const defaultNav: NavItem[] = [
  { path: '/', icon: ScanLine, label: 'Check In' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function StaffBottomNav() {
  const location = useLocation();
  const { roles } = useUserRole();

  // Get nav items based on primary role (first non-user role, or fallback to default)
  const getPrimaryRole = (): AppRole | null => {
    const priorityOrder: AppRole[] = ['admin', 'manager', 'venue_manager', 'reception', 'waitress', 'kitchen', 'bar'];
    for (const role of priorityOrder) {
      if (roles.includes(role)) {
        return role;
      }
    }
    return null;
  };

  const primaryRole = getPrimaryRole();
  const navItems = primaryRole ? roleNavConfigs[primaryRole] : defaultNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-nav border-t border-border/50 backdrop-blur-xl safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          
          return (
            <NavLink
              key={`${path}-${label}`}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon 
                className={cn(
                  "w-6 h-6 transition-transform duration-200",
                  isActive && "scale-110"
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn(
                "text-xs font-medium transition-opacity",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
