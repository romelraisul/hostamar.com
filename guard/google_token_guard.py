"""
Hostamar Google API Token Guard — prevents 429 quota exhaustion with retry-after parsing
and multi-key fallback. Pattern mirrors NVIDIA token guard.
"""

from __future__ import annotations
import os, time, re, sqlite3, threading, datetime, json
from pathlib import Path
from collections import deque
from typing import Optional, List, Dict, Tuple

STATE_DIR = Path(os.path.expanduser("~/hostamar-build/state"))
STATE_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = STATE_DIR / "google_guard_history.db"

# Config via env
PER_MIN = int(os.environ.get("GG_PER_MIN", "15"))      # requests per minute
PER_DAY = int(os.environ.get("GG_PER_DAY", "1500"))    # requests per day
KEY_COOLDOWN = int(os.environ.get("GG_KEY_COOLDOWN", "60"))  # seconds to wait before retrying a key


class GoogleTokenGuard:
    """
    Google Gemini API token guard with:
    - Per-minute / per-day rate limiting
    - Multiple API key rotation
    - Retry-after parsing from 429 responses
    - SQLite history tracking
    """
    
    def __init__(self, api_keys: Optional[List[str]] = None):
        self._lock = threading.RLock()
        self._keys = api_keys or self._load_keys_from_env()
        self._key_index = 0
        self._key_cooldowns: Dict[str, float] = {}  # key -> timestamp when usable
        
        # Rate limit windows
        self._min_window = deque()  # (ts, key_idx)
        self._day_window = deque()  # (ts, key_idx)
        
        # DB
        self._conn = self._open_db()
        self._warm_from_db()
    
    def _load_keys_from_env(self) -> List[str]:
        """Load Google API keys from environment variables."""
        keys = []
        # Primary key
        primary = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if primary:
            keys.append(primary)
        # Additional keys: GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
        i = 1
        while True:
            key = os.environ.get(f"GEMINI_API_KEY_{i}") or os.environ.get(f"GOOGLE_API_KEY_{i}")
            if not key:
                break
            keys.append(key)
            i += 1
        return keys
    
    def _open_db(self) -> sqlite3.Connection:
        c = sqlite3.connect(str(DB_PATH), check_same_thread=False, isolation_level=None)
        c.execute("PRAGMA journal_mode=WAL")
        c.execute("""CREATE TABLE IF NOT EXISTS events(
            ts TEXT NOT NULL, key_idx INTEGER, model TEXT,
            tokens_in INTEGER DEFAULT 0, tokens_out INTEGER DEFAULT 0,
            latency_ms INTEGER DEFAULT 0, status TEXT DEFAULT 'ok',
            error TEXT DEFAULT '', retry_after REAL DEFAULT 0)""")
        c.execute("CREATE INDEX IF NOT EXISTS idx_ts ON events(ts DESC)")
        return c
    
    def _warm_from_db(self):
        now = time.time()
        day_ago = datetime.datetime.fromtimestamp(now - 86400, datetime.timezone.utc).isoformat()
        try:
            for row in self._conn.execute(
                "SELECT ts, key_idx FROM events WHERE ts >= ? ORDER BY ts", (day_ago,)):
                t = datetime.datetime.fromisoformat(row[0]).timestamp()
                self._day_window.append((t, row[1]))
                if t > now - 60:
                    self._min_window.append((t, row[1]))
        except Exception:
            pass
    
    def _get_current_key(self) -> Tuple[str, int]:
        """Get the next available key, skipping cooled-down keys."""
        with self._lock:
            now = time.time()
            for i, key in enumerate(self._keys):
                cooldown_until = self._key_cooldowns.get(key, 0)
                if now >= cooldown_until:
                    return key, i
            # All keys cooling down - return the one cooling down soonest
            if self._key_cooldowns:
                soonest_key = min(self._key_cooldowns.items(), key=lambda x: x[1])
                return soonest_key[0], self._keys.index(soonest_key[0])
            # No keys at all - raise
            raise RuntimeError("No Google API keys configured")
    
    def acquire(self, estimated_tokens: int = 1000) -> Tuple[str, int, float]:
        """
        Block until a key is available within rate limits.
        Returns (key, key_index, waited_seconds).
        """
        waited = 0.0
        while True:
            with self._lock:
                now = time.time()
                
                # Clean old entries
                min_cut = now - 60
                while self._min_window and self._min_window[0][0] < min_cut:
                    self._min_window.popleft()
                day_cut = now - 86400
                while self._day_window and self._day_window[0][0] < day_cut:
                    self._day_window.popleft()
                
                # Check per-minute limit
                if len(self._min_window) >= PER_MIN:
                    wait = self._min_window[0][0] + 60 - now + 0.1
                    time.sleep(max(0.1, wait))
                    waited += max(0.1, wait)
                    continue
                
                # Check per-day limit
                if len(self._day_window) >= PER_DAY:
                    # Wait until midnight UTC
                    utc = datetime.datetime.now(datetime.timezone.utc)
                    nxt = (utc + datetime.timedelta(days=1)).replace(
                        hour=0, minute=1, second=0, microsecond=0)
                    wait = (nxt - utc).total_seconds() + 1
                    time.sleep(min(wait, 3600))
                    waited += min(wait, 3600)
                    continue
                
                # Get available key
                key, key_idx = self._get_current_key()
                
                # Reserve slots
                self._min_window.append((now, key_idx))
                self._day_window.append((now, key_idx))
                return key, key_idx, waited
    
    def record(
        self,
        key_idx: int,
        model: str,
        tokens_in: int = 0,
        tokens_out: int = 0,
        latency_ms: int = 0,
        status: str = "ok",
        error: str = "",
        retry_after: float = 0
    ):
        """Record API call result."""
        ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._lock:
            self._conn.execute(
                """INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?)""",
                (ts, key_idx, model, tokens_in, tokens_out, latency_ms, status, error, retry_after)
            )
            
            # If 429 with retry-after, put key on cooldown
            if status == "429" and retry_after > 0:
                key = self._keys[key_idx]
                self._key_cooldowns[key] = time.time() + max(retry_after, KEY_COOLDOWN)
                print(f"[GoogleGuard] Key {key_idx} cooling down for {retry_after:.0f}s")
    
    def parse_retry_after(self, error_response: dict) -> float:
        """Parse retry delay from Google 429 error response."""
        # Error format: "retryDelay": "19.213897353s"
        try:
            delay_str = error_response.get("error", {}).get("retryDelay", "")
            match = re.search(r"([\d.]+)s", delay_str)
            if match:
                return float(match.group(1))
        except Exception:
            pass
        
        # Also check for "Retry-After" header style in message
        try:
            msg = str(error_response)
            match = re.search(r"retry in ([\d.]+)", msg, re.IGNORECASE)
            if match:
                return float(match.group(1))
        except Exception:
            pass
        
        return 0
    
    def call_with_guard(
        self,
        call_fn,
        model: str,
        *args,
        **kwargs
    ) -> Tuple[any, Dict]:
        """
        Execute an API call with token guard protection.
        Returns (result, metadata).
        """
        key, key_idx, waited = self.acquire()
        
        start = time.time()
        try:
            result = call_fn(key, *args, **kwargs)
            latency = int((time.time() - start) * 1000)
            self.record(key_idx, model, latency_ms=latency, status="ok")
            return result, {"key_idx": key_idx, "latency_ms": latency, "waited": waited}
        
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            error_str = str(e)
            
            # Try to parse 429 retry delay
            retry_after = 0
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                # Try to extract from exception
                retry_after = self._extract_retry_after(e)
                self.record(key_idx, model, latency_ms=latency, status="429", 
                           error=error_str, retry_after=retry_after)
            else:
                self.record(key_idx, model, latency_ms=latency, status="error", error=error_str)
            raise
    
    def _extract_retry_after(self, exception: Exception) -> float:
        """Extract retry delay from various exception formats."""
        try:
            # Check if it's a Google API exception with response
            if hasattr(exception, 'response'):
                resp = exception.response
                if hasattr(resp, 'json'):
                    return self.parse_retry_after(resp.json())
                if hasattr(resp, 'text'):
                    return self.parse_retry_after({"error": {"message": resp.text}})
            
            # Check args
            for arg in exception.args:
                if isinstance(arg, dict):
                    return self.parse_retry_after(arg)
                if isinstance(arg, str):
                    return self.parse_retry_after({"error": {"message": arg}})
        except Exception:
            pass
        return 0
    
    def snapshot(self) -> dict:
        with self._lock:
            now = time.time()
            def used(dq, win):
                c = now - win
                while dq and dq[0][0] < c: dq.popleft()
                return len(dq)
            return {
                "keys_total": len(self._keys),
                "keys_cooling": len(self._key_cooldowns),
                "min_used": used(self._min_window, 60),
                "min_cap": PER_MIN,
                "day_used": used(self._day_window, 86400),
                "day_cap": PER_DAY,
            }
    
    def get_next_key(self) -> str:
        """Get current key for manual use."""
        key, _, _ = self.acquire()
        return key


# Module-level singleton
_GOOGLE_GUARD: GoogleTokenGuard | None = None

def get_google_guard() -> GoogleTokenGuard:
    global _GOOGLE_GUARD
    if _GOOGLE_GUARD is None:
        _GOOGLE_GUARD = GoogleTokenGuard()
    return _GOOGLE_GUARD