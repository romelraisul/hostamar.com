"""
GuardCallback — LiteLLM custom callback.

Hooks into LiteLLM's "success" / "failure" events and writes a row to the
token guard's SQLite history. Also pre-checks the per-second / per-minute /
per-day caps BEFORE a request is dispatched (using the request_token_count
estimate); if the daily cap is exhausted the callback RAISES so LiteLLM
falls back to the next entry in router_settings.fallbacks (local Ollama).

This is the bridge between litellm-config.final.yaml.hostamar_guard and
the durable token guard at ~/hostamar-build/guard/token_guard_per_sec.py.
"""
from __future__ import annotations
import os, sys, time, threading
from datetime import datetime, timezone
from pathlib import Path

# Make the guard importable whether invoked from host .venv or container.
_BUILD = Path(os.path.expanduser(os.environ.get("TG_HOME", "/home/romel/hostamar-build")))
if str(_BUILD / "guard") not in sys.path:
    sys.path.insert(0, str(_BUILD / "guard"))
try:
    from token_guard_per_sec import TokenGuard, PER_SEC, PER_MIN, PER_DAY
    _GUARD = TokenGuard()
except Exception as e:
    print(f"[guard_callback] WARNING: could not init guard: {e}", file=sys.stderr)
    _GUARD = None

PROVIDER_HINTS = {
    "integrate.api.nvidia.com": "nvidia",
    "kilo.ai": "kilocode",
    "ollama": "ollama",
}
def _provider_for(opts) -> str:
    api_base = (opts or {}).get("api_base", "")
    for k, v in PROVIDER_HINTS.items():
        if k in api_base: return v
    return "unknown"


class GuardCallback:
    """Sync class — LiteLLM accepts either a class or standalone functions."""

    async def async_pre_call_hook(self, user_api_key_dict, cache_data, data, call_type):
        if _GUARD is None: return
        # estimate prompt tokens from raw input if present
        est = 0
        try:
            msgs = data.get("messages") or []
            for m in msgs:
                c = m.get("content")
                if isinstance(c, str): est += len(c) // 4
                elif isinstance(c, list):
                    for p in c:
                        if isinstance(p, dict) and "text" in p:
                            est += len(p["text"]) // 4
        except Exception: pass
        if est == 0: est = 32   # minimal default
        if est > PER_DAY:    # a single call would burn the daily budget
            raise RuntimeError(
                f"guard: estimated {est} exceeds per_day cap {PER_DAY}; declining")
        waited = _GUARD.acquire(estimated_tokens=est)
        if waited:
            # logged for ops visibility
            print(f"[guard_callback] throttled {waited:.2f}s to stay under cap", file=sys.stderr)

    async def async_log_success_event(self, kwargs, response_obj, start_time):
        if _GUARD is None: return
        try:
            opts = kwargs.get("litellm_params", {}) or {}
            provider = _provider_for(opts)
            model = kwargs.get("model", "") or opts.get("model", "")
            in_t  = int(getattr(response_obj, "usage", {}).get("prompt_tokens", 0) or 0)
            out_t = int(getattr(response_obj, "usage", {}).get("completion_tokens", 0) or 0)
            ms = int((time.time() - start_time.timestamp()) * 1000) if hasattr(start_time, "timestamp") else 0
            _GUARD.record(provider, model, in_t, out_t, ms, "ok", note="success")
        except Exception as e:
            print(f"[guard_callback] record-success failed: {e}", file=sys.stderr)

    async def async_log_failure_event(self, kwargs, response_obj, start_time):
        if _GUARD is None: return
        try:
            opts = kwargs.get("litellm_params", {}) or {}
            provider = _provider_for(opts)
            model = kwargs.get("model", "") or opts.get("model", "")
            status = "429" if getattr(response_obj, "status_code", None) == 429 else "error"
            _GUARD.record(provider, model, 0, 0, 0, status, note=str(getattr(response_obj, "message", ""))[:140])
        except Exception as e:
            print(f"[guard_callback] record-failure failed: {e}", file=sys.stderr)


# LiteLLM also accepts module-level instance if present
guard_callback = GuardCallback()

# Self-register with litellm's callback list so the proxy picks it up
# regardless of the `callbacks:` config resolution quirk.
try:
    import litellm
    if guard_callback not in litellm.callbacks:
        litellm.callbacks.append(guard_callback)
    print("[guard_callback] registered with litellm.callbacks", file=sys.stderr)
except Exception as e:
    print(f"[guard_callback] could not auto-register (litellm import unavailable in this context): {e}", file=sys.stderr)


