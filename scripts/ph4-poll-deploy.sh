#!/usr/bin/env bash
# Phase 4b: poll latest Vercel deployments until READY/ERROR (max ~8 min).
set -euo pipefail
TOKEN="$(python3 -c "import json;print(json.load(open('/home/romel/.local/share/com.vercel.cli/auth.json'))['token'])")"
PROJECT_ID="prj_WwYkMz8Kk75NN573skKxxWcuMVYi"

for i in $(seq 1 24); do
  curl -s -m 30 -H "Authorization: Bearer $TOKEN" \
    "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&limit=2&target=production" \
    -o /tmp/deps.json
  python3 - <<'PYEOF' > /tmp/dstate.txt
import json
d = json.load(open('/tmp/deps.json'))
for dep in d.get('deployments', [])[:2]:
    print(f"{dep.get('state','?'):10} {dep['uid']} {dep.get('meta',{}).get('githubCommitRef','?')}@{str(dep.get('meta',{}).get('githubCommitSha',''))[:7]} {dep.get('url','')}")
PYEOF
  STATE="$(head -1 /tmp/dstate.txt | awk '{print $1}')"
  echo "[$i] $(head -1 /tmp/dstate.txt)"
  if [ "$STATE" = "READY" ] || [ "$STATE" = "ERROR" ] || [ "$STATE" = "CANCELED" ]; then break; fi
  sleep 20
done
cat /tmp/dstate.txt
