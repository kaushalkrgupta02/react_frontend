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

type ImportRequest = {
  // Hard cap across all queries.
  limit?: number;
  // Defaults to Jakarta, Indonesia.
  location?: { lat: number; lng: number; radiusMeters?: number };
  // Optional override queries.
  queries?: string[];
  // Dry-run: fetches from Google but does not write to DB.
  dryRun?: boolean;
  // When true, attempts to fetch a cover photo and upload to Supabase Storage.
  // This can increase Google/API bandwidth costs.
  includePhotos?: boolean;
  // Hard cap on number of photos downloaded per run.
  photoLimit?: number;
};

type GooglePhoto = {
  name: string;
  widthPx?: number;
  heightPx?: number;
};

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  priceLevel?: string;
  types?: string[];
  regularOpeningHours?: unknown;
  photos?: GooglePhoto[];
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function mapPriceLevel(level?: string): number | null {
  // Google Places API (new) returns enum strings like PRICE_LEVEL_FREE/INEXPENSIVE/...
  // We normalize to 0..4 where possible.
  switch (level) {
    case "PRICE_LEVEL_FREE":
      return 0;
    case "PRICE_LEVEL_INEXPENSIVE":
      return 1;
    case "PRICE_LEVEL_MODERATE":
      return 2;
    case "PRICE_LEVEL_EXPENSIVE":
      return 3;
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return 4;
    default:
      return null;
  }
}

function inferVenueTypeName(params: {
  googleTypes: string[];
  placeName: string | null;
  query: string;
}): string {
  const types = params.googleTypes.map((t) => String(t).toLowerCase());
  const q = params.query.toLowerCase();
  const name = (params.placeName ?? "").toLowerCase();

  if (types.includes("night_club") || types.includes("nightclub")) return "Nightclub";
  if (q.includes("rooftop") || name.includes("rooftop")) return "Rooftop";
  if (types.includes("cafe")) return "Cafe";
  if (types.includes("restaurant")) return "Restaurant";
  if (types.includes("bar")) return "Bar";
  return "Lounge";
}

// deno-lint-ignore no-explicit-any
async function loadVenueTypeIdMap(
  supabaseAdmin: any,
): Promise<Record<string, string>> {
  const desiredNames = ["Bar", "Nightclub", "Rooftop", "Lounge", "Cafe", "Restaurant"];

  const { data: rows, error } = await supabaseAdmin
    .from("venue_types")
    .select("id,name")
    .in("name", desiredNames);

  if (error) throw new Error(`Failed to load venue_types: ${error.message}`);

  const map: Record<string, string> = {};
  for (const r of (rows ?? []) as Array<{ id: string; name: string }>) {
    map[r.name] = r.id;
  }

  return map;
}

async function searchPlacesText(params: {
  apiKey: string;
  textQuery: string;
  location: { lat: number; lng: number; radiusMeters: number };
  pageToken?: string;
}): Promise<{ places: GooglePlace[]; nextPageToken?: string }>
{
  const { apiKey, textQuery, location, pageToken } = params;

  const url = "https://places.googleapis.com/v1/places:searchText";

  const body: Record<string, unknown> = {
    textQuery,
    locationBias: {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius: location.radiusMeters,
      },
    },
    languageCode: "en",
    maxResultCount: 20,
  };

  if (pageToken) body.pageToken = pageToken;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      // Field mask is required for Places API (new) billing + response shaping.
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.priceLevel,places.types,places.regularOpeningHours,places.photos,nextPageToken",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { places?: GooglePlace[]; nextPageToken?: string };
  return { places: json.places ?? [], nextPageToken: json.nextPageToken };
}

function contentTypeToExt(contentType: string | null): string {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("image/webp")) return "webp";
  if (ct.includes("image/png")) return "png";
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return "jpg";
  return "jpg";
}

