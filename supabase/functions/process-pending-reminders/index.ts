import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function should be called periodically (e.g., every 15 minutes via cron)
// to process pending reminders that are due

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log('Processing pending reminders...');

    // Get pending reminders that are due (scheduled_for <= now)
    const { data: pendingReminders, error: fetchError } = await supabase
      .from('booking_reminders')
      .select(`
        id,
        booking_id,
        reminder_type,
        channel,
        scheduled_for,
        bookings!inner (
          id,
          booking_reference,
          booking_date,
          party_size,
          status,
          venue_id,
          user_id,
          venues!inner (
            id,
            name,
            whatsapp,
            phone
          )
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      console.log('No pending reminders to process');
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        message: 'No pending reminders',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${pendingReminders.length} pending reminders`);

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const reminder of pendingReminders) {
      try {
        const booking = reminder.bookings as any;
        const venue = booking?.venues as any;

        // Skip if booking is cancelled
        if (booking.status === 'cancelled' || booking.status === 'declined') {
          await supabase
            .from('booking_reminders')
            .update({ 
              status: 'skipped',
              error_message: 'Booking cancelled or declined',
            })
            .eq('id', reminder.id);
          
          results.push({ id: reminder.id, success: true });
          continue;
        }

        // Get user phone if available
        let guestPhone = '';
        if (booking.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('user_id', booking.user_id)
            .single();
          
          guestPhone = profile?.phone || '';
        }

        // Generate message based on reminder type
        const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });

        let message = '';
        switch (reminder.reminder_type) {
          case 'confirmation':
            message = `🎉 Booking Confirmed!\n\nHi! Your reservation at ${venue.name} is confirmed.\n\n📅 Date: ${formattedDate}\n👥 Party: ${booking.party_size} guests\n🔖 Ref: ${booking.booking_reference}\n\nWe look forward to seeing you!`;
            break;
          case '24h':
            message = `⏰ Reminder: Tomorrow!\n\nHi! Just a friendly reminder about your reservation at ${venue.name} tomorrow.\n\n📅 ${formattedDate}\n👥 ${booking.party_size} guests\n🔖 ${booking.booking_reference}\n\nPlease reply to confirm or let us know if your plans changed.`;
            break;
          case '2h':
            message = `🎊 See You Soon!\n\nYour reservation at ${venue.name} is in 2 hours!\n\n👥 ${booking.party_size} guests\n🔖 ${booking.booking_reference}\n\nWe're excited to welcome you! ✨`;
            break;
          default:
            message = `Reminder for your booking at ${venue.name} - ${booking.booking_reference}`;
        }

        // Generate WhatsApp link
        const encodedMessage = encodeURIComponent(message);
        const whatsappNumber = guestPhone?.replace(/\D/g, '') || '';
        const whatsappLink = whatsappNumber 
          ? `https://wa.me/${whatsappNumber}?text=${encodedMessage}`
          : null;

        // Update reminder status
        await supabase
          .from('booking_reminders')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);

        // Create notification for venue staff
        await supabase.from('notifications').insert({
          user_id: null,
          type: 'reminder_ready',
          title: `${reminder.reminder_type} Reminder Ready`,
          body: `Reminder for ${booking.booking_reference} (${booking.party_size} guests) is ready to send`,
          deep_link: whatsappLink || `/bookings/${booking.id}`,
        });

        results.push({ id: reminder.id, success: true });
        console.log(`Processed reminder ${reminder.id} for booking ${booking.booking_reference}`);

      } catch (err) {
        console.error(`Error processing reminder ${reminder.id}:`, err);
        
        await supabase
          .from('booking_reminders')
          .update({ 
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
          })
          .eq('id', reminder.id);

        results.push({ 
          id: reminder.id, 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Processed ${successful} reminders successfully, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      processed: pendingReminders.length,
      successful,
      failed,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-pending-reminders:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
