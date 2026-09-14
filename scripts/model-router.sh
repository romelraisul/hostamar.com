#!/bin/bash
# model-router.sh — V74 hourly free-model check (opencode zen + kilocode +
# openrouter + nvidia + tokenrouter free tiers → hostamar.com/v1).
# Snapshots to ~/memories/models/, pushes a FleetReport row (Oracle lane).
# Runs from Hermes cron job "free-model-router-hourly" via the
# ~/.hermes/scripts/model-router.sh wrapper.
set -uo pipefail
TS=$(date '+%Y-%m-%d %H:%M')
STAMP=$(date '+%Y-%m-%d')
HOUR=$(date '+%H')
MEMDIR="$HOME/memories/models"
OUT="$MEMDIR/free-models-${STAMP}-${HOUR}.json"
mkdir -p "$MEMDIR"

# 1. Local Brain :4000 health + model count (must be 15+ incl. tokenrouter/*)
BRAIN=$(curl -sk --max-time 10 http://localhost:4000/v1/models 2>/dev/null | /usr/bin/python3 -c "import sys,json;print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo 0)
BRAIN_TR=$(curl -sk --max-time 10 http://localhost:4000/v1/models 2>/dev/null | /usr/bin/python3 -c "import sys,json;print(sum(1 for m in json.load(sys.stdin).get('data',[]) if m['id'].startswith('tokenrouter/')))" 2>/dev/null || echo 0)

# 2. Fresh free-model snapshot from the deployed route (merges kilo/openrouter/
#    opencode zen live + tokenrouter static; cache-bust forces upstream fetch)
SNAP=$(curl -s --max-time 45 "https://hostamar.com/api/v1/free-models?cb=$(date +%s)")
echo "$SNAP" > "$OUT"
COUNT=$(echo "$SNAP" | /usr/bin/python3 -c "import sys,json;print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo 0)
TOP=$(echo "$SNAP" | /usr/bin/python3 -c "
import sys,json
d=json.load(sys.stdin)
for m in d.get('models',[])[:5]: print(m['id'],'qs='+str(m.get('quality_score')))
" 2>/dev/null | head -5 | tr '\n' ';')

# 3. Rolling index (merge across hours — FleetReport log source)
/usr/bin/python3 /home/romel/hostamar-build/scripts/merge-free-models.py "$OUT" >/dev/null 2>&1 || true

# 4. FleetReport push — direct POST (Oracle lane owns model-trend reporting;
#    fleet-report-push.sh reads an agent-run .md which this script job is not).
if [ -f "$HOME/.hermes/scripts/fleet.env" ]; then
  . "$HOME/.hermes/scripts/fleet.env"
fi
RAW="V74 free-model router ${TS}: brain_models=${BRAIN} (tokenrouter=${BRAIN_TR}), free_models=${COUNT}. Top5: ${TOP:-n/a}. Snapshot ${OUT}"
if [ -n "${FLEET_REPORT_SECRET:-}" ]; then
  curl -s --max-time 20 -X POST "${FLEET_URL:-https://hostamar.com/api/admin/fleet}" \
    -H "Authorization: Bearer ${FLEET_REPORT_SECRET}" \
    -H 'Content-Type: application/json' \
    -d "$(/usr/bin/python3 -c "import json,sys;print(json.dumps({'employee':'Oracle','jobId':'free-model-router-hourly','verdict':'FINISHED','finished':True,'raw':sys.argv[1]}))" "$RAW")" \
    -o /tmp/fmr-push.json -w "push HTTP %{http_code}\n" 2>/dev/null
else
  echo "no FLEET_REPORT_SECRET — push skipped"
fi
echo "$RAW"
