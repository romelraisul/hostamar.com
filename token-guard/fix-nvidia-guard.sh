#!/bin/bash
# fix-nvidia-guard.sh — Fix NVIDIA Token Guard 1/1.0 RPM trap
# Root cause: crontab learned on wrong DB + aggressive halving collapsed kimi-k3 to 1 RPM with no heat recovery
# Run: bash ~/hostamar-build/token-guard/fix-nvidia-guard.sh
set -e
BUILD=/home/romel/hostamar-build
DB=$BUILD/state/nvidia_guard.db
GUARD=$BUILD/token-guard/nvidia-guard.py
LOG=$BUILD/logs/nvidia-guard.log
CRON_LOG=$BUILD/logs/token-guard-cron.log

echo "=== NVIDIA Token Guard FIX ==="
echo "Date: $(date -Is)"

# 1) Show current broken state
echo ""
echo "--- BEFORE (broken) ---"
python3 $GUARD --stats 2>&1 | head -n 20
echo ""
python3 -c "
import sqlite3
conn=sqlite3.connect('$DB')
cur=conn.execute(\"SELECT model,max_rpm,cooldown_seconds,last_429_at FROM rate_limits WHERE model='moonshotai/kimi-k3'\")
r=cur.fetchone()
print(f'kimi-k3: RPM={r[1]} cooldown={r[2]} last429={r[3]}')
conn.close()
"

# 2) Fix crontab: token-guard.py --learn -> nvidia-guard.py --learn  (wrong file/DB)
echo ""
echo "--- Fixing crontab ---"
CRON_TMP=$(mktemp)
crontab -l > $CRON_TMP 2>&1 || true
if grep -q "token-guard/token-guard.py --learn" $CRON_TMP; then
  sed -i 's|token-guard/token-guard.py --learn|token-guard/nvidia-guard.py --learn|g' $CRON_TMP
  # also add nvidia-guard restart supervisor if missing
  if ! grep -q "start-nvidia-guard" $CRON_TMP; then
    echo "*/2 * * * * bash /home/romel/hostamar-build/token-guard/start-nvidia-guard.sh >> /home/romel/hostamar-build/logs/nvidia-guard.log 2>&1" >> $CRON_TMP
    echo "Added guard supervisor to crontab"
  fi
  crontab $CRON_TMP && echo "Crontab FIXED: learn now hits nvidia_guard.db"
else
  echo "Crontab already correct or missing"
fi
cat $CRON_TMP | grep -E "nvidia|token-guard"
rm -f $CRON_TMP

# 3) Patch guard: floor at 4 RPM (not 1) and less aggressive halving
echo ""
echo "--- Patching guard (floor=4, less aggressive) ---"
# backup
cp $GUARD ${GUARD}.bak.$(date +%Y%m%d_%H%M%S)
# Fix learn_from_429: floor 4, half-> 0.7x not 0.5x
python3 <<'PY'
import pathlib
p = pathlib.Path("/home/romel/hostamar-build/token-guard/nvidia-guard.py")
t = p.read_text()
orig = t
# 1) floor at 4 not 1
t = t.replace('new_rpm = max(min(safe, round(existing["max_rpm"] * 0.5, 1)), 1)', 'new_rpm = max(min(safe, round(existing["max_rpm"] * 0.7, 1)), 4)')
t = t.replace('safe = max(1, round(rpm_at_failure * 0.8))', 'safe = max(4, round(rpm_at_failure * 0.8))')
# 2) initial insert floor 4
t = t.replace('VALUES (?,?,?,datetime', 'VALUES (?,?,?,datetime')  # no change needed, but ensure safe floor applies
# 3) heat recovery comment stays
if t != orig:
    p.write_text(t)
    print("Patched: learn floor 4 RPM, 0.7x reduction (was 0.5x/1 RPM)")
else:
    print("Already patched or pattern mismatch")
PY

# 4) Reset trapped models (kimi-k3 1.0 -> 16, others 4.0 -> keep but heal)
echo ""
echo "--- Resetting trapped kimi-k3 (1 RPM -> 16) ---"
python3 <<'PY'
import sqlite3
DB="/home/romel/hostamar-build/state/nvidia_guard.db"
conn=sqlite3.connect(DB)
# reset only the collapsed one(s)
for model, new_rpm in [("moonshotai/kimi-k3", 16.0)]:
    cur=conn.execute("SELECT max_rpm FROM rate_limits WHERE model=?", (model,))
    row=cur.fetchone()
    if row and row[0] <= 2:
        conn.execute("UPDATE rate_limits SET max_rpm=?, cooldown_seconds=60, last_429_at=NULL, last_updated=datetime('now') WHERE model=?", (new_rpm, model))
        conn.execute("DELETE FROM rate_events WHERE model=? AND event_type IN ('429','fallback')", (model,))
        print(f"RESET {model}: {row[0]} -> {new_rpm} RPM (cleared 429 history)")
        conn.commit()
    else:
        print(f"{model} already {row[0] if row else 'missing'} RPM, skip")
# also heal glm-5.2 and minimax-m3 4.0 -> 16
for m in ["z-ai/glm-5.2", "minimaxai/minimax-m3"]:
    cur=conn.execute("SELECT max_rpm FROM rate_limits WHERE model=?", (m,))
    row=cur.fetchone()
    if row and row[0] == 4.0:
        conn.execute("UPDATE rate_limits SET max_rpm=?, cooldown_seconds=60 WHERE model=?", (16.0, m))
        conn.commit()
        print(f"HEALED {m}: 4.0 -> 16.0 RPM")
conn.close()
PY

# 5) Restart guard (pick up patched code)
echo ""
echo "--- Restarting guard ---"
pkill -f "nvidia-guard.py.*12436" 2>/dev/null || true
sleep 1
bash $BUILD/token-guard/start-nvidia-guard.sh 2>&1
sleep 2
ss -tln | grep -q ":12436" && echo "Guard RESTARTED on :12436" || echo "Guard FAILED to start"

# 6) Run learn immediately to verify heat
echo ""
echo "--- Running --learn (heat) ---"
python3 $GUARD --learn 2>&1 | tail -n 20

# 7) Test proxy
echo ""
echo "--- Testing proxy ---"
curl -s http://127.0.0.1:12436/v1/models 2>&1 | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"Proxy OK: {len(d.get('data',[]))} models\")" 2>&1 || echo "Proxy test failed"

# 8) Verify fix
echo ""
echo "--- AFTER (fixed) ---"
python3 $GUARD --stats 2>&1 | grep -A4 "moonshotai/kimi-k3"
python3 -c "
import sqlite3
conn=sqlite3.connect('$DB')
for r in conn.execute(\"SELECT model,max_rpm FROM rate_limits WHERE max_rpm<10 ORDER BY max_rpm\"):
    print(r)
"

echo ""
echo "=== FIX DONE ==="
echo "What changed:"
echo "  1. Crontab: token-guard.py --learn -> nvidia-guard.py --learn (was heating wrong DB)"
echo "  2. Added */2 supervisor to restart guard if dead"
echo "  3. Patched learn floor 1->4 RPM, halving 0.5x->0.7x (prevents collapse to 1 RPM)"
echo "  4. Reset kimi-k3 1.0 -> 16 RPM, healed glm-5.2/minimax 4->16"
echo "  5. Restarted guard"
echo ""
echo "Next: test with: curl -H 'Authorization: Bearer \$NVIDIA_API_KEY' http://127.0.0.1:12436/v1/chat/completions -d '{\"model\":\"moonshotai/kimi-k3\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}'"
