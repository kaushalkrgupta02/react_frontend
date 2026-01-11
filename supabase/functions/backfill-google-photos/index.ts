/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

type BackfillRequest = {
  // Max venues processed per run.
  limit?: number;
  // Only fill missing cover images.
  onlyMissing?: boolean;
  // Control how many photos are downloaded/uploaded.
  photoLimit?: number;
  // When true, don't write anything.
  dryRun?: boolean;
};

type GooglePhoto = {
  name: string;
};

type PlaceDetails = {
  photos?: GooglePhoto[];
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function contentTypeToExt(contentType: string | null): string {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("image/webp")) return "webp";
  if (ct.includes("image/png")) return "png";
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return "jpg";
  return "jpg";
}

async function fetchPlaceDetails(params: { apiKey: string; placeId: string }): Promise<PlaceDetails> {
  const url = `https://places.googleapis.com/v1/places/${params.placeId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": params.apiKey,
      "X-Goog-FieldMask": "photos",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places details error ${res.status}: ${text}`);
  }

  return (await res.json()) as PlaceDetails;
}

async function fetchPlacePhoto(params: {
  apiKey: string;
  photoName: string;
  maxWidthPx?: number;
}): Promise<{ bytes: Uint8Array; contentType: string | null } | null> {
  const maxWidthPx = clampInt(params.maxWidthPx ?? 900, 900, 200, 1600);
  const url = `https://places.googleapis.com/v1/${params.photoName}/media?maxWidthPx=${maxWidthPx}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": params.apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places photo error ${res.status}: ${text}`);
  }

  const buf = await res.arrayBuffer();
  return { bytes: new Uint8Array(buf), contentType: res.headers.get("content-type") };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Missing Supabase env" }, { status: 500 });
    }
    if (!GOOGLE_PLACES_API_KEY) {
      return jsonResponse({ error: "Missing GOOGLE_PLACES_API_KEY secret" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: "Invalid token" }, { status: 401 });
    }

    const { data: roleRow, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Role lookup error:", roleError);
      return jsonResponse({ error: "Failed to validate role" }, { status: 500 });
    }
    if (!roleRow) {
      return jsonResponse({ error: "Forbidden (admin only)" }, { status: 403 });
    }

    const payload = (req.method === "POST" ? (await req.json()) : {}) as BackfillRequest;

    const limit = clampInt(payload.limit, 200, 1, 500);
    const onlyMissing = payload.onlyMissing !== false;
    const dryRun = Boolean(payload.dryRun);
    const photoLimit = clampInt(payload.photoLimit, limit, 0, 500);

    const photoBucket = "venue-images";

    // Pull a batch of venues to backfill.
    let query = supabaseAdmin
      .from("venues")
      .select("id, external_id, cover_image_url")
      .eq("external_source", "google_places")
      .not("external_id", "is", null)
      .limit(limit);

    if (onlyMissing) {
      query = query.is("cover_image_url", null);
    }

    const { data: venues, error: venuesError } = await query;
    if (venuesError) {
      console.error("Venue fetch error:", venuesError);
      return jsonResponse({ error: `Failed to fetch venues: ${venuesError.message}` }, { status: 500 });
    }

    const processed: Array<{ venueId: string; placeId: string; updated: boolean; reason?: string }> = [];
    let downloaded = 0;
    let updated = 0;
    let errorCount = 0;
    const errorsSample: Array<{ venueId: string; placeId: string; message: string }> = [];

    for (const v of (venues ?? []) as Array<{ id: string; external_id: string; cover_image_url: string | null }>) {
      if (downloaded >= photoLimit) break;
      const placeId = v.external_id;

      try {
        const details = await fetchPlaceDetails({ apiKey: GOOGLE_PLACES_API_KEY, placeId });
        const firstPhoto = details.photos?.[0];
        if (!firstPhoto?.name) {
          processed.push({ venueId: v.id, placeId, updated: false, reason: "no_photo" });
          continue;
        }

        const photo = await fetchPlacePhoto({ apiKey: GOOGLE_PLACES_API_KEY, photoName: firstPhoto.name, maxWidthPx: 900 });
        if (!photo) {
          processed.push({ venueId: v.id, placeId, updated: false, reason: "photo_fetch_null" });
          continue;
        }

        const ext = contentTypeToExt(photo.contentType);
        const objectPath = `google_places/${placeId}.${ext}`;

        if (!dryRun) {
          const { error: uploadError } = await supabaseAdmin.storage
            .from(photoBucket)
            .upload(objectPath, photo.bytes, {
              contentType: photo.contentType ?? undefined,
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`upload failed: ${uploadError.message}`);
          }

          const { data } = supabaseAdmin.storage.from(photoBucket).getPublicUrl(objectPath);
          const coverUrl = data.publicUrl;

          const { error: updateError } = await supabaseAdmin
            .from("venues")
            .update({ cover_image_url: coverUrl })
            .eq("id", v.id);

          if (updateError) {
            throw new Error(`db update failed: ${updateError.message}`);
          }

          updated++;
          downloaded++;
          processed.push({ venueId: v.id, placeId, updated: true });
        } else {
          downloaded++;
          processed.push({ venueId: v.id, placeId, updated: false, reason: "dry_run" });
        }

        // Small delay to be gentler on rate limits.
        await new Promise((r) => setTimeout(r, 120));
      } catch (e) {
        errorCount++;
        const msg = e instanceof Error ? e.message : String(e);
        if (errorsSample.length < 5) errorsSample.push({ venueId: v.id, placeId, message: msg });
        processed.push({ venueId: v.id, placeId, updated: false, reason: "error" });
      }
    }

    return jsonResponse({
      success: true,
      dryRun,
      limit,
      onlyMissing,
      photoLimit,
      totalCandidates: (venues ?? []).length,
      downloaded,
      updated,
      errorCount,
      errorsSample,
      processed,
    });
  } catch (error) {
    console.error("backfill-google-photos error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
