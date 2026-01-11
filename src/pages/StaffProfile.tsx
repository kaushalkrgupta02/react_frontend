import { LogOut, User, Settings, ChevronRight, Building2, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useStaffProfile } from '@/hooks/useStaffProfile';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MenuItemProps {
  icon: typeof User;
  label: string;
  description: string;
  onClick: () => void;
  accent?: boolean;
}

function MenuItem({ icon: Icon, label, description, onClick, accent }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200",
        accent 
          ? "bg-primary/10 border-primary/30 hover:bg-primary/15" 
          : "bg-card border-border/40 hover:bg-secondary/50 hover:border-border/60"
      )}
    >
      <div className={cn(
        "w-11 h-11 rounded-xl flex items-center justify-center",
        accent ? "bg-primary/20" : "bg-secondary"
      )}>
        <Icon className={cn("w-5 h-5", accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 text-left">
        <span className="text-foreground font-medium block">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <ChevronRight className={cn("w-5 h-5", accent ? "text-primary" : "text-muted-foreground")} />
    </button>
  );
}

export default function StaffProfilePage() {
  const { user, signOut } = useAuth();
  const { roles, isAdmin, isManager } = useUserRole();
  const { staffProfile } = useStaffProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  // Get display role name
  const getRoleName = () => {
    if (isAdmin) return 'Administrator';
    if (isManager) return 'Manager';
    if (roles.includes('reception')) return 'Reception';
    if (roles.includes('waitress')) return 'Waitress';
    if (roles.includes('kitchen')) return 'Kitchen Staff';
    if (roles.includes('bar')) return 'Bar Staff';
    return 'Staff';
  };

  const menuItems: MenuItemProps[] = [];

  // Add settings menu items only for managers/admins
  if (isAdmin || isManager) {
    menuItems.push({
      icon: Shield,
      label: 'Admin Panel',
      description: 'Venue configuration',
      onClick: () => navigate('/settings'),
    });
    menuItems.push({ 
      icon: Settings, 
      label: 'Settings', 
      description: 'App preferences',
      onClick: () => navigate('/settings')
    });
  }

  return (
    <div className="min-h-full bg-background pb-24 dark">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border/30 px-4 py-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Profile</h1>
      </header>

      {/* Profile Card */}
      <div className="p-4">
        <div className="bg-card rounded-2xl p-6 border border-border/40">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              {staffProfile?.avatar_url ? (
                <img 
                  src={staffProfile.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-lg font-bold text-foreground truncate">
                {staffProfile?.display_name || user?.email || 'Staff Member'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {getRoleName()}
                </span>
              </div>
            </div>
          </div>

          {/* Venue info */}
          {staffProfile && (
            <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>Assigned to venue</span>
            </div>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-2">
        {menuItems.map(({ icon, label, description, onClick }) => (
          <MenuItem
            key={label}
            icon={icon}
            label={label}
            description={description}
            onClick={onClick}
          />
        ))}
      </div>

      {/* Sign Out */}
      <div className="p-4 mt-8">
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="w-full h-12 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 transition-all"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
