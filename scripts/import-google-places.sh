#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   SUPA_JWT='<access_token>' ./scripts/import-google-places.sh 200 false
#
# Arguments:
#   $1 = limit (default: 200)
#   $2 = dryRun (true/false, default: true)

LIMIT="${1:-200}"
DRY_RUN="${2:-true}"

if [[ -z "${SUPA_JWT:-}" ]]; then
  echo "Missing SUPA_JWT env var." >&2
  echo "Example: SUPA_JWT='eyJ...'<access_token> ./scripts/import-google-places.sh 200 false" >&2
  exit 1
fi

URL="https://aybtpsuvriymvvbxeama.supabase.co/functions/v1/import-google-places"

curl -sS "$URL" \
  -H "Authorization: Bearer $SUPA_JWT" \
  -H "Content-Type: application/json" \
  --data "{\"limit\":$LIMIT,\"dryRun\":$DRY_RUN}" \
| cat
