import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Loader2, Shield, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { withApiBase } from '@/lib/config';
import { getAuthHeader } from '@/lib/utilsAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AppRole } from '@/hooks/useUserRole';

interface StaffMember {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  venue_id: string;
  is_active: boolean;
  roles: AppRole[];
}

interface StaffManagementSectionProps {
  venueId: string | null;
}

const STAFF_ROLES: { value: AppRole; label: string }[] = [
  { value: 'manager', label: 'Manager' },
  { value: 'reception', label: 'Reception' },
  { value: 'waitress', label: 'Waitress' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bar', label: 'Bar' },
];

export default function StaffManagementSection({ venueId }: StaffManagementSectionProps) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('reception');

  useEffect(() => {
    if (venueId) {
      fetchStaffMembers();
    }
  }, [venueId]);

  const fetchStaffMembers = async () => {
    if (!venueId) return;

    setIsLoading(true);
    try {
      const url = withApiBase(`/api/v1/venues/staff/${venueId}`);
      const headers = { ...(await getAuthHeader()) };
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to fetch staff');
      }
      const data = await res.json();

      // Normalize roles: backend may return a single 'role' string or an array 'roles'
      const normalized = (data || []).map((s: any) => ({
        ...s,
        roles: Array.isArray(s.roles) ? s.roles : (s.role ? [s.role] : []),
      }));

      setStaffMembers(normalized as StaffMember[]);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (staff?: StaffMember) => {
    if (staff) {
      setEditingStaff(staff);
      setDisplayName(staff.display_name || '');
      setPhone(staff.phone || '');
      setEmail('');
      setPassword('');
      setSelectedRole((staff.roles && staff.roles.length > 0 ? staff.roles[0] : 'reception') as AppRole);
    } else {
      setEditingStaff(null);
      setDisplayName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setSelectedRole('reception');
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!venueId) return;
    
    // Validation
    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }
    
    if (!editingStaff && !password.trim()) {
      toast.error('Password is required for new staff');
      return;
    }
    
    setIsSaving(true);
    try {
      if (editingStaff) {
        // Update existing staff profile via backend
        const staffUrl = withApiBase(`/api/v1/venues/staff/${editingStaff.id}`);
        const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
        const res = await fetch(staffUrl, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            display_name: displayName || null,
            phone: phone || null,
            role: selectedRole
          })
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to update staff');
        }

        toast.success('Staff member updated');
        setIsDialogOpen(false);
        await fetchStaffMembers();
      } else {
        // Store current session before creating new user
        const { data: currentSession } = await supabase.auth.getSession();
        
        // Create new user with email and password via backend signup
        const staffEmail = email.trim() || `${displayName.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')}@staff.local`;

        // Call backend signup endpoint
        const signupUrl = withApiBase('/api/v1/auth/signup');
        const signupRes = await fetch(signupUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: staffEmail,
            password,
            display_name: displayName,
            role: selectedRole
          })
        });

        if (!signupRes.ok) {
          const txt = await signupRes.text();
          if (txt && txt.includes('already')) {
            toast.error('A user with this email already exists. Please use a different name or email.');
            setIsSaving(false);
            return;
          }
          throw new Error(txt || 'Failed to create user');
        }

        // Parse signup JSON safely
        let signupJson: any = null;
        try {
          const contentType = signupRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) signupJson = await signupRes.json();
          else {
            const txt = await signupRes.text();
            try { signupJson = JSON.parse(txt); } catch { signupJson = { message: txt }; }
          }
        } catch (e) {
          // Non-JSON but signup was OK - continue
          signupJson = null;
        }

        const newUserId = signupJson?.user?.id || signupJson?.user?.user_id || null;
        if (!newUserId) {
          // Signup succeeded but response didn't include user id - attempt to extract from message or abort
          throw new Error('Failed to create user (no id returned)');
        }

        // Create staff profile via backend /venues/staff (requires auth)
        const staffUrl = withApiBase('/api/v1/venues/staff');
        const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
        const staffRes = await fetch(staffUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            user_id: newUserId,
            venue_id: venueId,
            display_name: displayName,
            phone: phone || null,
            role: selectedRole,
            is_active: true
          })
        });

        if (!staffRes.ok) {
          const txt = await staffRes.text();
          throw new Error(txt || 'Failed to create staff profile');
        }

        // Success: log and inform user, then refresh list safely
        console.debug('StaffManagement: signup succeeded', { signupJson });
        toast.success('User created — creating staff profile...');



        // Success: close dialog, reset form
        setIsDialogOpen(false);
        setDisplayName('');
        setPhone('');
        setEmail('');
        setPassword('');
        setSelectedRole('reception');

        // Refresh staff list and handle errors gracefully
        try {
          await fetchStaffMembers();
        } catch (err) {
          console.error('StaffManagement: failed to refresh staff list', err);
          toast.error('Staff created, but failed to refresh list');
        }
      }

      setIsDialogOpen(false);
      fetchStaffMembers();
    } catch (error: any) {
      console.error('Error saving staff:', error);
      toast.error(error.message || 'Failed to save staff member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (staff: StaffMember) => {
    try {
      const url = withApiBase(`/api/v1/venues/staff/${staff.id}`);
      const headers = { ...(await getAuthHeader()) };
      const res = await fetch(url, { method: 'DELETE', headers });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to remove staff');
      }

      toast.success('Staff member removed');
      fetchStaffMembers();
    } catch (error) {
      console.error('Error removing staff:', error);
      toast.error('Failed to remove staff member');
    }
  };

  const getRoleColor = (role: AppRole) => {
    switch (role) {
      case 'manager': return 'bg-purple-500/10 text-purple-500';
      case 'reception': return 'bg-blue-500/10 text-blue-500';
      case 'waitress': return 'bg-green-500/10 text-green-500';
      case 'kitchen': return 'bg-orange-500/10 text-orange-500';
      case 'bar': return 'bg-pink-500/10 text-pink-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!venueId) {
    return (
      <div className="text-center py-8">
        <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">Select a venue to manage staff</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground">Staff Members</h3>
          <p className="text-sm text-muted-foreground">
            Manage staff accounts and their roles
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenDialog()} className="self-start sm:self-auto">
              <Plus className="w-4 h-4 mr-1" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">
                  Display Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="mt-1"
                  required
                />
              </div>
              {!editingStaff && (
                <div>
                  <label className="text-sm font-medium">
                    Password <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="mt-1"
                    required
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+62..."
                  className="mt-1"
                />
              </div>
              {!editingStaff && (
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@venue.com (optional)"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    If left empty, an auto-generated email will be used
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingStaff ? 'Update' : 'Add'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {staffMembers.length === 0 ? (
        <div className="bg-card rounded-xl p-8 border border-border text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h4 className="font-medium text-foreground mb-1">No staff members yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Add staff members to assign roles and permissions
          </p>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-1" />
            Add First Staff
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {staffMembers.filter(s => s.is_active).map(staff => (
            <div
              key={staff.id}
              className="bg-card rounded-xl p-3 md:p-4 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">
                    {staff.display_name || 'Unnamed Staff'}
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                    {staff.phone && (
                      <span className="text-xs text-muted-foreground truncate">{staff.phone}</span>
                    )}
                    <div className="flex flex-wrap items-center gap-1">
                      {(staff.roles || []).map(role => (
                        <span
                          key={role}
                          className={`text-xs px-2 py-0.5 rounded-full capitalize ${getRoleColor(role)}`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 self-end sm:self-auto flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenDialog(staff)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove {staff.display_name || 'this staff member'} from the venue and revoke their access.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(staff)}>
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
