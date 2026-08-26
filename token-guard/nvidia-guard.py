#!/usr/bin/env python3
"""
NVIDIA Cloud Token Guard — Adaptive Rate Limiter for integrate.api.nvidia.com
=============================================================================

HTTP proxy that sits between Hermes and NVIDIA's free-tier cloud API.
Learns the 40 RPM rate limit, pre-seeds it, tracks every request with
timestamps, and returns a 429 with X-Fallback-Hint when the limit is hit
so Hermes falls back to tokenrouter/kimi-k3.

  PROXY MODE:  python3 nvidia-guard.py --listen 127.0.0.1:12435
  LEARN MODE:  python3 nvidia-guard.py --learn      (cron every 3min)
  STATS MODE:  python3 nvidia-guard.py --stats
  RESET MODE:  python3 nvidia-guard.py --reset --model z-ai/glm-5.2

Nvidia free tier = 40 RPM baseline (community-acknowledged, model-dependent).
We pre-seed 32 RPM (80% of 40) so the guard throttles BEFORE hitting the real 429.

DB:   /home/romel/hostamar-build/state/nvidia_guard.db
LOG:  /home/romel/hostamar-build/logs/nvidia-guard.log
"""

import argparse
import http.server
import json
import os
import ssl
import sqlite3
import sys
import time
import urllib.request
import urllib.error
from collections import defaultdict
from datetime import datetime, timezone
from threading import Lock

BUILD = os.environ.get("BUILD", "/home/romel/hostamar-build")
DB_PATH = os.path.join(BUILD, "state", "nvidia_guard.db")
LOG_PATH = os.path.join(BUILD, "logs", "nvidia-guard.log")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

# Nvidia free-tier baseline (pre-seed so we don't need to learn from failure)
NV_BASELINE_RPM = 32  # 80% of 40 RPM — throttle before the real 429
NV_BASELINE_COOLDOWN = 60  # 60s cooldown after a real 429 (Nvidia resets fast)

# ─── Global state ─────────────────────────────────────────────────────
_model_counters = defaultdict(int)
_window_start = time.time()
_state_lock = Lock()

def log(msg, level="INFO"):
    ts = datetime.now(timezone.utc).isoformat()[:22]
    line = f"[{ts}] [{level}] {msg}"
    print(line, flush=True)
    with open(LOG_PATH, "a") as f:
        f.write(line + "\n")

