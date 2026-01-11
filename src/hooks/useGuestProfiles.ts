import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GuestProfile {
  id: string;
  venue_id: string;
  user_id: string | null;
  guest_phone: string | null;
  guest_name: string | null;
  guest_email: string | null;
  dietary_restrictions: string[];
  preferences: Record<string, unknown>;
  tags: string[];
  vip_status: string;
  total_visits: number;
  total_spend: number;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuestNote {
  id: string;
  guest_profile_id: string;
  venue_id: string;
  staff_user_id: string | null;
  note_type: string;
  note_text: string;
  is_pinned: boolean;
  created_at: string;
}

export interface GuestVisitHistory {
  id: string;
  booking_date: string;
  party_size: number;
  status: string;
  booking_reference: string;
  arrival_window: string | null;
  special_requests: string | null;
}

interface CreateGuestProfileParams {
  venue_id: string;
  user_id?: string;
  guest_phone?: string;
  guest_name?: string;
  guest_email?: string;
  dietary_restrictions?: string[];
  preferences?: Record<string, unknown>;
  tags?: string[];
  vip_status?: string;
}

interface UpdateGuestProfileParams {
  id: string;
  dietary_restrictions?: string[];
  preferences?: Record<string, unknown>;
  tags?: string[];
  vip_status?: string;
  guest_name?: string;
  guest_email?: string;
}

interface AddGuestNoteParams {
  guest_profile_id: string;
  venue_id: string;
  note_type?: string;
  note_text: string;
  is_pinned?: boolean;
}

export function useGuestProfiles(venueId: string | null) {
  const queryClient = useQueryClient();

  // Fetch all guest profiles for a venue
  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guest-profiles', venueId],
    queryFn: async () => {
      if (!venueId) return [];

      const { data, error } = await supabase
        .from('venue_guest_profiles')
        .select('*')
        .eq('venue_id', venueId)
        .order('last_visit_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as GuestProfile[];
    },
    enabled: !!venueId,
  });

  // Create guest profile
  const createProfile = useMutation({
    mutationFn: async (params: CreateGuestProfileParams) => {
      const { data, error } = await supabase
        .from('venue_guest_profiles')
        .insert({
          venue_id: params.venue_id,
          user_id: params.user_id || null,
          guest_phone: params.guest_phone || null,
          guest_name: params.guest_name || null,
          guest_email: params.guest_email || null,
          dietary_restrictions: params.dietary_restrictions || [],
          preferences: (params.preferences || {}) as any,
          tags: params.tags || [],
          vip_status: params.vip_status || 'regular',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as GuestProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-profiles', venueId] });
      toast.success('Guest profile created');
    },
    onError: (error) => {
      console.error('Error creating guest profile:', error);
      toast.error('Failed to create guest profile');
    },
  });

  // Update guest profile
  const updateProfile = useMutation({
    mutationFn: async (params: UpdateGuestProfileParams) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from('venue_guest_profiles')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as GuestProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-profiles', venueId] });
      toast.success('Guest profile updated');
    },
    onError: (error) => {
      console.error('Error updating guest profile:', error);
      toast.error('Failed to update guest profile');
    },
  });

  return {
    guests,
    isLoading,
    createProfile,
    updateProfile,
  };
}

export function useGuestProfile(guestId: string | null) {
  const queryClient = useQueryClient();

  // Fetch single guest profile with details
  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest-profile', guestId],
    queryFn: async () => {
      if (!guestId) return null;

      const { data, error } = await supabase
        .from('venue_guest_profiles')
        .select('*')
        .eq('id', guestId)
        .single();

      if (error) throw error;
      return data as GuestProfile;
    },
    enabled: !!guestId,
  });

  // Fetch guest notes
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['guest-notes', guestId],
    queryFn: async () => {
      if (!guestId) return [];

      const { data, error } = await supabase
        .from('guest_notes')
        .select('*')
        .eq('guest_profile_id', guestId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as GuestNote[];
    },
    enabled: !!guestId,
  });

  // Fetch visit history (bookings)
  const { data: visitHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['guest-visit-history', guestId, guest?.user_id],
    queryFn: async () => {
      if (!guest?.user_id) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_date, party_size, status, booking_reference, arrival_window, special_requests')
        .eq('user_id', guest.user_id)
        .eq('venue_id', guest.venue_id)
        .order('booking_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as GuestVisitHistory[];
    },
    enabled: !!guest?.user_id,
  });

  // Add note to guest
  const addNote = useMutation({
    mutationFn: async (params: AddGuestNoteParams) => {
      const { data, error } = await supabase
        .from('guest_notes')
        .insert({
          guest_profile_id: params.guest_profile_id,
          venue_id: params.venue_id,
          note_type: params.note_type || 'general',
          note_text: params.note_text,
          is_pinned: params.is_pinned || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as GuestNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-notes', guestId] });
      toast.success('Note added');
    },
    onError: (error) => {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    },
  });

  // Toggle pin on note
  const togglePinNote = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('guest_notes')
        .update({ is_pinned: isPinned })
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-notes', guestId] });
    },
  });

  // Delete note
  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('guest_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-notes', guestId] });
      toast.success('Note deleted');
    },
    onError: () => {
      toast.error('Failed to delete note');
    },
  });

  return {
    guest,
    notes,
    visitHistory,
    isLoading: isLoading || notesLoading || historyLoading,
    addNote,
    togglePinNote,
    deleteNote,
  };
}
