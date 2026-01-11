import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyWaitlistRequest {
  waitlist_entry_id: string;
  venue_name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { waitlist_entry_id, venue_name } = await req.json() as NotifyWaitlistRequest;

    if (!waitlist_entry_id || !venue_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Notifying waitlist entry: ${waitlist_entry_id} for venue: ${venue_name}`);

    // Get the waitlist entry
    const { data: entry, error: entryError } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .eq('id', waitlist_entry_id)
      .single();

    if (entryError || !entry) {
      console.error('Failed to fetch waitlist entry:', entryError);
      return new Response(
        JSON.stringify({ success: false, error: 'Waitlist entry not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notifications: string[] = [];

    // 1. Create in-app notification
    const { error: notifError } = await supabaseAdmin.from('notifications').insert({
      user_id: entry.user_id,
      title: '🎉 Your table is ready!',
      body: `${venue_name} has a spot for you! Please check in within 15 minutes.`,
      type: 'waitlist',
      deep_link: `/venue/${entry.venue_id}`
    });

    if (!notifError) {
      notifications.push('in-app');
      console.log('In-app notification created');
    } else {
      console.error('Failed to create in-app notification:', notifError);
    }

    // 2. Send push notification if VAPID keys are configured
    const vapidPublicJwk = Deno.env.get('VAPID_PUBLIC_JWK');
    const vapidPrivateJwk = Deno.env.get('VAPID_PRIVATE_JWK');
    
    if (vapidPublicJwk && vapidPrivateJwk) {
      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', entry.user_id);

      if (subs && subs.length > 0) {
        try {
          const webpush = await import('jsr:@negrel/webpush@0.5.0');
          
          const vapidKeys = await webpush.importVapidKeys({
            publicKey: JSON.parse(vapidPublicJwk),
            privateKey: JSON.parse(vapidPrivateJwk)
          }, { extractable: false });

          const appServer = await webpush.ApplicationServer.new({
            contactInformation: Deno.env.get('VAPID_SUBJECT') || 'mailto:support@nitelife.app',
            vapidKeys
          });

          const pushPayload = JSON.stringify({
            title: '🎉 Your table is ready!',
            body: `${venue_name} has a spot for you! Check in within 15 minutes.`,
            data: { url: `/venue/${entry.venue_id}` }
          });

          for (const sub of subs) {
            try {
              const subscriber = appServer.subscribe({
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
              });
              await subscriber.pushTextMessage(pushPayload, { ttl: 60 });
              console.log('Push notification sent');
            } catch (pushErr) {
              console.error('Push send failed:', pushErr);
            }
          }
          notifications.push('push');
        } catch (pushError) {
          console.error('Push notification error:', pushError);
        }
      }
    }

    // 3. Update the waitlist entry with notification timestamp
    const { error: updateError } = await supabaseAdmin
      .from('waitlist')
      .update({ 
        notified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      })
      .eq('id', waitlist_entry_id);

    if (updateError) {
      console.error('Failed to update waitlist entry:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications,
        message: `Sent ${notifications.length} notification(s): ${notifications.join(', ') || 'in-app'}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('notify-waitlist-guest error:', error);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
