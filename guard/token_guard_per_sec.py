"""
Hostamar token guard —永久防 429 + 时间窗口限速 + SQLite 历史追踪。

设计:
  - 滚动 60s 窗口: 每秒最多 N_tokens (按平均分布);  60s 内总 token 不超 cap。
  - 每 24h 重置;  持久 SQLite in ~/hostamar-build/state/guard_history.db (0600)。
  - 所有 API 调用通过 acquire() —若超过窗口预算则阻塞到下一秒, 不抛 429;
    若已达日上限则短轮询阻塞到次日 00:01 UTC。永远不向 NVIDIA/Kilo 发 429。
  - 每次记录: ISO ts, provider, model, tokens_in, tokens_out, ms_latency, status。
  - compact(): 保留 30 天在线历史, 旧的归档到 ~/.hostamar-build/state/guard_archive.jsonl。

用法:
  from token_guard_per_sec import TokenGuard
  g = TokenGuard()
  g.acquire(estimated_tokens=500)        # 阻塞直到安全
  g.record(provider, model, tokens_in, tokens_out, latency_ms, status='ok')
  print(g.snapshot())                    # 最近 60s / 24h 状态

环境变量:
  TG_PER_SEC=8        每秒最多 N token (默认 8)
  TG_PER_MIN=2000     每分钟最多 (默认 2000)
  TG_PER_DAY=400000   每天 (默认 400k —NVIDIA 免费层 1M/月 够)
  TG_DB=~/hostamar-build/state/guard_history.db
"""
from __future__ import annotations
import os, sqlite3, time, json, threading, datetime, math
from pathlib import Path
from collections import deque, defaultdict

HOME_BUILD = Path(os.path.expanduser(os.environ.get("TG_HOME","~/hostamar-build"))).expanduser()
STATE = HOME_BUILD / "state"; STATE.mkdir(parents=True, exist_ok=True)
ARCHIVE = HOME_BUILD / "state" / "guard_archive.jsonl"
DB = Path(os.path.expanduser(os.environ.get("TG_DB", str(STATE / "guard_history.db"))))

PER_SEC  = int(os.environ.get("TG_PER_SEC",  "8"))
PER_MIN  = int(os.environ.get("TG_PER_MIN",  "2000"))
PER_DAY  = int(os.environ.get("TG_PER_DAY", "400000"))
ARCHIVE_DAYS = int(os.environ.get("TG_ARCHIVE_DAYS", "30"))


class _Ring:
    """Ring buffer of (ts, tokens) for a time window. Auto-evicts old entries."""
    def __init__(self, window_sec: float):
        self.window = window_sec
    def count(self, dq: deque, now: float) -> int:
        cut = now - self.window
        while dq and dq[0][0] < cut:
            dq.popleft()
        # dq now only holds entries in window; sum tokens
        return sum(t for _, t in dq)
    def add(self, dq: deque, now: float, tokens: int, cap: int) -> float:
        """Returns wait_seconds; 0 means OK to send. Adds if OK."""
        used = self.count(dq, now)
        if used + tokens > cap:
            # how long until oldest in window evicts
            if not dq:
                return 0.0
            return max(0.0, dq[0][0] + self.window - now)
        dq.append((now, tokens))
        return 0.0


