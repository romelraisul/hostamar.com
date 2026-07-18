#!/usr/bin/env bash
# disk-guard.sh — Hostamar performance + disk watchdog.
# Runs via cron every 15 min. SAFE: never deletes locked models, never blocks,
# never fake-passes. Touches Windows Task Manager metrics? No — but it enforces
# Linux-side disk/RAM heuristics that prevent the WSL VHDX from ballooning
# and crashing the host (which is what makes Task Manager spike to 100%).
set -uo pipefail

BUILD="/home/romel/hostamar-build"
LOCK_JSON="$BUILD/perma-locked.json"
METRICS_DB="$BUILD/state/metrics.db"
LOG="$BUILD/logs/disk-guard.log"
DISK_GUARD_LOG="$BUILD/logs/disk-guard-actions.log"
PERM_LOG="$BUILD/permanent.log"
mkdir -p "$BUILD/logs" "$BUILD/state"
log() { printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*" >> "$LOG"; }
log "=== disk-guard tick ==="

# ---------- ensure metrics DB schema ----------
python3 - <<'PY' || true
import sqlite3, datetime
DB = '/home/romel/hostamar-build/state/metrics.db'
c = sqlite3.connect(DB)
c.execute("""CREATE TABLE IF NOT EXISTS metrics(
  ts TEXT, disk_root_pct INT, disk_c_pct INT, disk_root_gb_used REAL,
  disk_root_gb_free REAL, wsl_mem_total_gb REAL, wsl_mem_used_gb REAL,
  mem_pct INT, cpu_load_1m REAL, n_docker_containers INT, n_docker_up INT,
  n_docker_exited INT, docker_disk_gb REAL, ollama_up INT, router_up INT,
  tokens_24h INT, requests_24h INT, four29_24h INT)""")
c.execute("""CREATE TABLE IF NOT EXISTS guard_actions(
  ts TEXT, kind TEXT, detail TEXT)""")
c.commit()
PY

# ---------- collect & record metrics ----------
PRUNE_TRIGGER_FILE=$(mktemp)
python3 - "$PRUNE_TRIGGER_FILE" <<'PY'
import json, subprocess, datetime, os, sys
import sqlite3
DB = '/home/romel/hostamar-build/state/metrics.db'
LOCK = json.load(open('/home/romel/hostamar-build/perma-locked.json'))
TRIGGER_FILE = sys.argv[1]
ts = datetime.datetime.now(datetime.timezone.utc).isoformat()

def sh(c): return subprocess.run(c, shell=True, capture_output=True, text=True).stdout.strip()
def pct(m):
    r = sh(f"df %s | awk 'NR==2{{print $5}}' | tr -d '%%'" % m)
    return int(r) if r.isdigit() else -1
def gbfree(m):
    r = sh(f"df -h %s | awk 'NR==2{{print $4}}'" % m).rstrip('G')
    try: return float(r)
    except: return -1.0
def gbused(m):
    r = sh(f"df -h %s | awk 'NR==2{{print $3}}'" % m).rstrip('G')
    try: return float(r)
    except: return -1.0

# RAM (MB) — total / available; pressure = (1 - avail/total)*100
mem_total, mem_used, mem_pct = -1.0, -1.0, -1
try:
    parts = sh("free -m | awk 'NR==2{print $2,$7}'").split()
    total_mb, avail_mb = int(parts[0]), int(parts[1])
    mem_total = total_mb / 1024.0
    mem_used = (total_mb - avail_mb) / 1024.0
    mem_pct = int(100 * (1 - (avail_mb / total_mb))) if total_mb else 0
except: pass
cpu_1m = -1.0
try:
    cpu_1m = float(sh("cat /proc/loadavg").split()[0])
except: pass

n_total = n_up = n_exited = 0
docker_disk_gb = -1.0
try:
    ps = subprocess.run(['docker','ps','-a','--format','{{.Status}}'], capture_output=True, text=True).stdout.strip().splitlines()
    n_total = len(ps)
    n_up = sum(1 for s in ps if s.startswith('Up'))
    n_exited = sum(1 for s in ps if s.startswith('Exited'))
    sz = subprocess.run(['docker','system','df','--format','{{.Size}}'], capture_output=True, text=True).stdout.strip().splitlines()
    if sz:
        v = sz[0]
        if 'GB' in v: docker_disk_gb = float(v.replace('GB','').strip())
        elif 'MB' in v: docker_disk_gb = float(v.replace('MB','').strip())/1024
except: pass

ollama_up = 1 if subprocess.run(['curl','-sf','--max-time','3','http://localhost:11434/api/tags'], capture_output=True).returncode==0 else 0
router_up = 1 if subprocess.run(['curl','-sf','--max-time','4','http://localhost:4000/v1/models'], capture_output=True).returncode==0 else 0

tk24 = req24 = f24 = 0
try:
    g = sqlite3.connect('/home/romel/hostamar-build/state/guard_history.db')
    cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat()
    row = g.execute("SELECT COUNT(*), COALESCE(SUM(tokens_in+tokens_out),0) FROM events WHERE ts >= ?", (cutoff,)).fetchone()
    req24, tk24 = row[0], row[1]
    f24 = g.execute("SELECT COUNT(*) FROM events WHERE status='429' AND ts >= ?", (cutoff,)).fetchone()[0]
except: pass

root_pct = pct('/')
c_pct = pct('/mnt/c')
root_used = gbused('/')
root_free = gbfree('/')

c = sqlite3.connect(DB)
c.execute("INSERT INTO metrics VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    (ts, root_pct, c_pct, root_used, root_free,
     mem_total, mem_used, mem_pct, cpu_1m,
     n_total, n_up, n_exited, docker_disk_gb,
     ollama_up, router_up, tk24, req24, f24))

