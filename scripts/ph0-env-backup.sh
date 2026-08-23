#!/usr/bin/env bash
# Phase 0: back up Vercel env (plaintext dev pull + full remote key list).
set -euo pipefail
cd /home/romel/hostamar-build
export PATH="$PATH:/mnt/c/Users/User/AppData/Roaming/npm"

TOKEN="$(python3 -c "import json;print(json.load(open('$HOME/.local/share/com.vercel.cli/auth.json'))['token'])")"
PROJECT_ID="prj_WwYkMz8Kk75NN573skKxxWcuMVYi"

echo "--- 1. vercel env pull (backup) ---"
vercel env pull .env.vercel.backup --yes --token="$TOKEN" 2>&1 | tail -2 || echo "PULL_FAILED"

echo "--- 2. remote env list via API ---"
curl -s -m 30 -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env?decrypt=false" -o .env.backup.json
python3 - <<'PYEOF'
import json
d = json.load(open('.env.backup.json'))
if 'envs' not in d:
    print('API_LIST_FAILED:', str(d)[:200])
else:
    rows = sorted(d['envs'], key=lambda e: e['key'])
    print(f"remote env count: {len(rows)}")
    for e in rows:
        tgts = ','.join(e.get('target', ['custom']))
        print(f"{e['key']} [{tgts}]")
PYEOF
