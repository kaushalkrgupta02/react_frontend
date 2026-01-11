# import-google-places

Admin-only Supabase Edge Function that imports venue data from Google Places API (no map UI) and upserts into `public.venues`.

## Secrets

Set in Supabase:

- `GOOGLE_PLACES_API_KEY`

## Run

Call the function with an admin user's access token:

- `POST /functions/v1/import-google-places`

Example body:

```json
{
  "limit": 200,
  "dryRun": false
}
```

Notes:
- `limit` is hard-capped at 500 by the function.
- This is intended for internal use only (seed/enrich data), while the customer app searches Supabase.

## Automated (recommended)

From the repo root:

- Dry run (cheap):
  - `SUPA_JWT='<access_token>' npm run import:google:dry`

- Real import:
  - `SUPA_JWT='<access_token>' npm run import:google:run`

Or call the script directly:

- `SUPA_JWT='<access_token>' ./scripts/import-google-places.sh 200 false`

## Venue type

The importer sets `venues.venue_type_id` (e.g. Bar/Nightclub/Rooftop/etc) using a simple heuristic based on:

- Google place `types` (stored in `venues.venue_categories`)
- The search query / venue name (e.g. contains "rooftop")