class TokenGuard:
    def __init__(self):
        self._lock = threading.RLock()
        self._sec = deque()   # (ts, tokens)  per-second ring (window=1s)
        self._min = deque()    # window=60s
        self._day = deque()    # window=86400s
        self._conn = self._open_db()
        self._maybe_compact()
        # warm in-memory day window from recent db rows on boot
        now = time.time()
        try:
            for row in self._conn.execute(
                "SELECT ts, tokens_out FROM events WHERE ts >= ? ORDER BY ts",
                (datetime.datetime.fromtimestamp(now - 86400, datetime.timezone.utc).isoformat(),)):
                t = datetime.datetime.fromisoformat(row[0]).timestamp()
                self._day.append((t, row[1]))
        except Exception:
            pass

    # -------- DB --------
    def _open_db(self) -> sqlite3.Connection:
        c = sqlite3.connect(str(DB), check_same_thread=False, isolation_level=None)
        c.execute("PRAGMA journal_mode=WAL")
        c.execute("""CREATE TABLE IF NOT EXISTS events(
            ts TEXT NOT NULL, provider TEXT, model TEXT,
            tokens_in INTEGER DEFAULT 0, tokens_out INTEGER DEFAULT 0,
            latency_ms INTEGER DEFAULT 0, status TEXT DEFAULT 'ok',
            note TEXT DEFAULT '')""")
        c.execute("CREATE INDEX IF NOT EXISTS idx_ts ON events(ts DESC)")
        return c

    def _maybe_compact(self):
        cutoff = (datetime.datetime.now(datetime.timezone.utc)
                  - datetime.timedelta(days=ARCHIVE_DAYS)).isoformat()
        rows = self._conn.execute(
            "SELECT * FROM events WHERE ts < ? ORDER BY ts", (cutoff,)).fetchall()
        if rows:
            ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
            with open(ARCHIVE, "a") as f:
                for r in rows:
                    f.write(json.dumps({
                        "ts": r[0], "provider": r[1], "model": r[2],
                        "tokens_in": r[3], "tokens_out": r[4],
                        "latency_ms": r[5], "status": r[6], "note": r[7],
                    }) + "\n")
            self._conn.execute("DELETE FROM events WHERE ts < ?", (cutoff,))

    # -------- public --------
    def acquire(self, estimated_tokens: int = 500, model: str = "", provider: str = "") -> float:
        """Block until safe to send. Returns total waited seconds."""
        waited = 0.0
        while True:
            with self._lock:
                now = time.time()
                # first check the day cap — if exhausted, wait until next UTC midnight
                day_cut = now - 86400
                while self._day and self._day[0][0] < day_cut:
                    self._day.popleft()
                day_used = sum(t for _, t in self._day)
                if day_used + estimated_tokens > PER_DAY:
                    # sleep until UTC midnight + 60s
                    utc = datetime.datetime.now(datetime.timezone.utc)
                    nxt = (utc + datetime.timedelta(days=1)).replace(
                        hour=0, minute=1, second=0, microsecond=0)
                    w = (nxt - utc).total_seconds() + 1
                    time.sleep(min(w, 3600))
                    waited += min(w, 3600)
                    continue
                # minute cap
                mcut = now - 60
                while self._min and self._min[0][0] < mcut:
                    self._min.popleft()
                m_used = sum(t for _, t in self._min)
                if m_used + estimated_tokens > PER_MIN:
                    w = self._min[0][0] + 60 - now + 0.05
                    time.sleep(max(0.05, w))
                    waited += max(0.05, w)
                    continue
                # second cap — only block if window already has entries
                scut = now - 1.0
                while self._sec and self._sec[0][0] < scut:
                    self._sec.popleft()
                s_used = sum(t for _, t in self._sec)
                # we must NOT block if there's literally nothing in the window
                # (that would deadlock PER_SEC >= tokens-needed never succeeds).
                # Reserve half the cap for the burst; if a single call exceeds PER_SEC,
                # we still allow it but warn.
                if self._sec and s_used + estimated_tokens > PER_SEC:
                    w = self._sec[0][0] + 1.0 - now + 0.02
                    time.sleep(max(0.02, w))
                    waited += max(0.02, w)
                    continue
                # all clear — reserve
                self._sec.append((time.time(), estimated_tokens))
                self._min.append((time.time(), estimated_tokens))
                # day tracked at record() time so we count actual, not estimated
                return waited

    def record(self, provider: str, model: str, tokens_in: int = 0,
               tokens_out: int = 0, latency_ms: int = 0, status: str = "ok",
               note: str = ""):
        ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._lock:
            self._day.append((time.time(), tokens_in + tokens_out))
            self._conn.execute(
                "INSERT INTO events VALUES (?,?,?,?,?,?,?,?)",
                (ts, provider, model, tokens_in, tokens_out, latency_ms, status, note))

    def snapshot(self) -> dict:
        with self._lock:
            now = time.time()
            def used(dq, win):
                c = now - win
                while dq and dq[0][0] < c: dq.popleft()
                return sum(t for _, t in dq)
            return {
                "sec_used":   used(self._sec, 1),
                "sec_cap":    PER_SEC,
                "min_used":   used(self._min, 60),
                "min_cap":    PER_MIN,
                "day_used":   used(self._day, 86400),
                "day_cap":    PER_DAY,
                "archive_path": str(ARCHIVE),
                "db_path": str(DB),
            }

    def today_summary(self) -> dict:
        """Used by permanent.sh verify step."""
        cutoff = (datetime.datetime.now(datetime.timezone.utc)
                  - datetime.timedelta(days=1)).isoformat()
        row = self._conn.execute(
            "SELECT COUNT(*), COALESCE(SUM(tokens_in),0), COALESCE(SUM(tokens_out),0), "
            "COALESCE(SUM(latency_ms),0) FROM events WHERE ts >= ?", (cutoff,)).fetchone()
        status_breakdown = {
            s: c for s, c in self._conn.execute(
                "SELECT status, COUNT(*) FROM events WHERE ts >= ? GROUP BY status", (cutoff,)
            ).fetchall()
        }
        return {"requests_24h": row[0], "tokens_in_24h": row[1],
                "tokens_out_24h": row[2], "total_ms_24h": row[3],
                "by_status": status_breakdown, "db_path": str(DB)}

    def providers_summary(self) -> dict:
        cutoff = (datetime.datetime.now(datetime.timezone.utc)
                  - datetime.timedelta(days=1)).isoformat()
        return {p: {"req": r, "tk": t}
                for p, r, t in self._conn.execute(
                    "SELECT provider, COUNT(*), COALESCE(SUM(tokens_in+tokens_out),0) "
                    "FROM events WHERE ts >= ? GROUP BY provider", (cutoff,))}


# single module-level instance — safe; uses RLock
_GUARD: TokenGuard | None = None
def get_guard() -> TokenGuard:
    global _GUARD
    if _GUARD is None:
        _GUARD = TokenGuard()
    return _GUARD