async function fetchPlacePhoto(params: {
  apiKey: string;
  photoName: string;
  maxWidthPx?: number;
}): Promise<{ bytes: Uint8Array; contentType: string | null } | null> {
  const { apiKey, photoName } = params;
  const maxWidthPx = clampInt(params.maxWidthPx ?? 900, 900, 200, 1600);

  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
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

    // Admin-only: require app_role = 'admin'
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

    const payload = (req.method === "POST" ? (await req.json()) : {}) as ImportRequest;

    const limit = clampInt(payload.limit, 200, 1, 500);
    const dryRun = Boolean(payload.dryRun);
    const includePhotos = Boolean(payload.includePhotos);
    const photoLimit = clampInt(payload.photoLimit, 50, 0, 500);

    const location = payload.location ?? { lat: -6.2088, lng: 106.8456, radiusMeters: 25000 };
    const radiusMeters = clampInt(location.radiusMeters ?? 25000, 25000, 1000, 50000);

    const queries = (payload.queries && payload.queries.length > 0)
      ? payload.queries
      : [
        "bar in Jakarta",
        "cocktail bar in Jakarta",
        "rooftop bar in Jakarta",
        "nightclub in Jakarta",
        "lounge in Jakarta",
        "speakeasy in Jakarta",
        "cafe in Jakarta",
      ];

    const seen = new Set<string>();
    const imported: Array<{ id: string; name: string | null }> = [];
    const skippedDuplicates: string[] = [];

    let writeErrorCount = 0;
    const writeErrorsSample: Array<{ id: string; message: string; code?: string; details?: string; hint?: string }> = [];

    const venueTypeIdByName = dryRun ? {} : await loadVenueTypeIdMap(supabaseAdmin);

    const photoBucket = "venue-images";
    let photosDownloaded = 0;

    let fetched = 0;
    for (const q of queries) {
      if (fetched >= limit) break;

      let pageToken: string | undefined;
      let pageGuard = 0;

      while (fetched < limit && pageGuard < 5) {
        const { places, nextPageToken } = await searchPlacesText({
          apiKey: GOOGLE_PLACES_API_KEY,
          textQuery: q,
          location: { lat: location.lat, lng: location.lng, radiusMeters },
          pageToken,
        });

        pageGuard++;

        for (const p of places) {
          if (fetched >= limit) break;
          if (!p?.id) continue;

          if (seen.has(p.id)) {
            skippedDuplicates.push(p.id);
            continue;
          }
          seen.add(p.id);

          const name = p.displayName?.text?.trim() || null;

          const inferredVenueTypeName = inferVenueTypeName({
            googleTypes: p.types ?? [],
            placeName: name,
            query: q,
          });

          const venueTypeId = venueTypeIdByName[inferredVenueTypeName] ?? null;

          let coverImageUrl: string | null = null;

          if (!dryRun && includePhotos && photosDownloaded < photoLimit) {
            const firstPhoto = p.photos?.[0];
            if (firstPhoto?.name) {
              try {
                const photo = await fetchPlacePhoto({
                  apiKey: GOOGLE_PLACES_API_KEY,
                  photoName: firstPhoto.name,
                  maxWidthPx: 900,
                });

                if (photo) {
                  const ext = contentTypeToExt(photo.contentType);
                  const objectPath = `google_places/${p.id}.${ext}`;

                  const { error: uploadError } = await supabaseAdmin.storage
                    .from(photoBucket)
                    .upload(objectPath, photo.bytes, {
                      contentType: photo.contentType ?? undefined,
                      upsert: true,
                    });

                  if (uploadError) {
                    console.error("Photo upload failed:", uploadError);
                  } else {
                    const { data } = supabaseAdmin.storage.from(photoBucket).getPublicUrl(objectPath);
                    coverImageUrl = data.publicUrl;
                    photosDownloaded++;
                  }
                }
              } catch (e) {
                console.error("Photo fetch/upload error:", e);
              }
            }
          }

          if (!dryRun) {
            const insertRow: Record<string, unknown> = {
              name: name ?? `Place ${p.id.slice(0, 8)}`,
              venue_type_id: venueTypeId,
              address: p.formattedAddress ?? null,
              latitude: p.location?.latitude ?? null,
              longitude: p.location?.longitude ?? null,
              opening_hours: p.regularOpeningHours ?? null,
              rating: typeof p.rating === "number" ? p.rating : null,
              rating_count: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
              website: p.websiteUri ?? null,
              google_maps_url: p.googleMapsUri ?? null,
              price_level: mapPriceLevel(p.priceLevel),
              venue_categories: p.types ?? [],
              external_source: "google_places",
              external_id: p.id,
            };

            if (coverImageUrl) {
              insertRow.cover_image_url = coverImageUrl;
            }

            const { error: upsertError } = await supabaseAdmin
              .from("venues")
              .upsert(insertRow, { onConflict: "external_source,external_id" });

            if (upsertError) {
              console.error("Upsert venue failed:", upsertError);
              writeErrorCount++;
              if (writeErrorsSample.length < 5) {
                writeErrorsSample.push({
                  id: p.id,
                  message: upsertError.message,
                  code: (upsertError as unknown as { code?: string }).code,
                  details: (upsertError as unknown as { details?: string }).details,
                  hint: (upsertError as unknown as { hint?: string }).hint,
                });
              }
              // continue importing; report errors in response
            }
          }

          imported.push({ id: p.id, name });
          fetched++;
        }

        if (!nextPageToken) break;
        pageToken = nextPageToken;

        // Token may take a moment to activate; keep this small to control cost/time.
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    return jsonResponse({
      success: true,
      dryRun,
      limit,
      fetched: imported.length,
      unique: seen.size,
      writeErrorCount,
      writeErrorsSample,
      imported,
      skippedDuplicatesCount: skippedDuplicates.length,
    });
  } catch (error) {
    console.error("import-google-places error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
