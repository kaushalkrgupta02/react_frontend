#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   SUPA_JWT='<access_token>' ./scripts/backfill-google-photos.sh 200 false
#
# Arguments:
#   $1 = limit (default: 200)
#   $2 = dryRun (true/false, default: false)

LIMIT="${1:-200}"
DRY_RUN="${2:-false}"

if [[ -z "${SUPA_JWT:-}" ]]; then
  echo "Missing SUPA_JWT env var." >&2
  echo "Example: SUPA_JWT='eyJ...'<access_token> ./scripts/backfill-google-photos.sh 200 false" >&2
  exit 1
fi

URL="https://aybtpsuvriymvvbxeama.supabase.co/functions/v1/backfill-google-photos"

curl -sS "$URL" \
  -H "Authorization: Bearer $SUPA_JWT" \
  -H "Content-Type: application/json" \
  --data "{\"limit\":$LIMIT,\"dryRun\":$DRY_RUN,\"onlyMissing\":true,\"photoLimit\":$LIMIT}" \
| cat
