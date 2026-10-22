#!/bin/bash
# deploy-guarded (Phase 3.3): deploy + edge purge ONLY when the built worker's
# BUILD_ID differs from live. Compares .open-next/assets/BUILD_ID (what actually
# ships) against the live flight payload. If identical: skip deploy AND purge.
set -euo pipefail
cd "$(dirname "$0")/.."

LOCAL=$(cat .open-next/assets/BUILD_ID 2>/dev/null || cat .open-next/BUILD_ID 2>/dev/null || true)
if [ -z "$LOCAL" ]; then
  echo "deploy-guarded: .open-next/assets/BUILD_ID missing — run: npm run worker:build" >&2
  exit 1
fi
NEXTID=$(cat .next/BUILD_ID 2>/dev/null || true)
if [ -n "$NEXTID" ] && [ "$NEXTID" != "$LOCAL" ]; then
  echo "deploy-guarded: WARNING .next/BUILD_ID ($NEXTID) != .open-next/BUILD_ID ($LOCAL)" >&2
  echo "  plain 'next build' refreshed .next only — re-run 'npm run worker:build' or you ship the OLD worker with fresh timestamps" >&2
fi
LIVE=$(curl -s https://hostamar.com/ | grep -oE 'buildId[^a-zA-Z0-9_-]{1,6}[A-Za-z0-9_-]{16,}' | head -1 | grep -oE '[A-Za-z0-9_-]{16,}$' || true)
echo "deploy-guarded: local(ships)=$LOCAL live=${LIVE:-unknown}"
if [ -n "$LIVE" ] && [ "$LOCAL" = "$LIVE" ]; then
  echo "deploy-guarded: BUILD_ID unchanged — skip deploy & purge"
  exit 0
fi

npm run worker:deploy
sleep 75 # edge serves stale ~1-2 min post-'Deployed'
TOK=$(grep -oP 'oauth_token = "\K[^"]+' ~/.wrangler/config/default.toml 2>/dev/null || true)
if [ -n "$TOK" ]; then
  curl -s -X POST "https://api.cloudflare.com/client/v4/zones/2aef176c6f2000da2af593f4890ec298/purge_cache" \
    -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" --data '{"purge_everything":true}' \
    | python3 -c "import json,sys;d=json.load(sys.stdin);print('purge:', 'ok' if d.get('success') else d.get('errors'))" \
    || echo "purge: API refused — purge from dash (Caching > Purge) or use a token with Zone.Cache Purge"
fi
