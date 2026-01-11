import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface WaitlistEntry {
  id: string;
  venue_id: string;
  user_id: string;
  party_size: number;
  phone: string | null;
  notes: string | null;
  status: string;
  position: number | null;
  created_at: string;
  notified_at: string | null;
  expires_at: string | null;
}

export function useWaitlist(venueId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [userEntry, setUserEntry] = useState<WaitlistEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avgTurnoverMinutes, setAvgTurnoverMinutes] = useState<number | null>(null);

  // Fetch average turnover time from recently seated entries
  const fetchTurnoverStats = async () => {
    if (!venueId) return;

    try {
      // Get recently seated entries to calculate average turnover
      const { data, error } = await supabase
        .from('waitlist')
        .select('created_at, notified_at')
        .eq('venue_id', venueId)
        .eq('status', 'seated')
        .not('notified_at', 'is', null)
        .order('notified_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        // Calculate average time from join to notification (turnover proxy)
        const turnoverTimes = data.map(entry => {
          const joinTime = new Date(entry.created_at).getTime();
          const notifyTime = new Date(entry.notified_at!).getTime();
          return (notifyTime - joinTime) / (1000 * 60); // minutes
        });

        const avg = turnoverTimes.reduce((sum, t) => sum + t, 0) / turnoverTimes.length;
        setAvgTurnoverMinutes(Math.round(avg));
      } else {
        // Default estimate if no historical data
        setAvgTurnoverMinutes(15);
      }
    } catch (error) {
      console.error('Error fetching turnover stats:', error);
      setAvgTurnoverMinutes(15); // fallback
    }
  };

  const fetchWaitlist = async () => {
    if (!venueId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .eq('venue_id', venueId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Add position based on order
      const withPositions = (data || []).map((entry, idx) => ({
        ...entry,
        position: idx + 1
      }));
      
      setEntries(withPositions as WaitlistEntry[]);
      
      // Find user's entry
      if (user) {
        const myEntry = withPositions.find(e => e.user_id === user.id);
        setUserEntry(myEntry as WaitlistEntry | null);
      }
    } catch (error) {
      console.error('Error fetching waitlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate estimated wait time for a given position
  const getEstimatedWaitMinutes = (position: number): number | null => {
    if (!avgTurnoverMinutes) return null;
    return Math.round(position * avgTurnoverMinutes);
  };

  // Format wait time for display
  const formatWaitTime = (minutes: number | null): string => {
    if (minutes === null) return 'Calculating...';
    if (minutes < 5) return 'Less than 5 min';
    if (minutes < 60) return `~${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `~${hours} hr`;
    return `~${hours} hr ${mins} min`;
  };

  const joinWaitlist = async (partySize: number, phone?: string, notes?: string) => {
    if (!user || !venueId) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to join the waitlist',
        variant: 'destructive'
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('waitlist')
        .insert({
          venue_id: venueId,
          user_id: user.id,
          party_size: partySize,
          phone: phone || null,
          notes: notes || null,
          status: 'waiting'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Added to waitlist',
        description: 'We\'ll notify you when a spot opens up!'
      });

      await fetchWaitlist();
      return data;
    } catch (error: any) {
      toast({
        title: 'Failed to join waitlist',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  const leaveWaitlist = async () => {
    if (!userEntry) return;

    try {
      const { error } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', userEntry.id);

      if (error) throw error;

      toast({
        title: 'Removed from waitlist',
        description: 'You have left the waitlist'
      });

      setUserEntry(null);
      await fetchWaitlist();
    } catch (error: any) {
      toast({
        title: 'Failed to leave waitlist',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const notifyGuest = async (entryId: string, venueName: string) => {
    try {
      // Call edge function to send push/SMS notifications
      const { data, error: fnError } = await supabase.functions.invoke('notify-waitlist-guest', {
        body: {
          waitlist_entry_id: entryId,
          venue_name: venueName
        }
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        // Fallback to direct update if edge function fails
        const { error } = await supabase
          .from('waitlist')
          .update({ 
            notified_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
          })
          .eq('id', entryId);
        
        if (error) throw error;
      }

      const notifTypes = data?.notifications?.length > 0 
        ? `via ${data.notifications.join(', ')}` 
        : '';

      toast({
        title: 'Guest notified',
        description: `They have 15 minutes to check in ${notifTypes}`
      });

      await fetchWaitlist();
    } catch (error: any) {
      toast({
        title: 'Failed to notify',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const seatGuest = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('waitlist')
        .update({ status: 'seated' })
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: 'Guest seated',
        description: 'Entry removed from waitlist'
      });

      await fetchWaitlist();
    } catch (error: any) {
      toast({
        title: 'Failed to seat guest',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const removeFromWaitlist = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('waitlist')
        .update({ status: 'removed' })
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: 'Removed from waitlist'
      });

      await fetchWaitlist();
    } catch (error: any) {
      toast({
        title: 'Failed to remove',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchWaitlist();
    fetchTurnoverStats();
  }, [venueId, user]);

  return {
    entries,
    userEntry,
    isLoading,
    avgTurnoverMinutes,
    getEstimatedWaitMinutes,
    formatWaitTime,
    joinWaitlist,
    leaveWaitlist,
    notifyGuest,
    seatGuest,
    removeFromWaitlist,
    refetch: fetchWaitlist
  };
}
