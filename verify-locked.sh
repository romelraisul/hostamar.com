#!/usr/bin/env bash
# verify-locked.sh — assert locked Ollama models are present.
# Reads /home/romel/hostamar-build/perma-locked.json — GROUND TRUTH, never hardcoded.
set -uo pipefail
PASS=0; FAIL=0
LOCK="/home/romel/hostamar-build/perma-locked.json"
# Force local ollama host — .env.docker sets OLLAMA_HOST to the container
# name (hostamar-model:8000) which breaks `ollama list` outside compose.
export OLLAMA_HOST="${OLLAMA_HOST_LOCAL:-http://localhost:11434}"
LIST=$(ollama list 2>/dev/null || echo "")
if [ -z "$LIST" ]; then
  echo "FAIL: ollama list empty (host down?)"; exit 2
fi
python3 - "$LOCK" <<'PY'
import json, sys, subprocess
locked = json.load(open(sys.argv[1]))
listed = subprocess.run(['ollama','list'], capture_output=True, text=True).stdout
missing = []
for m in locked.get('models', []):
    alias = m['alias']
    # match by name (docker-style — `name` or `name:tag` substring)
    if alias not in listed:
        missing.append(alias)
print(f"locked models: {len(locked.get('models',[]))}, missing: {len(missing)}")
for x in missing: print(f"  MISSING: {x}")
sys.exit(1 if missing else 0)
PY
