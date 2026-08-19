#!/usr/bin/env python3
"""
NVIDIA Token Guard v3 — Adaptive Rate Limiter with Learning
============================================================

Lightweight HTTP proxy that learns rate limits from 429 responses
and dynamically adjusts request timing so API calls never fail.

PROXY MODE:  python3 token-guard.py --listen :12435 --upstream http://:12434
LEARN MODE:  python3 token-guard.py --learn     (cron every 3min)
STATS MODE:  python3 token-guard.py --stats

FILE:  $BUILD/token-guard/token-guard.py
DB:    $BUILD/state/token_guard.db
LOG:   $BUILD/logs/token-guard.log
"""

import argparse
import http.server
import json
import os
import sqlite3
import subprocess
import sys
import time
import urllib.request
import urllib.error
from collections import defaultdict
from datetime import datetime, timezone
from threading import Lock

BUILD = os.environ.get("BUILD", "/home/romel/hostamar-build")
DB_PATH = os.path.join(BUILD, "state", "token_guard.db")
LOG_PATH = os.path.join(BUILD, "logs", "token-guard.log")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

# ─── Global state (protected by lock) ────────────────────────────────
_model_counters = defaultdict(int)  # model → request count in current window
_window_start = time.time()
_state_lock = Lock()

def log(msg, level="INFO"):
    ts = datetime.now(timezone.utc).isoformat()[:22]
    line = f"[{ts}] [{level}] {msg}"
    print(line, flush=True)
    with open(LOG_PATH, "a") as f:
        f.write(line + "\n")

# ─── Database ────────────────────────────────────────────────────────
def get_conn():
    """Return a thread-safe DB connection."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS rate_limits (
            model TEXT PRIMARY KEY,
            max_rpm REAL,
            cooldown_seconds INTEGER DEFAULT 300,
            last_429_at TEXT,
            last_updated TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS rate_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT DEFAULT (datetime('now')),
            model TEXT,
            event_type TEXT,
            rpm REAL DEFAULT 0,
            details TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS learning_state (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_events_ts ON rate_events(ts);
    """)
    conn.commit()
    return conn

def record_event(conn, model, event_type, rpm=0.0, details=""):
    conn.execute("INSERT INTO rate_events (model, event_type, rpm, details) VALUES (?,?,?,?)",
                 (model, event_type, rpm, details))
    conn.commit()

def get_current_rpm(conn, model):
    """Compute requests-per-minute for a model in the last 60s."""
    row = conn.execute("""
        SELECT COUNT(*) as c FROM rate_events
        WHERE model=? AND event_type='request' AND ts >= datetime('now','-60 seconds')
    """, (model,)).fetchone()
    return row["c"] if row else 0

def learn_from_429(conn, model, rpm_at_failure):
    """
    Update learned limits after a 429.
    Learning: set RPM limit to 80% of failure RPM (or reduce existing by 15%).
    """
    safe = max(1, round(rpm_at_failure * 0.8))
    existing = conn.execute("SELECT max_rpm, cooldown_seconds FROM rate_limits WHERE model=?", (model,)).fetchone()
    if existing:
        new_rpm = min(safe, round(existing["max_rpm"] * 0.85, 1))
        new_cd = min(existing["cooldown_seconds"] + 60, 3600)
        conn.execute("UPDATE rate_limits SET max_rpm=?, cooldown_seconds=?, last_429_at=datetime('now'), last_updated=datetime('now') WHERE model=?",
                     (new_rpm, new_cd, model))
        log(f"LEARN ↑ {model}: RPM {existing['max_rpm']}→{new_rpm} (429 at {rpm_at_failure}RPM), cooldown {existing['cooldown_seconds']}→{new_cd}s")
    else:
        conn.execute("INSERT INTO rate_limits (model, max_rpm, cooldown_seconds, last_429_at) VALUES (?,?,?,datetime('now'))",
                     (model, safe, 300))
        log(f"LEARN ★ {model}: initial limit {safe} RPM, cooldown 300s")
    conn.commit()

def is_on_cooldown(conn, model):
    """Check if model is in cooldown after 429."""
    row = conn.execute("""
        SELECT ts, cooldown_seconds FROM rate_events re
        JOIN rate_limits rl ON re.model = rl.model
        WHERE re.model=? AND re.event_type='429'
        ORDER BY re.id DESC LIMIT 1
    """, (model,)).fetchone()
    if not row:
        return False
    try:
        last_429 = datetime.fromisoformat(row["ts"])
        elapsed = (datetime.now(timezone.utc) - last_429).total_seconds()
        return elapsed < row["cooldown_seconds"]
    except:
        return False

