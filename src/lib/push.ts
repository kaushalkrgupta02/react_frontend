import { supabase } from "@/integrations/supabase/client";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function base64UrlToUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function vapidPublicKeyToApplicationServerKey(vapidPublicKey: string) {
  // PushManager expects the uncompressed P-256 public key bytes (65 bytes): 0x04 || X(32) || Y(32)
  // We support both:
  // - standard base64url-encoded uncompressed public key
  // - legacy "x.y" env format (JWK coords) which we convert to uncompressed bytes
  if (vapidPublicKey.includes(".")) {
    const [x, y] = vapidPublicKey.split(".");
    const xBytes = base64UrlToUint8Array(x);
    const yBytes = base64UrlToUint8Array(y);

    if (xBytes.length !== 32 || yBytes.length !== 32) {
      throw new Error("Invalid VAPID public key format");
    }

    const uncompressed = new Uint8Array(65);
    uncompressed[0] = 0x04;
    uncompressed.set(xBytes, 1);
    uncompressed.set(yBytes, 33);
    return uncompressed;
  }

  return base64UrlToUint8Array(vapidPublicKey);
}

export async function enablePushForCurrentUser(userId: string) {
  if (!isUuid(userId)) {
    throw new Error(
      "You are in Test Mode (fake user id). Push subscriptions are saved to Supabase and require a real signed-in Supabase user. Use the real login flow (phone OTP) or sign out to exit test mode, then try again.",
    );
  }

  if (!("Notification" in window)) {
    throw new Error("Notifications are not supported in this browser");
  }

  if (!window.isSecureContext) {
    throw new Error(
      "Push notifications require a secure context (HTTPS). Safari does not support service workers on http://127.0.0.1. For local testing, use Chrome, or expose your dev server via a free HTTPS URL (e.g. Cloudflare Tunnel). On iPhone, push only works for an installed PWA (Add to Home Screen) on iOS 16.4+.",
    );
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser");
  }
  if (!("PushManager" in window)) {
    throw new Error("Push is not supported in this browser");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    if (permission === "denied") {
      throw new Error(
        "Notification permission was denied. Open the app in a real browser (Chrome/Safari), then change this site to Allow notifications in browser settings and try again.",
      );
    }

    throw new Error(
      "Notification permission was dismissed (not granted). Open the app in a real browser (not the VS Code preview) and click Allow when prompted.",
    );
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidPublicKey) {
    throw new Error("Missing VITE_VAPID_PUBLIC_KEY");
  }

  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? `Failed to register service worker: ${err.message}. (Push requires a secure context / real browser.)`
        : "Failed to register service worker. (Push requires a secure context / real browser.)",
    );
  }

  let subscription: PushSubscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKeyToApplicationServerKey(vapidPublicKey),
    });
  } catch (err) {
    // Safari commonly throws DOMException here (not an Error instance).
    const name =
      typeof err === "object" && err && "name" in err && typeof (err as { name?: unknown }).name === "string"
        ? (err as { name: string }).name
        : "SubscribeError";
    const message =
      typeof err === "object" && err && "message" in err && typeof (err as { message?: unknown }).message === "string"
        ? (err as { message: string }).message
        : String(err);

    throw new Error(
      `Failed to subscribe to push (${name}): ${message}. If you're on iPhone, push only works for an installed PWA (Add to Home Screen) on iOS 16.4+.`,
    );
  }

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Invalid push subscription");
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: userId, endpoint, p256dh, auth },
      { onConflict: "user_id,endpoint" },
    );

  if (error) throw error;

  return { endpoint };
}

export async function getPushEnabledForThisDevice() {
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}

export async function disablePushForCurrentUser(userId: string) {
  if (!isUuid(userId)) {
    throw new Error(
      "You are in Test Mode (fake user id). Push subscriptions are saved to Supabase and require a real signed-in Supabase user.",
    );
  }

  // Best-effort unsubscribe on this device.
  if ("serviceWorker" in navigator && "PushManager" in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
    } catch {
      // Ignore local unsubscribe failures; we'll still clear server-side subscriptions.
    }
  }

  // Clear all saved subscriptions for this user (account-level off).
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function sendTestNotification() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("You must be signed in to send a test notification");
  }

  if (!isUuid(sessionData.session.user.id)) {
    throw new Error(
      "Test Mode users cannot send notifications via Supabase. Sign in with a real Supabase user first.",
    );
  }

  const { data, error } = await supabase.functions.invoke("send-push-notification", {
    body: {
      title: "Test notification",
      body: "If you see this, in-app + push are working.",
      url: "/profile",
      data: { type: "test" },
    },
  });

  if (error) {
    const anyError = error as unknown as {
      message?: string;
      context?: unknown;
    };

    const ctx = anyError.context as
      | { status?: number; statusText?: string; body?: unknown }
      | { response?: Response }
      | undefined;

    // Newer shapes may expose a Response-like object
    const maybeResponse = (ctx as { response?: Response } | undefined)?.response;
    if (maybeResponse && typeof maybeResponse.text === "function") {
      const text = await maybeResponse.text();
      throw new Error(
        `Edge function failed (${maybeResponse.status}): ${text || anyError.message || "Unknown error"}`,
      );
    }

    const status = (ctx as { status?: number } | undefined)?.status;
    const body = (ctx as { body?: unknown } | undefined)?.body;
    const details =
      typeof body === "string" ? body : body ? JSON.stringify(body) : (anyError.message ?? "Unknown error");

    throw new Error(status ? `Edge function failed (${status}): ${details}` : details);
  }
  return data;
}
