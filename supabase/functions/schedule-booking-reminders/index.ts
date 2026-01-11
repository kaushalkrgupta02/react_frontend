import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleRequest {
  bookingId: string;
  venueId: string;
  bookingDate: string;
  guestPhone?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { bookingId, venueId, bookingDate, guestPhone }: ScheduleRequest = await req.json();

    console.log(`Scheduling reminders for booking ${bookingId}`);

    // Get venue reminder settings
    const { data: venue } = await supabase
      .from('venues')
      .select('reminder_enabled, reminder_24h_enabled, reminder_2h_enabled, name')
      .eq('id', venueId)
      .single();

    if (!venue?.reminder_enabled) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Reminders disabled for this venue',
        scheduled: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bookingDateTime = new Date(bookingDate);
    const remindersToSchedule: Array<{
      booking_id: string;
      reminder_type: string;
      channel: string;
      scheduled_for: string;
      status: string;
    }> = [];

    // Schedule confirmation reminder (immediate)
    remindersToSchedule.push({
      booking_id: bookingId,
      reminder_type: 'confirmation',
      channel: 'whatsapp',
      scheduled_for: new Date().toISOString(),
      status: 'pending',
    });

    // Schedule 24-hour reminder
    if (venue.reminder_24h_enabled) {
      const reminder24h = new Date(bookingDateTime);
      reminder24h.setHours(reminder24h.getHours() - 24);
      
      // Only schedule if it's in the future
      if (reminder24h > new Date()) {
        remindersToSchedule.push({
          booking_id: bookingId,
          reminder_type: '24h',
          channel: 'whatsapp',
          scheduled_for: reminder24h.toISOString(),
          status: 'pending',
        });
      }
    }

    // Schedule 2-hour reminder
    if (venue.reminder_2h_enabled) {
      const reminder2h = new Date(bookingDateTime);
      reminder2h.setHours(reminder2h.getHours() - 2);
      
      // Only schedule if it's in the future
      if (reminder2h > new Date()) {
        remindersToSchedule.push({
          booking_id: bookingId,
          reminder_type: '2h',
          channel: 'whatsapp',
          scheduled_for: reminder2h.toISOString(),
          status: 'pending',
        });
      }
    }

    // Insert scheduled reminders
    if (remindersToSchedule.length > 0) {
      const { error: insertError } = await supabase
        .from('booking_reminders')
        .insert(remindersToSchedule);

      if (insertError) {
        console.error('Error inserting reminders:', insertError);
        throw insertError;
      }
    }

    console.log(`Scheduled ${remindersToSchedule.length} reminders for booking ${bookingId}`);

    return new Response(JSON.stringify({
      success: true,
      scheduled: remindersToSchedule.length,
      reminders: remindersToSchedule.map(r => r.reminder_type),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in schedule-booking-reminders:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