def cooldown_remaining(conn, model):
    """Seconds until cooldown ends."""
    row = conn.execute("""
        SELECT ts FROM rate_events
        WHERE model=? AND event_type='429' ORDER BY id DESC LIMIT 1
    """, (model,)).fetchone()
    if not row:
        return 0
    try:
        last = datetime.fromisoformat(row["ts"])
        rl = conn.execute("SELECT cooldown_seconds FROM rate_limits WHERE model=?", (model,)).fetchone()
        cd = rl["cooldown_seconds"] if rl else 300
        return max(0, cd - (datetime.now(timezone.utc) - last).total_seconds())
    except:
        return 0

# ─── HTTP Proxy Handler ──────────────────────────────────────────────
class GuardProxyHandler(http.server.BaseHTTPRequestHandler):
    """HTTP(S) proxy that intercepts 429s and enforces learned rate limits."""
    
    # Shared across all threads
    _upstream_url = None
    _conn_holder = None  # thread-local would be better but this works
    
    def log_message(self, format, *args):
        pass  # silence stdlib HTTP server logs
    
    def do_GET(self):
        self._proxy_request("GET")
    
    def do_POST(self):
        self._proxy_request("POST")
    
    def do_PUT(self):
        self._proxy_request("PUT")
    
    def _proxy_request(self, method):
        """Forward request to upstream, enforce guard."""
        conn = get_conn()
        upstream = self.__class__._upstream_url.rstrip("/")
        
        # Read body ONCE for both model detection and forwarding
        body = None
        content_length = self.headers.get("Content-Length")
        if content_length and int(content_length) > 0:
            try:
                body = self.rfile.read(int(content_length))
            except:
                body = None
        
        model = self._detect_model(body)
        
        try:
            # ── Rate limit check ──
            if model and is_on_cooldown(conn, model):
                remaining = int(cooldown_remaining(conn, model))
                self._respond_429(remaining, model, f"Cooldown {remaining}s")
                return
            
            if model:
                with _state_lock:
                    _model_counters[model] += 1
                rpm = get_current_rpm(conn, model)
                record_event(conn, model, "request", rpm)
                
                # If approaching learned limit, add progressive delay
                rl = conn.execute("SELECT max_rpm FROM rate_limits WHERE model=?", (model,)).fetchone()
                if rl and rl["max_rpm"] and rpm > rl["max_rpm"] * 0.8:
                    delay = (rpm / rl["max_rpm"] - 0.8) * 10  # up to 2s delay
                    if delay > 0.1:
                        log(f"DELAY {model}: {rpm}/{rl['max_rpm']} RPM → wait {delay:.1f}s")
                        time.sleep(delay)
                        record_event(conn, model, "delay", rpm, f"delayed {delay:.1f}s")
            
            # ── Forward request ──
            url = upstream + self.path
            req = urllib.request.Request(url, data=body, method=method,
                                         headers=dict(self.headers))
            req.headers.pop("Host", None)
            req.headers.pop("Content-Length", None)
            
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    status = resp.status
                    resp_body = resp.read()
                    resp_headers = dict(resp.getheaders())
            except urllib.error.HTTPError as e:
                status = e.code
                resp_body = e.read() if hasattr(e, 'read') else b""
                resp_headers = dict(e.headers)
            
            # ── Detect 429 and learn ──
            if status == 429 and model:
                rpm = get_current_rpm(conn, model)
                learn_from_429(conn, model, rpm)
                record_event(conn, model, "429", rpm, f"429 at {rpm}RPM")
                log(f"⚠ 429 DETECTED: {model} at {rpm} RPM — learned & falling back")
                self._respond_429(300, model, f"Rate limited at {rpm}RPM")
                return
            
            # ── Success response ──
            self.send_response(status)
            for k, v in resp_headers.items():
                if k.lower() not in ("transfer-encoding", "content-encoding", "content-length"):
                    self.send_header(k, v)
            self.send_header("Content-Length", str(len(resp_body)))
            
            # Inject guard header
            if model and status == 200:
                self.send_header("X-Token-Guard", "active")
                rl = conn.execute("SELECT max_rpm FROM rate_limits WHERE model=?", (model,)).fetchone()
                if rl and rl["max_rpm"]:
                    self.send_header("X-Rate-Limit-Learned", str(rl["max_rpm"]))
            
            self.end_headers()
            self.wfile.write(resp_body)
            
        except Exception as e:
            log(f"ERROR: {e}")
            self._respond_502(str(e))
    
    def _detect_model(self, body=None):
        """Extract model name from request body."""
        if not body:
            return None
        try:
            payload = json.loads(body)
            return payload.get("model", None)
        except:
            return None
    
    def _respond_429(self, retry_after, model, reason):
        """Return 429 with fallback hint."""
        body = json.dumps({
            "error": {
                "message": f"Token guard: {reason}. Falling back to local model.",
                "type": "rate_limit_error",
                "code": 429
            }
        })
        self.send_response(429)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Retry-After", str(retry_after))
        self.send_header("X-Token-Guard", "cooldown")
        self.send_header("X-Fallback-Hint", "hostamar-own")
        self.end_headers()
        self.wfile.write(body.encode())
        log(f"429 RETURN: {model} — {reason}")
    
    def _respond_502(self, reason):
        """Return 502 for upstream failures."""
        body = json.dumps({"error": {"message": f"Upstream error: {reason}"}})
        self.send_response(502)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Fallback-Hint", "hostamar-own")
        self.end_headers()
        self.wfile.write(body.encode())

