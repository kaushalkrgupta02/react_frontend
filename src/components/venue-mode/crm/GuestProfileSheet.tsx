import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { User, Phone, Mail, Calendar, Users, Star, Tag, MessageSquare, Pin, Trash2, Plus, Utensils, Heart, Edit2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGuestProfile, GuestProfile } from '@/hooks/useGuestProfiles';
import GuestFormSheet from './GuestFormSheet';
import { cn } from '@/lib/utils';

interface GuestProfileSheetProps {
  guest: GuestProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string;
}

const vipStatusColors: Record<string, string> = {
  regular: 'bg-muted text-muted-foreground',
  silver: 'bg-slate-400/20 text-slate-400',
  gold: 'bg-amber-400/20 text-amber-400',
  platinum: 'bg-purple-400/20 text-purple-400',
  vip: 'bg-red-400/20 text-red-400',
};

export default function GuestProfileSheet({ guest, open, onOpenChange, venueId }: GuestProfileSheetProps) {
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newRestriction, setNewRestriction] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const { 
    notes, 
    visitHistory, 
    isLoading, 
    addNote, 
    togglePinNote, 
    deleteNote 
  } = useGuestProfile(guest?.id || null);

  const handleAddNote = () => {
    if (!newNote.trim() || !guest) return;
    addNote.mutate({
      guest_profile_id: guest.id,
      venue_id: venueId,
      note_text: newNote.trim(),
    });
    setNewNote('');
  };

  if (!guest) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold">{guest.guest_name || 'Guest'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn('text-xs', vipStatusColors[guest.vip_status])}>
                    {guest.vip_status.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {guest.total_visits} visits
                  </span>
                </div>
              </div>
            </SheetTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEditOpen(true)}
              className="ml-2"
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-6">
            {/* Contact Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Contact</h4>
              {guest.guest_phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{guest.guest_phone}</span>
                </div>
              )}
              {guest.guest_email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{guest.guest_email}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-card border border-border">
                <p className="text-xs text-muted-foreground">Total Visits</p>
                <p className="text-2xl font-bold text-foreground">{guest.total_visits}</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <p className="text-xs text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(guest.total_spend)}
                </p>
              </div>
            </div>

            {/* Dietary Restrictions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Utensils className="w-4 h-4" />
                  Dietary Restrictions
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {guest.dietary_restrictions.map((restriction, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {restriction}
                  </Badge>
                ))}
                {guest.dietary_restrictions.length === 0 && (
                  <p className="text-sm text-muted-foreground">None specified</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add restriction..."
                  value={newRestriction}
                  onChange={(e) => setNewRestriction(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" className="h-8">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {guest.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" className="h-8">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Last Visit */}
            {guest.last_visit_at && (
              <div className="text-sm text-muted-foreground">
                Last visit: {format(parseISO(guest.last_visit_at), 'MMM d, yyyy')}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {visitHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No visit history yet
                  </p>
                ) : (
                  visitHistory.map((visit) => (
                    <div
                      key={visit.id}
                      className="p-3 rounded-lg bg-card border border-border"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {format(parseISO(visit.booking_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{visit.party_size} guests</span>
                            <span>•</span>
                            <span>{visit.booking_reference}</span>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            'text-xs',
                            visit.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                            visit.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                            'bg-muted text-muted-foreground'
                          )}
                        >
                          {visit.status}
                        </Badge>
                      </div>
                      {visit.special_requests && (
                        <p className="text-xs text-muted-foreground mt-2 pl-6">
                          "{visit.special_requests}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <div className="space-y-4">
              {/* Add Note */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note about this guest..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addNote.isPending}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              </div>

              {/* Notes List */}
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No notes yet
                    </p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className={cn(
                          'p-3 rounded-lg border',
                          note.is_pinned 
                            ? 'bg-amber-500/5 border-amber-500/30' 
                            : 'bg-card border-border'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-foreground flex-1">{note.note_text}</p>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className={cn(
                                'h-6 w-6 p-0',
                                note.is_pinned && 'text-amber-400'
                              )}
                              onClick={() => togglePinNote.mutate({ 
                                noteId: note.id, 
                                isPinned: !note.is_pinned 
                              })}
                            >
                              <Pin className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-500"
                              onClick={() => deleteNote.mutate(note.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(parseISO(note.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Guest Sheet */}
        <GuestFormSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          venueId={venueId}
          guest={guest}
          onSuccess={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
