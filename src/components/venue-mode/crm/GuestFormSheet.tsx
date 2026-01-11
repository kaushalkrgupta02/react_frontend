import { useState, useEffect } from 'react';
import { User, Phone, Mail, Tag, X, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GuestProfile, useGuestProfiles } from '@/hooks/useGuestProfiles';
import { toast } from 'sonner';

interface GuestFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string;
  guest?: GuestProfile | null; // If provided, we're editing
  onSuccess?: () => void;
}

const vipStatusOptions = [
  { value: 'regular', label: 'Regular' },
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'vip', label: 'VIP' },
];

export default function GuestFormSheet({ 
  open, 
  onOpenChange, 
  venueId, 
  guest,
  onSuccess 
}: GuestFormSheetProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vipStatus, setVipStatus] = useState('regular');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [dietaryInput, setDietaryInput] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);

  const { createProfile, updateProfile } = useGuestProfiles(venueId);

  const isEditing = !!guest;

  // Populate form when editing
  useEffect(() => {
    if (guest && open) {
      setName(guest.guest_name || '');
      setPhone(guest.guest_phone || '');
      setEmail(guest.guest_email || '');
      setVipStatus(guest.vip_status || 'regular');
      setTags(guest.tags || []);
      setDietaryRestrictions(guest.dietary_restrictions || []);
    } else if (!guest && open) {
      // Reset form for new guest
      setName('');
      setPhone('');
      setEmail('');
      setVipStatus('regular');
      setTags([]);
      setDietaryRestrictions([]);
    }
  }, [guest, open]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAddDietary = () => {
    const trimmed = dietaryInput.trim();
    if (trimmed && !dietaryRestrictions.includes(trimmed)) {
      setDietaryRestrictions([...dietaryRestrictions, trimmed]);
      setDietaryInput('');
    }
  };

  const handleRemoveDietary = (item: string) => {
    setDietaryRestrictions(dietaryRestrictions.filter(d => d !== item));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!phone.trim() && !isEditing) {
      toast.error('Phone is required');
      return;
    }
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (isEditing && guest) {
      await updateProfile.mutateAsync({
        id: guest.id,
        guest_name: name.trim(),
        guest_email: email.trim() || undefined,
        vip_status: vipStatus,
        tags,
        dietary_restrictions: dietaryRestrictions,
      });
    } else {
      await createProfile.mutateAsync({
        venue_id: venueId,
        guest_name: name.trim(),
        guest_phone: phone.trim() || undefined,
        guest_email: email.trim() || undefined,
        vip_status: vipStatus,
        tags,
        dietary_restrictions: dietaryRestrictions,
      });
    }
    
    onOpenChange(false);
    onSuccess?.();
  };

  const isPending = createProfile.isPending || updateProfile.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {isEditing ? 'Edit Guest' : 'Add New Guest'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="guest-name">Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="guest-name"
                placeholder="Guest name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="guest-phone">Phone *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="guest-phone"
                placeholder="+62..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9"
                disabled={isEditing}
                required
              />
            </div>
            {isEditing && (
              <p className="text-xs text-muted-foreground">Phone cannot be changed after creation</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="guest-email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="guest-email"
                type="email"
                placeholder="guest@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          {/* VIP Status */}
          <div className="space-y-2">
            <Label>VIP Status</Label>
            <Select value={vipStatus} onValueChange={setVipStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vipStatusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleAddTag} size="sm">
                <Tag className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button 
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Dietary Restrictions */}
          <div className="space-y-2">
            <Label>Dietary Restrictions</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Vegetarian, Nut allergy..."
                value={dietaryInput}
                onChange={(e) => setDietaryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDietary())}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleAddDietary} size="sm">
                +
              </Button>
            </div>
            {dietaryRestrictions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {dietaryRestrictions.map((item, i) => (
                  <Badge key={i} variant="outline" className="gap-1 pr-1">
                    {item}
                    <button 
                      onClick={() => handleRemoveDietary(item)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button 
            onClick={handleSubmit} 
            disabled={!name.trim() || (!phone.trim() && !isEditing) || !email.trim() || isPending}
            className="w-full"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isEditing ? 'Save Changes' : 'Add Guest'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