# ─── Main ────────────────────────────────────────────────────────────
def stats_mode():
    conn = get_conn()
    print("=" * 55)
    print("  NVIDIA TOKEN GUARD — ADAPTIVE RATE LIMITER")
    print("=" * 55)
    
    limits = conn.execute("SELECT * FROM rate_limits ORDER BY last_updated DESC").fetchall()
    if limits:
        for r in limits:
            cd_remaining = cooldown_remaining(conn, r["model"])
            status = f"🚫 {cd_remaining:.0f}s cooldown" if cd_remaining > 0 else "✅ ready"
            print(f"\n  Model:    {r['model']}")
            print(f"  RPM max:  {r['max_rpm'] or 'not learned'}")
            print(f"  Cooldown: {r['cooldown_seconds']}s")
            print(f"  Status:   {status}")
            print(f"  Last 429: {r['last_429_at'] or 'never'}")
    else:
        print("\n  No rate limits learned yet.")
    
    print("\n── Recent events ──")
    events = conn.execute(
        "SELECT ts, model, event_type, rpm, details FROM rate_events ORDER BY id DESC LIMIT 8"
    ).fetchall()
    for ev in events:
        d = ev["details"][:40] if ev["details"] else ""
        print(f"  {ev['ts'][:19]}  {ev['model']:18s} {ev['event_type']:8s} {ev['rpm']:4.0f}RPM  {d}")
    
    # Count requests in last 60min
    cnt = conn.execute("SELECT COUNT(*) as c FROM rate_events WHERE event_type='request'").fetchone()
    c60 = conn.execute("SELECT COUNT(*) as c FROM rate_events WHERE event_type='request' AND ts >= datetime('now','-1 hour')").fetchone()
    print(f"\n  Total requests: {cnt['c']}  |  Last hour: {c60['c']}")
    conn.close()

def learn_mode():
    """Cron mode: check state, log status, recover expired cooldowns."""
    conn = get_conn()
    log("LEARN: checking rate limit state")
    
    limits = conn.execute("SELECT * FROM rate_limits").fetchall()
    for r in limits:
        rem = cooldown_remaining(conn, r["model"])
        if rem <= 0 and r["last_429_at"]:
            # Cooldown just expired — log recovery
            record_event(conn, r["model"], "recover", 0, "cooldown expired")
            log(f"RECOVER: {r['model']} — cooldown ended, re-enabled")
        elif rem > 0:
            log(f"COOLDOWN: {r['model']} — {rem:.0f}s remaining")
    
    total = conn.execute("SELECT COUNT(*) as c FROM rate_events WHERE event_type='request' AND ts >= datetime('now','-1 hour')").fetchone()
    total_all = conn.execute("SELECT COUNT(*) as c FROM rate_events WHERE event_type='request'").fetchone()
    log(f"LEARN: {total['c']} req/h, {total_all['c']} total, {len(limits)} models tracked")
    conn.close()

def reset_model(model):
    conn = get_conn()
    conn.execute("DELETE FROM rate_limits WHERE model=?", (model,))
    conn.execute("DELETE FROM rate_events WHERE model=?", (model,))
    conn.commit()
    log(f"RESET: {model} — all data cleared")
    conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--listen", default="127.0.0.1:12435")
    parser.add_argument("--upstream", default="http://127.0.0.1:12434")
    parser.add_argument("--learn", action="store_true")
    parser.add_argument("--stats", action="store_true")
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--model", default=None)
    args = parser.parse_args()
    
    if args.learn:
        learn_mode()
    elif args.stats:
        stats_mode()
    elif args.reset and args.model:
        reset_model(args.model)
    else:
        log(f"START: listening on {args.listen} → upstream {args.upstream}")
        host, port = args.listen.split(":")
        GuardProxyHandler._upstream_url = args.upstream
        
        server = http.server.HTTPServer((host, int(port)), GuardProxyHandler)
        server.timeout = 0.5  # allow clean shutdown
        log(f"READY: proxy listening on {host}:{port}")
        
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            log("SHUTDOWN")
            server.server_close()
