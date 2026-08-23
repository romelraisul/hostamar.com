#!/usr/bin/env bash
# Re-fetch TV_AGENT_SECRET plaintext via env-ID endpoint (decrypt=true), retest agent endpoints. v2
set -uo pipefail
TOKEN="$(python3 -c "import json;print(json.load(open('$HOME/.local/share/com.vercel.cli/auth.json'))['token'])")"
PID="prj_WwYkMz8Kk75NN573skKxxWcuMVYi"
BASE="https://hostamar.com"

python3 - "$TOKEN" "$PID" > /tmp/tvsec.env <<'PYEOF'
import json, sys, urllib.request
token, pid = sys.argv[1], sys.argv[2]
req = urllib.request.Request(f'https://api.vercel.com/v9/projects/{pid}/env',
                             headers={'Authorization': f'Bearer {token}'})
envs = json.load(urllib.request.urlopen(req))['envs']
vid = next((e['id'] for e in envs if e['key'] == 'TV_AGENT_SECRET'), None)
if not vid:
    raise SystemExit('ENV_ID_NOT_FOUND')
req2 = urllib.request.Request(
    f'https://api.vercel.com/v9/projects/{pid}/env/{vid}?target=production&decrypt=true',
    headers={'Authorization': f'Bearer {token}'})
d = json.load(urllib.request.urlopen(req2))
val = ''
if isinstance(d.get('decrypted'), dict):
    val = d['decrypted'].get('value', '')
elif isinstance(d.get('decrypted'), str):
    val = d['decrypted']
val = val or d.get('value') or ''
if not val:
    raise SystemExit(f'NO_PLAINTEXT keys={list(d.keys())}')
print(f'TV_AGENT_SECRET={val}')
PYEOF

if [ ! -s /tmp/tvsec.env ]; then echo "SECRET_FETCH_FAILED"; cat /tmp/tvsec.env; exit 1; fi
source /tmp/tvsec.env && rm -f /tmp/tvsec.env
echo "secret fetched (len=${#TV_AGENT_SECRET}, not printed)"

echo "--- agent/destinations with real secret ---"
curl -s -m 30 -H "x-agent-secret: $TV_AGENT_SECRET" "$BASE/api/tv/agent/destinations" | head -c 120; echo
echo "--- agent/commands with real secret ---"
curl -s -m 30 "$BASE/api/tv/agent/commands?secret=$TV_AGENT_SECRET" | head -c 120; echo

umask 077
printf 'TV_AGENT_SECRET=%s\n' "$TV_AGENT_SECRET" > .tv-agent-secret.local
grep -q '^\.tv-agent-secret.local$' .gitignore 2>/dev/null || printf '.tv-agent-secret.local\n' >> .gitignore
echo "saved to .tv-agent-secret.local (git-ignored)"