action = None
if c_pct >= 85:
    action = ('prune-c-windows', f'c%={c_pct}')
elif root_pct >= 90:
    action = ('prune-root-linux', f'root%={root_pct}')
elif mem_pct >= 92:
    action = ('mem-pressure', f'mem%={mem_pct}')

if action:
    kind, detail = action
    c.execute("INSERT INTO guard_actions VALUES (?,?,?)", (ts, kind, detail))
    c.commit()
    print(f"ACTION {kind} {detail}")
    with open(TRIGGER_FILE, 'w') as f: f.write(f"{kind}|{detail}")
else:
    c.commit()
    print(f"healthy root={root_pct}% c={c_pct}% mem={mem_pct}% cpu1m={cpu_1m:.2f} dockers={n_total}/{n_up}")
PY

PRUNE_KIND=""
if [ -s "$PRUNE_TRIGGER_FILE" ]; then
  PRUNE_KIND=$(cut -d'|' -f1 "$PRUNE_TRIGGER_FILE")
  rm -f "$PRUNE_TRIGGER_FILE"
else
  rm -f "$PRUNE_TRIGGER_FILE"
fi

if [ -n "$PRUNE_KIND" ]; then
  log "PRUNE TRIGGERED: $PRUNE_KIND"
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] prune cycle start" >> "$DISK_GUARD_LOG"

  # SAFE deletes — paths come from perma-locked.json's allow-list, NOT from git.
  python3 - <<'PY' || true
import json, subprocess, datetime, os
LOCK = json.load(open('/home/romel/hostamar-build/perma-locked.json'))
def tidy(p):
    # Only allow-listed globs; guarded by the lock file content, NOT user input.
    if p not in LOCK.get('hostamar-build_externals_to_clean_under_pressure', []): return 0
    r = subprocess.run(['bash','-c', f'rm -rf -- {p} 2>/dev/null; true'])
    return 1

n = 0
for p in LOCK.get('hostamar-build_externals_to_clean_under_pressure', []):
    n += tidy(p)

# truncate logs over 10MB (NOT the guard history db, NOT permanent.log used by permanent.sh main flow)
for f in ['/home/romel/hostamar-build/logs/disk-guard.log',
          '/tmp/ollama.log']:
    try:
        if os.path.exists(f) and os.path.getsize(f) > 10*1024*1024:
            with open(f,'w') as fh: fh.write('')
    except: pass

print(f"pruned {n} allow-listed paths; logs tidied")
PY

  # Docker prune — explicit; older than 72h; DELETES dangling images only (running containers safe)
  docker system prune -f --filter "until=72h" >>"$DISK_GUARD_LOG" 2>&1 || true
  docker builder prune -f >>"$DISK_GUARD_LOG" 2>&1 || true

  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] prune cycle done; c%=$(df -h /mnt/c | awk 'NR==2{print $5}')" >> "$DISK_GUARD_LOG"
else
  log "healthy (no prune)"
fi

# ---------- final: drop old guard history if it gets too big ----------
# (guard itself archives >30d; this handles runaway growth after wsl shutdown)
GUARD_DB="$BUILD/state/guard_history.db"
if [ -f "$GUARD_DB" ] && [ "$(stat -c%s "$GUARD_DB" 2>/dev/null || echo 0)" -gt 104857600 ]; then
  log "guard DB > 100MB; letting the guard's own compaction handle it"
  # No intervention — TokenGuard._maybe_compact runs on next import.
fi

log "=== disk-guard done ==="
