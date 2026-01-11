import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderRequest {
  bookingId: string;
  venueId: string;
  venueName: string;
  bookingRef: string;
  bookingDate: string;
  partySize: number;
  guestPhone?: string;
  messageType: 'reminder' | 'deposit_request';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { 
      bookingId, 
      venueId, 
      venueName, 
      bookingRef, 
      bookingDate, 
      partySize,
      guestPhone,
      messageType 
    }: ReminderRequest = await req.json();

    console.log(`Sending ${messageType} for booking ${bookingRef}`);

    // Get venue's WhatsApp number for reference
    const { data: venue } = await supabase
      .from('venues')
      .select('whatsapp, phone, name')
      .eq('id', venueId)
      .single();

    const actualVenueName = venueName || venue?.name || 'the venue';

    // Format the message based on type
    let message: string;
    const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    if (messageType === 'deposit_request') {
      message = `Hi! This is ${actualVenueName}. 🎉

We're excited about your upcoming reservation (${bookingRef}) for ${partySize} guests on ${formattedDate}.

To secure your booking, we kindly request a deposit. Please reply to this message or contact us to arrange payment.

Thank you for choosing ${actualVenueName}! ✨`;
    } else {
      message = `Hi! Just a friendly reminder from ${actualVenueName}! 🎉

Your reservation (${bookingRef}) for ${partySize} guests is confirmed for ${formattedDate}.

We're looking forward to seeing you! Please let us know if your plans change.

See you soon! ✨`;
    }

    // Generate WhatsApp deep link
    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = guestPhone?.replace(/\D/g, '') || '';
    const whatsappLink = whatsappNumber 
      ? `https://wa.me/${whatsappNumber}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    // Log the reminder attempt
    await supabase.from('notifications').insert({
      user_id: null, // Venue notification
      type: 'reminder_sent',
      title: `${messageType === 'deposit_request' ? 'Deposit request' : 'Reminder'} prepared`,
      body: `${messageType} for booking ${bookingRef} - ${partySize} guests on ${formattedDate}`,
      deep_link: `/bookings/${bookingId}`,
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Reminder prepared',
      whatsappLink,
      messagePreview: message,
      bookingRef,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-whatsapp-reminder:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