# ─── Database ─────────────────────────────────────────────────────────
def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS rate_limits (
            model TEXT PRIMARY KEY,
            max_rpm REAL,
            cooldown_seconds INTEGER DEFAULT 60,
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
        CREATE INDEX IF NOT EXISTS idx_events_model ON rate_events(model);
    """)
    conn.commit()
    return conn

def seed_baseline(conn, model):
    """Pre-seed the known 40 RPM limit so we throttle before the first 429."""
    existing = conn.execute("SELECT model FROM rate_limits WHERE model=?", (model,)).fetchone()
    if not existing:
        conn.execute(
            "INSERT INTO rate_limits (model, max_rpm, cooldown_seconds) VALUES (?,?,?)",
            (model, NV_BASELINE_RPM, NV_BASELINE_COOLDOWN)
        )
        conn.commit()
        log(f"SEED: {model} → {NV_BASELINE_RPM} RPM, {NV_BASELINE_COOLDOWN}s cooldown (preset)")

def record_event(conn, model, event_type, rpm=0.0, details=""):
    conn.execute(
        "INSERT INTO rate_events (model, event_type, rpm, details) VALUES (?,?,?,?)",
        (model, event_type, rpm, details)
    )
    conn.commit()

def get_current_rpm(conn, model):
    row = conn.execute("""
        SELECT COUNT(*) as c FROM rate_events
        WHERE model=? AND event_type='request' AND ts >= datetime('now','-60 seconds')
    """, (model,)).fetchone()
    return row["c"] if row else 0

def learn_from_429(conn, model, rpm_at_failure):
    # Conservative decay: never below 16 RPM, max -30% per event.
    # (Old floors of 1-8 caused death-spiral collapse; NVIDIA free tier is
    # 40 RPM baseline — anything under 16 makes the model unusable anyway.)
    safe = max(16, round(rpm_at_failure * 0.8))
    existing = conn.execute(
        "SELECT max_rpm, cooldown_seconds FROM rate_limits WHERE model=?", (model,)
    ).fetchone()
    if existing:
        new_rpm = max(min(safe, round(existing["max_rpm"] * 0.7, 1)), 16)
        # Cooldown: cap at 120s (was 300) — Nvidia resets fast
        new_cd = min(existing["cooldown_seconds"] + 15, 120)
        conn.execute(
            "UPDATE rate_limits SET max_rpm=?, cooldown_seconds=?, "
            "last_429_at=datetime('now'), last_updated=datetime('now') WHERE model=?",
            (new_rpm, new_cd, model)
        )
        log(f"LEARN ↓ {model}: RPM {existing['max_rpm']}→{new_rpm} "
            f"(429 at {rpm_at_failure}RPM), cooldown {existing['cooldown_seconds']}→{new_cd}s")
    else:
        conn.execute(
            "INSERT INTO rate_limits (model, max_rpm, cooldown_seconds, last_429_at) "
            "VALUES (?,?,?,datetime('now'))",
            (model, safe, NV_BASELINE_COOLDOWN)
        )
        log(f"LEARN ★ {model}: initial limit {safe} RPM, cooldown {NV_BASELINE_COOLDOWN}s")
    conn.commit()

def _parse_ts(ts):
    """Parse SQLite/Guard timestamps; coerce naive to UTC (SQLite CURRENT_TIMESTAMP is UTC)."""
    dt = datetime.fromisoformat(ts)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

def is_on_cooldown(conn, model):
    row = conn.execute("""
        SELECT re.ts, rl.cooldown_seconds FROM rate_events re
        JOIN rate_limits rl ON re.model = rl.model
        WHERE re.model=? AND re.event_type='429'
        ORDER BY re.id DESC LIMIT 1
    """, (model,)).fetchone()
    if not row:
        return False
    try:
        last_429 = _parse_ts(row["ts"])
        elapsed = (datetime.now(timezone.utc) - last_429).total_seconds()
        return elapsed < row["cooldown_seconds"]
    except Exception:
        return False

def cooldown_remaining(conn, model):
    row = conn.execute("""
        SELECT ts FROM rate_events
        WHERE model=? AND event_type='429' ORDER BY id DESC LIMIT 1
    """, (model,)).fetchone()
    if not row:
        return 0
    try:
        last = _parse_ts(row["ts"])
        rl = conn.execute(
            "SELECT cooldown_seconds FROM rate_limits WHERE model=?", (model,)
        ).fetchone()
        cd = rl["cooldown_seconds"] if rl else NV_BASELINE_COOLDOWN
        return max(0, cd - (datetime.now(timezone.utc) - last).total_seconds())
    except Exception:
        return 0

# ─── HTTP Proxy Handler ──────────────────────────────────────────────
class NvidiaGuardHandler(http.server.BaseHTTPRequestHandler):
    _upstream_url = "https://integrate.api.nvidia.com"
    _api_key = None

    def log_message(self, format, *args):
        pass

    def do_GET(self):
        self._proxy_request("GET")

    def do_POST(self):
        self._proxy_request("POST")

    def do_PUT(self):
        self._proxy_request("PUT")

    def _proxy_request(self, method):
        conn = get_conn()
        upstream = self.__class__._upstream_url.rstrip("/")

        body = None
        content_length = self.headers.get("Content-Length")
        if content_length and int(content_length) > 0:
            try:
                body = self.rfile.read(int(content_length))
            except Exception:
                body = None

        model = self._detect_model(body)

        # Seed baseline for any new model
        if model:
            seed_baseline(conn, model)

        try:
            # ── Cooldown check — CIRCUIT BREAKER OPEN: serve via qwen3.8 fallback, auto-probe after cooldown ──
            if model and is_on_cooldown(conn, model):
                remaining = int(cooldown_remaining(conn, model))
                rpm_now = get_current_rpm(conn, model)
                record_event(conn, model, "fallback", rpm_now, f"cooldown {remaining}s → qwen3.8 fallback (circuit open)")
                log(f"CIRCUIT OPEN {model}: cooldown {remaining}s → serving via rushan/qwen3.8 (auto-comeback when cooldown ends)")
                fb = self._try_tokenrouter_fallback(body, model)
                if fb is not None:
                    fallback_body, used_model = fb
                    self._send_fallback_response(fallback_body, model, used_model)
                else:
                    self._respond_429(remaining, model, f"Cooldown {remaining}s")
                return

            # ── Rate limit check ──
            if model:
                with _state_lock:
                    _model_counters[model] += 1
                rpm = get_current_rpm(conn, model)
                record_event(conn, model, "request", rpm, f"{method} {self.path}")

                rl = conn.execute(
                    "SELECT max_rpm FROM rate_limits WHERE model=?", (model,)
                ).fetchone()
                if rl and rl["max_rpm"]:
                    # Hard limit: if at/over max_rpm, return fallback via qwen3.8 (circuit breaker) not 429
                    if rpm >= rl["max_rpm"]:
                        retry_after = 60
                        log(f"THROTTLE {model}: {rpm}/{rl['max_rpm']} RPM → circuit breaker → qwen3.8 fallback (retry {retry_after}s)")
                        record_event(conn, model, "fallback", rpm, f"over limit {rpm}/{rl['max_rpm']} → qwen3.8")
                        fb = self._try_tokenrouter_fallback(body, model)
                        if fb is not None:
                            fallback_body, used_model = fb
                            self._send_fallback_response(fallback_body, model, used_model)
                        else:
                            self._respond_429(retry_after, model, f"Rate limit {rpm}/{rl['max_rpm']} RPM")
                        return

                    # Approaching limit: progressive delay
                    if rpm > rl["max_rpm"] * 0.7:
                        delay = (rpm / rl["max_rpm"] - 0.7) * 15
                        if delay > 0.1:
                            log(f"DELAY {model}: {rpm}/{rl['max_rpm']} RPM "
                                f"→ wait {delay:.1f}s")
                            time.sleep(delay)
                            record_event(conn, model, "delay", rpm,
                                        f"delayed {delay:.1f}s")

            # ── Forward to Nvidia ──
            url = upstream + self.path
            headers = dict(self.headers)
            headers.pop("Host", None)
            headers.pop("Content-Length", None)
            # Inject the API key if not already in headers
            if self.__class__._api_key and "authorization" not in {k.lower() for k in headers}:
                headers["Authorization"] = f"Bearer {self.__class__._api_key}"

            # Sanitize "Hermes Agent" in system prompts — known to trigger 429 on GLM-5.2
            if body and isinstance(body, bytes):
                try:
                    payload = json.loads(body)
                    if "messages" in payload:
                        for m in payload["messages"]:
                            if m.get("role") == "system" and isinstance(m.get("content"), str):
                                if "Hermes Agent" in m["content"]:
                                    m["content"] = m["content"].replace("Hermes Agent", "Hermes framework")
                                    log("SANITIZED: 'Hermes Agent' -> 'Hermes framework' in system prompt")
                        body = json.dumps(payload).encode()
                except Exception:
                    pass  # keep original body if not parseable

            req = urllib.request.Request(url, data=body, method=method, headers=headers)

            try:
                ctx = ssl.create_default_context()
                # Use socket-level timeout for both connect + read — 30s fail-fast so large-context requests fallback quickly to tokenrouter
                import socket
                socket.setdefaulttimeout(30)
                try:
                    with urllib.request.urlopen(req, context=ctx) as resp:
                        status = resp.status
                        resp_body = resp.read()
                        resp_headers = dict(resp.getheaders())
                except urllib.error.HTTPError as e:
                    status = e.code
                    resp_body = e.read() if hasattr(e, "read") else b""
                    resp_headers = dict(e.headers)
                finally:
                    socket.setdefaulttimeout(None)
            except socket.timeout:
                log("UPSTREAM_TIMEOUT: Nvidia timeout (30s) → circuit OPEN → qwen3.8 fallback + auto-probe later")
                if model:
                    # Put circuit OPEN so next requests fast-fail to qwen3.8 without 30s wait (prevents APIConnectionError thread exhaustion)
                    rpm_now = get_current_rpm(conn, model)
                    learn_from_429(conn, model, max(1, rpm_now))
                    record_event(conn, model, "429", rpm_now, f"timeout at {rpm_now}RPM → circuit open")
                    record_event(conn, model, "timeout", rpm_now, "upstream timeout → qwen3.8 fallback")
                fb = self._try_tokenrouter_fallback(body, model)
                if fb is not None:
                    fallback_body, used_model = fb
                    self._send_fallback_response(fallback_body, model, used_model)
                else:
                    self._respond_429(15, model or "unknown", "Upstream timeout, falling back")
                return
            except urllib.error.URLError as e:
                msg = str(e)
                if "timeout" in msg.lower() or "timed out" in msg.lower():
                    log(f"URLError timeout: {e} → circuit OPEN → qwen3.8")
                    if model:
                        rpm_now = get_current_rpm(conn, model)
                        learn_from_429(conn, model, max(1, rpm_now))
                        record_event(conn, model, "429", rpm_now, f"urllib timeout → circuit open")
                    fb = self._try_tokenrouter_fallback(body, model)
                    if fb is not None:
                        fallback_body, used_model = fb
                        self._send_fallback_response(fallback_body, model, used_model)
                    else:
                        self._respond_429(15, model or "unknown", f"Upstream timeout: {msg}")
                else:
                    log(f"URLError: {e}")
                    self._respond_502(msg)
                return
            except Exception as e:
                log(f"UPSTREAM_ERROR: {e}")
                if "timeout" in str(e).lower():
                    if model:
                        rpm_now = get_current_rpm(conn, model)
                        learn_from_429(conn, model, max(1, rpm_now))
                    fb = self._try_tokenrouter_fallback(body, model)
                    if fb is not None:
                        fallback_body, used_model = fb
                        self._send_fallback_response(fallback_body, model, used_model)
                    else:
                        self._respond_429(15, model or "unknown", f"Upstream timeout: {e}")
                else:
                    self._respond_502(str(e))
                return

            # ── Detect 429 from Nvidia and learn ──
            if status == 429 and model:
                rpm = get_current_rpm(conn, model)
                learn_from_429(conn, model, rpm)
                record_event(conn, model, "429", rpm, f"upstream 429 at {rpm}RPM")
                retry_after = 60
                ra = resp_headers.get("Retry-After") or resp_headers.get("retry-after")
                if ra:
                    try:
                        retry_after = int(ra)
                    except ValueError:
                        pass
                log(f"⚠ UPSTREAM 429: {model} at {rpm} RPM — trying internal tokenrouter fallback (retry {retry_after}s)")
                record_event(conn, model, "fallback", rpm, f"upstream 429 → internal fallback")
                fb = self._try_tokenrouter_fallback(body, model)
                if fb is not None:
                    fallback_body, used_model = fb
                    self._send_fallback_response(fallback_body, model, used_model)
                else:
                    self._respond_429(retry_after, model, f"Nvidia rate limited at {rpm}RPM")
                return

            # ── Success response ──
            self.send_response(status)
            for k, v in resp_headers.items():
                if k.lower() not in ("transfer-encoding", "content-encoding",
                                     "content-length"):
                    self.send_header(k, v)
            self.send_header("Content-Length", str(len(resp_body)))

            if model and status == 200:
                self.send_header("X-Token-Guard", "active")
                rl = conn.execute(
                    "SELECT max_rpm FROM rate_limits WHERE model=?", (model,)
                ).fetchone()
                if rl and rl["max_rpm"]:
                    self.send_header("X-Rate-Limit-Learned", str(rl["max_rpm"]))
                    self.send_header("X-Rate-Limit-Current",
                                    str(get_current_rpm(conn, model)))

            self.end_headers()
            self.wfile.write(resp_body)

        except Exception as e:
            log(f"ERROR: {e}")
            self._respond_502(str(e))

    def _detect_model(self, body=None):
        if not body:
            return None
        try:
            payload = json.loads(body)
            return payload.get("model", None)
        except Exception:
            return None

    def _respond_429(self, retry_after, model, reason):
        body = json.dumps({
            "error": {
                "message": f"Token guard: {reason}. Falling back to fallback model.",
                "type": "rate_limit_error",
                "code": 429
            }
        }).encode()
        self.send_response(429)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Retry-After", str(retry_after))
        self.send_header("X-Token-Guard", "cooldown")
        self.send_header("X-Fallback-Hint", "tokenrouter-kimi-k3")
        self.end_headers()
        self.wfile.write(body)
        log(f"429 RETURN: {model} — {reason} (fallback → tokenrouter)")

    # Ordered circuit-breaker fallback chain.
    # 1) Local LiteLLM :4000 (hostamar-own = local Ollama, always up, no key, fast)
    # 2) Cloud models on :4000 (glm-5.2 / minimax-m3 via NVIDIA NIM)
    # 3) hostamar.com/v1 1M chain LAST with short timeout (gateway currently down;
    #    kept so it auto-recovers when the 104-model gateway returns)
    # NOTE: TokenRouter removed — key has $0 credit (403 confirmed 2026-08-25).
    LOCAL_LITELLM_URL = "http://127.0.0.1:4000/v1/chat/completions"
    LOCAL_LITELLM_CHAIN = ["hostamar-own", "glm-5.2", "minimax-m3"]
    HAMACOM_FALLBACK_CHAIN = [
        "moonshotai/kimi-k3",                  # 1,048,576
        "minimax/minimax-m3:free",             # 1,048,576
        "thinkingmachines/inkling:free",       # 1,048,576
        "thinkingmachines/inkling-small:free", # 1,048,576
        "nvidia/nemotron-3-super-120b-a12b",   # 1,000,000
        "nvidia/nemotron-3-ultra-550b-a55b:free", # 1,000,000
        "nvidia/nemotron-3.5-lightning:free",  # 1,000,000
    ]
    HAMACOM_URL = "https://hostamar.com/v1/chat/completions"

    def _try_tokenrouter_fallback(self, body, model):
        """Circuit-breaker fallback: local LiteLLM first (fast), then hostamar.com/v1 1M chain.
        Returns (raw_200_bytes, used_model) on success, else None."""
        import os as _os
        fallback_targets = []
        # 1) Local LiteLLM :4000 — no auth needed (master_key removed), fastest, always up
        for m in self.LOCAL_LITELLM_CHAIN:
            fallback_targets.append((self.LOCAL_LITELLM_URL, None, m))
        # 2) hostamar.com/v1 1M chain — only if key present; short per-model timeout
        hostamar_key = _os.environ.get("HERMES_CUSTOM_HOSTAMAR_COM_API_KEY", "")
        if not hostamar_key:
            try:
                for p in ["/home/romel/.hermes/.env"]:
                    for line in open(p):
                        if line.strip().startswith("HERMES_CUSTOM_HOSTAMAR_COM_API_KEY"):
                            hostamar_key = line.split("=",1)[1].strip().strip('"').strip("'")
                            break
                    if hostamar_key:
                        break
            except Exception:
                pass
        if hostamar_key and not hostamar_key.startswith("sk-hostamar-router-redacted"):
            for m in self.HAMACOM_FALLBACK_CHAIN[:3]:  # top-3 only, fail fast
                fallback_targets.append((self.HAMACOM_URL, hostamar_key, m))
        if not fallback_targets:
            log("FALLBACK: no targets available")
            return None
        try:
            payload = json.loads(body) if body else {}
        except Exception:
            payload = {}
        orig_model = payload.get("model", "unknown")
        for url, key, forced_model in fallback_targets:
            try:
                fb_payload = dict(payload)
                if forced_model:
                    fb_payload["model"] = forced_model
                # Local litellm may need longer (ollama cold start); cloud targets fail fast
                is_local = url.startswith("http://127.0.0.1") or url.startswith("http://localhost")
                fb_body = json.dumps(fb_payload).encode()
                fb_headers = {"Content-Type": "application/json"}
                if key:
                    fb_headers["Authorization"] = f"Bearer {key}"
                import socket as _sock
                _sock.setdefaulttimeout(120 if is_local else 20)
                try:
                    req = urllib.request.Request(url, data=fb_body, method="POST", headers=fb_headers)
                    ctx = ssl.create_default_context() if url.startswith("https") else None
                    with urllib.request.urlopen(req, context=ctx) as resp:
                        data = resp.read()
                        used = fb_payload.get("model")
                        log(f"FALLBACK OK: {url} model={used} orig={orig_model} → {len(data)} bytes")
                        return (data, used)
                finally:
                    _sock.setdefaulttimeout(None)
            except Exception as e:
                log(f"FALLBACK FAIL {url} (model={forced_model}): {e} — trying next")
                continue
        return None

    def _send_fallback_response(self, fallback_body, model, used_model=None):
        """Send circuit-breaker fallback response as 200, tagged with the model actually served."""
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(fallback_body)))
        self.send_header("X-Token-Guard", "fallback-active")
        self.send_header("X-Fallback-Model", used_model or "hostamar-com-1m-chain")
        self.end_headers()
        self.wfile.write(fallback_body)
        log(f"FALLBACK RETURN: {model} → served via {used_model or 'hostamar.com/v1 chain'} (200)")

    def _respond_502(self, reason):
        body = json.dumps({"error": {"message": f"Upstream error: {reason}"}}).encode()
        self.send_response(502)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Fallback-Hint", "tokenrouter-kimi-k3")
        self.end_headers()
        self.wfile.write(body)

# ─── Modes ───────────────────────────────────────────────────────────
def stats_mode():
    conn = get_conn()
    print("=" * 60)
    print("  NVIDIA CLOUD TOKEN GUARD — ADAPTIVE RATE LIMITER")
    print("  Target: integrate.api.nvidia.com (free tier, 40 RPM baseline)")
    print("=" * 60)

    limits = conn.execute(
        "SELECT * FROM rate_limits ORDER BY last_updated DESC"
    ).fetchall()
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
        print("\n  No rate limits tracked yet.")

    print("\n── Recent events (last 15) ──")
    events = conn.execute(
        "SELECT ts, model, event_type, rpm, details FROM rate_events "
        "ORDER BY id DESC LIMIT 15"
    ).fetchall()
    for ev in events:
        d = ev["details"][:50] if ev["details"] else ""
        print(f"  {ev['ts'][:19]}  {str(ev['model']):25s} "
              f"{ev['event_type']:10s} {ev['rpm']:4.0f}RPM  {d}")

    cnt = conn.execute(
        "SELECT COUNT(*) as c FROM rate_events WHERE event_type='request'"
    ).fetchone()
    c60 = conn.execute(
        "SELECT COUNT(*) as c FROM rate_events WHERE event_type='request' "
        "AND ts >= datetime('now','-1 hour')"
    ).fetchone()
    c429 = conn.execute(
        "SELECT COUNT(*) as c FROM rate_events WHERE event_type='429'"
    ).fetchone()
    cfb = conn.execute(
        "SELECT COUNT(*) as c FROM rate_events WHERE event_type='fallback'"
    ).fetchone()
    print(f"\n  Total requests: {cnt['c']}  |  Last hour: {c60['c']}  "
          f"|  429s: {c429['c']}  |  Fallbacks: {cfb['c']}")
    conn.close()

def learn_mode():
    conn = get_conn()
    limits = conn.execute("SELECT * FROM rate_limits").fetchall()
    for r in limits:
        rem = cooldown_remaining(conn, r["model"])
        # ── Recovery heating ──
        # If a model was throttled down by an upstream 429 and its cooldown has
        # now expired WITHOUT a fresh upstream 429, we don't leave it trapped at
        # a tiny RPM forever. Heat max_rpm back toward the baseline so the model
        # becomes usable again. (Learn cycle runs every 3 min.)
        if rem <= 0 and r["last_429_at"] and r["max_rpm"] and r["max_rpm"] < NV_BASELINE_RPM:
            # Only heat when no new upstream 429 has arrived since the last 429.
            fresh_429 = conn.execute(
                "SELECT COUNT(*) as c FROM rate_events "
                "WHERE model=? AND event_type='429' AND ts > ?",
                (r["model"], r["last_429_at"]),
            ).fetchone()
            if fresh_429 and fresh_429["c"] == 0:
                # Aggressive heat: 2x current (was 1.6x), toward baseline
                new_rpm = round(min(NV_BASELINE_RPM, r["max_rpm"] * 2.0), 1)
                new_cd = max(NV_BASELINE_COOLDOWN, int(r["cooldown_seconds"] * 0.5))
                conn.execute(
                    "UPDATE rate_limits SET max_rpm=?, cooldown_seconds=?, "
                    "last_updated=datetime('now') WHERE model=?",
                    (new_rpm, new_cd, r["model"]),
                )
                conn.commit()
                record_event(conn, r["model"], "heat", 0,
                             f"cooldown expired, RPM {r['max_rpm']}→{new_rpm}, "
                             f"cd {r['cooldown_seconds']}→{new_cd}s")
                log(f"HEAT ↑ {r['model']}: RPM {r['max_rpm']}→{new_rpm}, "
                    f"cooldown {r['cooldown_seconds']}→{new_cd}s (no fresh 429)")
                continue
            record_event(conn, r["model"], "recover", 0, "cooldown expired")
            log(f"RECOVER: {r['model']} — cooldown ended, re-enabled")
        elif rem > 0:
            log(f"COOLDOWN: {r['model']} — {rem:.0f}s remaining")

    total = conn.execute(
        "SELECT COUNT(*) as c FROM rate_events WHERE event_type='request' "
        "AND ts >= datetime('now','-1 hour')"
    ).fetchone()
    total_all = conn.execute(
        "SELECT COUNT(*) as c FROM rate_events WHERE event_type='request'"
    ).fetchone()
    log(f"LEARN: {total['c']} req/h, {total_all['c']} total, {len(limits)} models tracked")
    conn.close()

def reset_model(model):
    conn = get_conn()
    conn.execute("DELETE FROM rate_limits WHERE model=?", (model,))
    conn.execute("DELETE FROM rate_events WHERE model=?", (model,))
    conn.commit()
    log(f"RESET: {model} — all data cleared")
    # Re-seed baseline
    seed_baseline(conn, model)
    conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="NVIDIA Cloud Token Guard — Adaptive Rate Limiter"
    )
    parser.add_argument("--listen", default="127.0.0.1:12435",
                        help="Listen address (default 127.0.0.1:12435)")
    parser.add_argument("--upstream", default="https://integrate.api.nvidia.com",
                        help="Upstream Nvidia API URL")
    parser.add_argument("--api-key-env", default="NVIDIA_API_KEY",
                        help="Env var name for Nvidia API key (default NVIDIA_API_KEY)")
    parser.add_argument("--learn", action="store_true",
                        help="Learn mode (cron: check cooldowns, log status)")
    parser.add_argument("--stats", action="store_true",
                        help="Show current rate limits and recent events")
    parser.add_argument("--reset", action="store_true",
                        help="Reset a model's learned data (requires --model)")
    parser.add_argument("--model", default=None,
                        help="Model name for reset/seed operations")
    parser.add_argument("--seed", action="store_true",
                        help="Seed baseline rate limit for --model without starting proxy")
    args = parser.parse_args()

    if args.learn:
        learn_mode()
    elif args.stats:
        stats_mode()
    elif args.reset and args.model:
        reset_model(args.model)
    elif args.seed and args.model:
        conn = get_conn()
        seed_baseline(conn, args.model)
        conn.close()
    else:
        api_key = os.environ.get(args.api_key_env, "")
        if not api_key:
            log(f"WARNING: {args.api_key_env} not set — proxy will forward "
                f"without injecting auth (client must send Authorization header)")
        else:
            log(f"API key loaded from {args.api_key_env}")

        NvidiaGuardHandler._upstream_url = args.upstream
        NvidiaGuardHandler._api_key = api_key

        # Pre-seed known models
        conn = get_conn()
        for m in ["z-ai/glm-5.2", "z-ai/glm-5.2-free"]:
            seed_baseline(conn, m)
        conn.close()

        # ThreadingHTTPServer so one slow request doesn't block all others — increased backlog for 34k token bursts
        from http.server import ThreadingHTTPServer
        host, port = args.listen.split(":")
        # Allow 100 queued connections, not 5 (prevents APIConnectionError under burst)
        ThreadingHTTPServer.request_queue_size = 100
        server = ThreadingHTTPServer((host, int(port)), NvidiaGuardHandler)
        server.daemon_threads = True
        server.timeout = 0.5
        log(f"START: listening on {args.listen} → upstream {args.upstream} (threaded, queue=100)")
        log(f"READY: guard active, {NV_BASELINE_RPM} RPM preset, fallback → qwen3.8-27b (rushan) with auto-comeback")
        log(f"READY: circuit breaker: Closed→probe Nvidia, Open→qwen3.8, Half-Open probe every {NV_BASELINE_COOLDOWN}s via --learn heat")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            log("SHUTDOWN")
            server.server_close()
