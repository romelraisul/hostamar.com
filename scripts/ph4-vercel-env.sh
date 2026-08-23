#!/usr/bin/env bash
# Phase 4: set missing Vercel env vars via API (add-first-then-delete, upsert semantics).
set -euo pipefail
cd /home/romel/hostamar-build

TOKEN="$(python3 -c "import json;print(json.load(open('$HOME/.local/share/com.vercel.cli/auth.json'))['token'])")"
PROJECT_ID="prj_WwYkMz8Kk75NN573skKxxWcuMVYi"

# 1. Which TV env vars are missing remotely?
MISSING="$(python3 - "$PROJECT_ID" <<'PYEOF'
import json, sys, urllib.request
token = json.load(open('/home/romel/.local/share/com.vercel.cli/auth.json'))['token']
pid = sys.argv[1]
req = urllib.request.Request(
    f'https://api.vercel.com/v9/projects/{pid}/env',
    headers={'Authorization': f'Bearer {token}'})
envs = {e['key'] for e in json.load(urllib.request.urlopen(req))['envs']}
need = ['TV_AGENT_SECRET', 'TV_HLS_URL', 'CLOUDFLARE_TUNNEL_TOKEN']
print('\n'.join(k for k in need if k not in envs))
PYEOF
)"
echo "missing: ${MISSING:-none}"

if [ -z "$MISSING" ]; then echo "nothing to add"; exit 0; fi

# 2. Generate TV_AGENT_SECRET if missing (32 hex chars). TV_HLS_URL / tunnel token
#    intentionally NOT fabricated — user sets them when the CF tunnel exists.
if echo "$MISSING" | grep -q '^TV_AGENT_SECRET$'; then
  GEN="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"
  echo "--- upserting TV_AGENT_SECRET (value hidden) ---"
  CODE="$(curl -s -o /tmp/upsert-resp.json -w '%{http_code}' -X POST \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"key\":\"TV_AGENT_SECRET\",\"value\":\"$GEN\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\",\"development\"]}" \
    "https://api.vercel.com/v10/projects/$PROJECT_ID/env?upsert=true")"
  echo "HTTP $CODE"
  head -c 200 /tmp/upsert-resp.json; echo
fi

# 3. Confirm final state
python3 - "$PROJECT_ID" <<'PYEOF'
import json, sys, urllib.request
token = json.load(open('/home/romel/.local/share/com.vercel.cli/auth.json'))['token']
req = urllib.request.Request(
    f'https://api.vercel.com/v9/projects/{sys.argv[1]}/env',
    headers={'Authorization': f'Bearer {token}'})
keys = {e['key'] for e in json.load(urllib.request.urlopen(req))['envs']}
for k in ['TV_AGENT_SECRET', 'TV_HLS_URL', 'CLOUDFLARE_TUNNEL_TOKEN']:
    print(f"{k}: {'SET' if k in keys else 'still-missing'}")
print('total env count:', len(keys))
PYEOF
