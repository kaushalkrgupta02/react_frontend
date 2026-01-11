/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SendPushRequest = {
  user_id?: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  url?: string;
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Missing Supabase env" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: "Invalid token" }, { status: 401 });
    }

    const payload = (await req.json()) as SendPushRequest;

    const title = payload.title?.trim();
    if (!title) {
      return jsonResponse({ error: "Missing title" }, { status: 400 });
    }

    const targetUserId = payload.user_id ?? user.id;
    if (targetUserId !== user.id) {
      return jsonResponse({ error: "Forbidden" }, { status: 403 });
    }

    const notificationData = {
      ...(payload.data ?? {}),
      ...(payload.url ? { url: payload.url } : {}),
    };

    // Always create an in-app notification row (realtime -> toast)
    const { error: insertError } = await supabaseAdmin.from("notifications").insert({
      user_id: targetUserId,
      title,
      body: payload.body ?? null,
      data: notificationData,
    });

    if (insertError) {
      console.error("Notification insert failed:", insertError);
      return jsonResponse({ error: "Failed to create notification" }, { status: 500 });
    }

    // If VAPID keys are not configured, stop here (still succeeds for in-app)
    const vapidPublicJwkRaw = Deno.env.get("VAPID_PUBLIC_JWK");
    const vapidPrivateJwkRaw = Deno.env.get("VAPID_PRIVATE_JWK");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");

    if (!vapidPublicJwkRaw || !vapidPrivateJwkRaw || !vapidSubject) {
      return jsonResponse({ success: true, sent: 0, push: "not_configured" }, { status: 200 });
    }

    const { data: subs, error: subsError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", targetUserId);

    if (subsError) {
      console.error("Subscription query failed:", subsError);
      return jsonResponse({ error: "Failed to load subscriptions" }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      return jsonResponse({ success: true, sent: 0 }, { status: 200 });
    }

    const vapidJwk = {
      publicKey: JSON.parse(vapidPublicJwkRaw) as JsonWebKey,
      privateKey: JSON.parse(vapidPrivateJwkRaw) as JsonWebKey,
    };

    const vapidKeys = await webpush.importVapidKeys(vapidJwk, { extractable: false });
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: vapidSubject,
      vapidKeys,
    });

    const pushPayload = {
      title,
      body: payload.body ?? "",
      data: notificationData,
    };

    let sent = 0;
    let removed = 0;

    for (const sub of subs) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        const subscriber = appServer.subscribe(subscription);
        await subscriber.pushTextMessage(JSON.stringify(pushPayload), { ttl: 60 });
        sent++;
      } catch (err) {
        const pushErr = err as unknown;
        if (pushErr instanceof webpush.PushMessageError && pushErr.isGone()) {
          const { error: delError } = await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("user_id", targetUserId)
            .eq("endpoint", sub.endpoint);

          if (!delError) removed++;
          continue;
        }

        console.error("Push send failed:", err);
      }
    }

    return jsonResponse({ success: true, sent, removed }, { status: 200 });
  } catch (error) {
    console.error("send-push-notification error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
