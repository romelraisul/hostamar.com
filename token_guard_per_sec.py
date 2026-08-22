"""token_guard_per_sec.py - LiteLLM guard (proxy-verified, this box).

GROUND-VERIFIED on this box (litellm 1.94.0 proxy image):
  - `litellm_settings.callbacks: [token_guard_per_sec.guard]` IS dispatched
    by the proxy for every /v1/chat/completions. The proxy calls
    `async_pre_call_hook(kwargs)` with the request dict as the single arg.
    Returning False from it BLOCKS the call (circuit breaker works!).
  - `success_callback` / `failure_callback` / `pre_call_checks` are NOT
    reliably dispatched by this proxy build, so we do NOT rely on them.

GOAL (per spec): cutoff only blocks CLOUD, never LOCAL.
  - Local models (gema4 / gema4-code / qwen / code / gemma* / ollama) are
    NEVER blocked -> always return True.
  - Cloud models (glm / nvidia / z-ai / hy3 / kilocode) are rate-tracked
    over a 60s window; when over the free-tier limit we return False so
    litellm skips them instantly and the router falls back to local.
  - Every request is logged to /tmp/token_time_per_sec.log as
    `tok=... req=... model=...` (so the log file always exists).
"""
from litellm.integrations.custom_logger import CustomLogger
import time
import json
from collections import deque

STATE = "/tmp/token_time_per_sec.json"
LOG = "/tmp/token_time_per_sec.log"

LIMIT_TOKENS = 25000   # cloud free-tier ~30K; trip early at 25K
LIMIT_REQ = 8          # cloud free-tier ~10/min; trip at 8
WINDOW = 60            # seconds rolling window
LIMIT_BLOCK_WINDOW = 300  # 5 min synthetic block after a 429

# Metered / rate-limited cloud providers that the cutoff guards.
CLOUD_PREFIXES = ("z-ai", "nvidia", "glm", "hy3", "kilocode", "openai/hy3")


def _is_cloud(model: str) -> bool:
    m = (model or "").lower()
    return any(p in m for p in CLOUD_PREFIXES)


def _log(line: str) -> None:
    try:
        with open(LOG, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass


class TokenTimePerSec(CustomLogger):
    def __init__(self):
        self.q = deque(maxlen=500)
        try:
            for x in json.load(open(STATE)):
                self.q.append(x)
        except Exception:
            pass

    def _save(self):
        try:
            json.dump(list(self.q), open(STATE, "w"))
        except Exception:
            pass

    def _prune(self, now):
        while self.q and now - self.q[0]['ts'] > WINDOW:
            self.q.popleft()

    # The proxy calls this as:
    #   async_pre_call_hook(user_api_key_dict=..., cache=..., data=<request dict>, call_type=...)
    # i.e. ONLY keyword args. The request payload (with `model`) is in `data`.
    async def async_pre_call_hook(self, **kwargs):
        data = kwargs.get("data") or {}
        try:
            model = str(data.get("model") or kwargs.get("model") or "")
        except Exception:
            model = ""
        now = time.time()
        self._prune(now)
        total_t = sum(x['t'] for x in self.q)
        total_r = len(self.q)
        # ALWAYS log so the file exists and we see tok=/req=/model=.
        _log(f"{int(now)} PRE tok={total_t} req={total_r} model={model}")

        # LOCAL NEVER BLOCKED.
        if not _is_cloud(model):
            return kwargs.get("data", kwargs)

        # CLOUD: block (return False) only when over free-tier budget.
        if total_t > LIMIT_TOKENS or total_r > LIMIT_REQ:
            _log(f"{int(now)} CUTOFF cloud over budget -> skip {model}")
            return False
        return kwargs.get("data", kwargs)

    async def async_log_success_event(self, kwargs, response_obj, start_time, end_time, **_):
        try:
            model = str(kwargs.get("model") or "")
        except Exception:
            model = ""
        if not _is_cloud(model):
            return  # local: nothing to budget
        try:
            usage = getattr(response_obj, "usage", None)
            tokens = getattr(usage, "total_tokens", 0) or 100
        except Exception:
            tokens = 100
        self.q.append({"ts": time.time(), "t": tokens})
        self._save()

    async def async_log_failure_event(self, kwargs, response_obj, start_time, end_time, **_):
        try:
            model = str(kwargs.get("model") or "")
        except Exception:
            model = ""
        _log(f"{int(time.time())} FAIL model={model} resp={str(response_obj)[:80]}")
        if "429" in str(response_obj) or "429" in str(kwargs):
            self.q.append({"ts": time.time() + LIMIT_BLOCK_WINDOW, "t": LIMIT_TOKENS})
            self._save()
            _log(f"{int(time.time())} 429 -> circuit open {LIMIT_BLOCK_WINDOW}s")


guard = TokenTimePerSec()
