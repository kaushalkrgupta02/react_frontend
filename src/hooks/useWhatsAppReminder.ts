import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReminderParams {
  bookingId: string;
  venueId: string;
  venueName: string;
  bookingRef: string;
  bookingDate: string;
  partySize: number;
  guestPhone?: string;
  messageType: 'reminder' | 'deposit_request';
}

interface ReminderResponse {
  success: boolean;
  whatsappLink: string;
  messagePreview: string;
  bookingRef: string;
  error?: string;
}

export function useWhatsAppReminder() {
  return useMutation({
    mutationFn: async (params: ReminderParams): Promise<ReminderResponse> => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-reminder', {
        body: params,
      });

      if (error) throw error;
      return data as ReminderResponse;
    },
    onSuccess: (data) => {
      // Open WhatsApp in new tab
      window.open(data.whatsappLink, '_blank');
      toast.success(`WhatsApp opened for ${data.bookingRef}`);
    },
    onError: (error) => {
      console.error('WhatsApp reminder error:', error);
      toast.error('Failed to prepare reminder');
    },
  });
}

export function useBulkWhatsAppReminders() {
  const singleReminder = useWhatsAppReminder();

  return useMutation({
    mutationFn: async (bookings: ReminderParams[]) => {
      const results = [];
      for (const booking of bookings) {
        try {
          const result = await singleReminder.mutateAsync(booking);
          results.push(result);
          // Add small delay between messages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed for ${booking.bookingRef}:`, error);
        }
      }
      return results;
    },
    onSuccess: (results) => {
      toast.success(`Prepared ${results.length} WhatsApp reminders`);
    },
  });
}
