import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tablecheck-signature, x-opentable-signature, x-sevenrooms-signature',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);
  const provider = url.pathname.split('/').pop() || 'unknown';

  console.log(`[Webhook] Received from provider: ${provider}`);

  try {
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const body = await req.text();
    let payload: any;
    
    try {
      payload = JSON.parse(body);
    } catch {
      payload = { raw: body };
    }

    console.log(`[Webhook] Event type: ${payload.event_type || payload.type || 'unknown'}`);

    // Extract event ID for deduplication
    const eventId = payload.event_id || payload.id || `${provider}-${Date.now()}`;
    const eventType = payload.event_type || payload.type || 'unknown';

    // Check for duplicate
    const { data: existing } = await supabase
      .from('provider_webhook_logs')
      .select('id')
      .eq('provider', provider)
      .eq('event_id', eventId)
      .single();

    if (existing) {
      console.log(`[Webhook] Duplicate event ignored: ${eventId}`);
      return new Response(
        JSON.stringify({ status: 'duplicate', eventId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the webhook
    const { data: log, error: logError } = await supabase
      .from('provider_webhook_logs')
      .insert({
        provider,
        event_type: eventType,
        event_id: eventId,
        payload,
        headers,
        signature: headers[`x-${provider}-signature`] || null,
        processing_status: 'received',
      })
      .select()
      .single();

    if (logError) {
      console.error('[Webhook] Log error:', logError);
    }

    // Verify signature based on provider
    let signatureVerified = false;
    try {
      signatureVerified = await verifySignature(provider, headers, body);
    } catch (sigError) {
      console.error('[Webhook] Signature verification failed:', sigError);
    }

    // Update signature status
    if (log) {
      await supabase
        .from('provider_webhook_logs')
        .update({ 
          signature_verified: signatureVerified,
          processing_status: 'processing'
        })
        .eq('id', log.id);
    }

    // Process the webhook
    try {
      await processWebhook(supabase, provider, eventType, payload);

      // Mark as processed
      if (log) {
        await supabase
          .from('provider_webhook_logs')
          .update({ 
            processing_status: 'processed',
            processed_at: new Date().toISOString()
          })
          .eq('id', log.id);
      }

    } catch (processError: any) {
      console.error('[Webhook] Processing error:', processError);
      
      if (log) {
        await supabase
          .from('provider_webhook_logs')
          .update({ 
            processing_status: 'failed',
            error_message: processError.message,
            processing_attempts: (log.processing_attempts || 0) + 1
          })
          .eq('id', log.id);
      }
    }

    return new Response(
      JSON.stringify({ status: 'received', eventId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function verifySignature(provider: string, headers: Record<string, string>, body: string): Promise<boolean> {
  // Signature verification per provider
  // In production, use proper HMAC verification with provider secrets
  
  switch (provider) {
    case 'tablecheck':
      return verifyTableCheckSignature(headers, body);
    case 'opentable':
      return verifyOpenTableSignature(headers, body);
    case 'sevenrooms':
      return verifySevenRoomsSignature(headers, body);
    default:
      console.log(`[Webhook] No signature verification for provider: ${provider}`);
      return false;
  }
}

async function verifyTableCheckSignature(headers: Record<string, string>, body: string): Promise<boolean> {
  const signature = headers['x-tablecheck-signature'];
  if (!signature) return false;
  
  // TODO: Implement proper HMAC verification with TableCheck webhook secret
  // const webhookSecret = Deno.env.get('TABLECHECK_WEBHOOK_SECRET');
  // const expectedSignature = await computeHMAC(webhookSecret, body);
  // return signature === expectedSignature;
  
  return true; // Placeholder - implement proper verification
}

async function verifyOpenTableSignature(headers: Record<string, string>, body: string): Promise<boolean> {
  const signature = headers['x-opentable-signature'];
  if (!signature) return false;
  return true; // Placeholder
}

async function verifySevenRoomsSignature(headers: Record<string, string>, body: string): Promise<boolean> {
  const signature = headers['x-sevenrooms-signature'];
  if (!signature) return false;
  return true; // Placeholder
}

async function processWebhook(supabase: any, provider: string, eventType: string, payload: any) {
  console.log(`[Webhook] Processing ${provider} event: ${eventType}`);

  switch (provider) {
    case 'tablecheck':
      return await processTableCheckEvent(supabase, eventType, payload);
    case 'opentable':
      return await processOpenTableEvent(supabase, eventType, payload);
    case 'sevenrooms':
      return await processSevenRoomsEvent(supabase, eventType, payload);
    default:
      console.log(`[Webhook] Unknown provider: ${provider}`);
  }
}

async function processTableCheckEvent(supabase: any, eventType: string, payload: any) {
  // TableCheck webhook events
  // - reservation.created
  // - reservation.updated
  // - reservation.cancelled
  // - reservation.seated
  // - reservation.no_show

  const reservationId = payload.reservation_id || payload.data?.id;

  if (!reservationId) {
    console.log('[TableCheck Webhook] No reservation ID in payload');
    return;
  }

  // Find our external reservation record
  const { data: extRes } = await supabase
    .from('external_reservations')
    .select('*, bookings(*)')
    .eq('provider_reservation_id', reservationId)
    .eq('provider', 'tablecheck')
    .single();

  if (!extRes) {
    console.log(`[TableCheck Webhook] No matching reservation for ${reservationId}`);
    return;
  }

  // Map TableCheck event to our status
  let newStatus: string | null = null;
  let bookingStatus: string | null = null;

  switch (eventType) {
    case 'reservation.created':
      newStatus = 'synced';
      bookingStatus = 'confirmed';
      break;
    case 'reservation.updated':
      newStatus = 'synced';
      break;
    case 'reservation.cancelled':
      newStatus = 'cancelled';
      bookingStatus = 'cancelled';
      break;
    case 'reservation.seated':
      newStatus = 'synced';
      // Could update a "seated_at" field
      break;
    case 'reservation.no_show':
      newStatus = 'synced';
      bookingStatus = 'cancelled'; // Or a specific no-show status
      break;
  }

  if (newStatus) {
    await supabase
      .from('external_reservations')
      .update({ 
        sync_status: newStatus,
        provider_status: eventType,
        provider_response: payload,
        last_synced_at: new Date().toISOString()
      })
      .eq('id', extRes.id);
  }

  if (bookingStatus && extRes.booking_id) {
    await supabase
      .from('bookings')
      .update({ status: bookingStatus })
      .eq('id', extRes.booking_id);

    // Create notification for user
    if (bookingStatus === 'cancelled') {
      await supabase
        .from('notifications')
        .insert({
          user_id: extRes.bookings?.user_id,
          title: 'Reservation Cancelled',
          body: 'Your reservation has been cancelled by the venue.',
          type: 'booking',
          deep_link: `/bookings/${extRes.booking_id}`,
        });
    }
  }

  console.log(`[TableCheck Webhook] Updated reservation ${reservationId} to ${newStatus}`);
}

async function processOpenTableEvent(supabase: any, eventType: string, payload: any) {
  // OpenTable webhook processing
  console.log('[OpenTable Webhook] Processing:', eventType);
  // Similar implementation to TableCheck
}

async function processSevenRoomsEvent(supabase: any, eventType: string, payload: any) {
  // SevenRooms webhook processing
  console.log('[SevenRooms Webhook] Processing:', eventType);
  // Similar implementation to TableCheck
}
