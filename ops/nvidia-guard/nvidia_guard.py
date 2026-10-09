#!/usr/bin/env python3
"""NVIDIA-only liveness guard + key rotator (Hermes ``nvidia-direct`` egress).

Hard guarantees
---------------
* NVIDIA-only: the upstream host is a constant (``integrate.api.nvidia.com``); the
  model allow-list is the four NVIDIA models; no other provider/host/IP is ever
  referenced. DNS is resolved per request, so an upstream IP change cannot break it.
* Model-liveness gate: a model is served only after a probe confirms it actually
  answers. A dead/absent model is refused fast (HTTP 503, ``type=model_not_live``)
  so the caller falls back immediately instead of blocking on a hang.
* Key rotation: both Infisical NVIDIA keys are used; 401/402/429/timeout rotates to
  the next key. Keys are read from the env file on every request, so a rotated key
  is picked up without a restart.
* Loopback-only listener; the request body is forwarded unchanged (same model).

Nothing here writes secrets anywhere. No IP is ever hardcoded.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
import random
import signal
import sys
import time
from pathlib import Path

import aiohttp
from aiohttp import web

# --------------------------------------------------------------------------- config
LISTEN_HOST = os.environ.get("NVG_LISTEN_HOST", "127.0.0.1")
LISTEN_PORT = int(os.environ.get("NVG_LISTEN_PORT", "12436"))
UPSTREAM = os.environ.get("NVG_UPSTREAM", "https://integrate.api.nvidia.com").rstrip("/")
MODELS = [m.strip() for m in os.environ.get(
    "NVG_MODELS",
    "z-ai/glm-5.3-flash,z-ai/glm-5.3,moonshotai/kimi-k3,deepseek-ai/deepseek-v4.1-flash",
).split(",") if m.strip()]
KEY_ENV_NAMES = [n.strip() for n in os.environ.get(
    "NVG_KEY_ENVS", "NVIDIA_API_KEY,NVIDIA_API_KEY_BACKUP,NVIDIA_API_KEY_2",
).split(",") if n.strip()]
ENV_FILE = Path(os.environ.get("NVG_ENV_FILE", str(Path.home() / ".hermes" / ".env")))
STATE_FILE = Path(os.environ.get("NVG_STATE", str(Path.home() / ".hermes" / "nvidia-guard" / "state.json")))
PROBE_TIMEOUT = float(os.environ.get("NVG_PROBE_TIMEOUT", "12"))
PROBE_TTL = float(os.environ.get("NVG_PROBE_TTL", "180"))
# Authoritative "model not present" is cached longer; a mere timeout is a
# short-lived hint so a healthy model recovers quickly and never false-fails.
DEAD_TTL = float(os.environ.get("NVG_DEAD_TTL", "600"))
UNRESPONSIVE_TTL = float(os.environ.get("NVG_UNRESPONSIVE_TTL", "240"))
# Reasoning models emit hidden reasoning tokens before any content; a small
# client max_tokens yields finish_reason=length with content:null. Floor the
# ceiling on the substituted body only (we never rewrite a body we forward as-is).
REASONING_MODELS = {m.strip() for m in os.environ.get(
    "NVG_REASONING_MODELS",
    "z-ai/glm-5.3-flash,z-ai/glm-5.3,moonshotai/kimi-k3,deepseek-ai/deepseek-v4.1-flash",
).split(",") if m.strip()}
REASONING_MIN_TOKENS = int(os.environ.get("NVG_REASONING_MIN_TOKENS", "800"))
PROBE_MAXTOKENS = int(os.environ.get("NVG_PROBE_MAXTOKENS", "8"))
PROBE_PROMPT = os.environ.get("NVG_PROBE_PROMPT", "ping")
UPSTREAM_TIMEOUT = float(os.environ.get("NVG_UPSTREAM_TIMEOUT", "120"))
KEY_ROTATIONS = max(1, int(os.environ.get("NVG_KEY_ROTATIONS", "4")))
MAX_CONCURRENCY = max(1, int(os.environ.get("NVG_MAX_CONCURRENCY", "4")))
# --- anti-stampede budget (the RST-storm fix) --------------------------------
# NVIDIA's free tier for this account tolerates roughly two concurrent calls;
# past that it answers 429 or simply hangs the socket. The old code answered a
# hiccup by retrying 3x per key x 2 keys x 4 candidate models, so ONE client
# call could become 24 upstream calls over ~24 minutes - i.e. the guard itself
# stampeded the account that was already saying "stop". Every upstream attempt
# is now charged to a per-request budget, and the attempt timeout is bounded so
# a hung socket costs 30s, not 60s (or 120s, as the upstream really behaves).
MAX_ATTEMPTS = max(1, int(os.environ.get("NVG_MAX_ATTEMPTS", "4")))     # upstream calls per client request
REQUEST_BUDGET = float(os.environ.get("NVG_REQUEST_BUDGET", "45"))      # wall-clock cap per client request
ATTEMPT_TIMEOUT = float(os.environ.get("NVG_ATTEMPT_TIMEOUT", "30"))    # per-attempt cap

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("nvidia-guard")

_SESSION: aiohttp.ClientSession | None = None
_PROBE_TASK: asyncio.Task | None = None
_SEM: asyncio.Semaphore | None = None  # caps concurrent upstream calls (anti-stampede)

# --------------------------------------------------------------------------- helpers
_env_cache: dict = {"mtime": None, "map": {}}


def read_env_file() -> dict:
    """Parse ENV_FILE (KEY=value, quote-tolerant), cached by mtime. Never raises."""
    try:
        st = ENV_FILE.stat()
    except OSError:
        return {}
    if st.st_mtime == _env_cache["mtime"]:
        return _env_cache["map"]
    m: dict = {}
    try:
        with open(ENV_FILE, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                m[k.strip()] = v.strip().strip('"').strip("'")
    except OSError:
        return _env_cache["map"] or {}
    _env_cache["mtime"] = st.st_mtime
    _env_cache["map"] = m
    return m


def current_keys() -> list[str]:
    """Live NVIDIA keys, env-file first then process env. Deduped, order-stable."""
    envmap = read_env_file()
    keys: list[str] = []
    for name in KEY_ENV_NAMES:
        for src in (envmap.get(name), os.environ.get(name)):
            v = (src or "").strip()
            if v and v.startswith("nvapi-") and v not in keys:
                keys.append(v)
    return keys


# model -> {"state": "live"|"dead", "ts": float, "latency": float, "detail": str}
_live_cache: dict = {}


def cache_get(model: str):
    e = _live_cache.get(model)
    if not e:
        return None
    state = e["state"]
    ttl = DEAD_TTL if state == "dead" else (UNRESPONSIVE_TTL if state == "unresponsive" else PROBE_TTL)
    if (time.time() - e["ts"]) < ttl:
        return e
    return None


def cache_set(model: str, state: str, latency: float, detail: str):
    _live_cache[model] = {"state": state, "ts": time.time(), "latency": latency, "detail": detail[:200]}


def _classify(status: int, text: str) -> str:
    """live | dead | inconclusive for a probe response."""
    low = (text or "").lower()
    if status == 200:
        return "live"
    if status == 404:
        return "dead"
    if status == 400 and any(s in low for s in ("not found", "does not exist", "invalid model", "unknown model", "function '", "not found for account")):
        return "dead"
    if status in (401, 402, 403, 429, 408, 425):
        return "inconclusive"  # key/quota problem, not model liveness
    if 500 <= status < 600:
        return "inconclusive"
    return "inconclusive"


async def probe_model(model: str, key: str) -> tuple[str, float, str]:
    """One tiny completion against NVIDIA. Returns (state, latency_s, detail)."""
    assert _SESSION is not None
    body = {
        "model": model,
        "messages": [{"role": "user", "content": PROBE_PROMPT}],
        "max_tokens": PROBE_MAXTOKENS,
        "stream": False,
    }
    t0 = time.monotonic()
    try:
        async with _SESSION.post(
            f"{UPSTREAM}/v1/chat/completions",
            json=body,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            timeout=aiohttp.ClientTimeout(total=PROBE_TIMEOUT),
        ) as r:
            dt = time.monotonic() - t0
            text = (await r.text())[:300].replace("\n", " ")
            state = _classify(r.status, text)
            return state, dt, f"{r.status} {text[:140]}"
    except (asyncio.TimeoutError, aiohttp.ServerTimeoutError):
        # No response in time: a short-lived "unresponsive" hint, NOT proof of death.
        return "unresponsive", time.monotonic() - t0, f"probe timeout >{PROBE_TIMEOUT}s"
    except Exception as exc:  # noqa: BLE001 - transient network blip is NOT 'dead'
        return "inconclusive", time.monotonic() - t0, f"{type(exc).__name__}: {exc}"


async def probe_with_rotation(model: str) -> tuple[str, float, str]:
    """Probe a model across all keys.

    Definitive answers win immediately: ``live`` (2xx) and ``dead`` (only an
    authoritative model-not-found reply). A transient failure on every key is
    NEVER reported as dead:
      * quota/auth/5xx on every key -> ``inconclusive`` (treated as live)
      * timeout on every key        -> ``unresponsive`` (short-lived fast-fail,
                                       recovers by itself; not a death verdict)
    """
    keys = current_keys()
    if not keys:
        return "inconclusive", 0.0, "no key available"
    saw_unresponsive = None
    saw_inconclusive = None
    for key in keys:
        state, dt, detail = await probe_model(model, key)
        if state in ("live", "dead"):
            return state, dt, detail
        if state == "unresponsive":
            saw_unresponsive = (state, dt, detail)
        else:
            saw_inconclusive = (state, dt, detail)
    if saw_inconclusive:
        return saw_inconclusive
    if saw_unresponsive:
        return saw_unresponsive
    return "inconclusive", 0.0, "no decisive probe"


async def ensure_live(model: str) -> dict:
    """Return the cached/probed liveness entry for a model."""
    if model not in MODELS:
        return {"state": "live", "ts": time.time(), "latency": 0.0, "detail": "not-gated"}
    ent = cache_get(model)
    if ent is not None:
        return ent
    state, dt, detail = await probe_with_rotation(model)
    if state == "inconclusive":
        state = "live"  # never refuse on quota/transient ambiguity
    cache_set(model, state, dt, detail)
    return _live_cache[model]


# --------------------------------------------------------------------------- proxy
def _retryable(status: int) -> bool:
    return status in (401, 402, 403, 408, 429, 500, 502, 503, 504)


async def _forward_bytes(body_raw: bytes, key: str, want_stream: bool, request: web.Request,
                         timeout: float | None = None):
    """Forward raw bytes; return (status, headers, response_or_streamresponse) or raise."""
    assert _SESSION is not None
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": request.headers.get("Content-Type", "application/json"),
        "Accept": request.headers.get("Accept", "application/json"),
    }
    cm = _SESSION.post(
        f"{UPSTREAM}{request.rel_url}",
        data=body_raw,
        headers=headers,
        timeout=aiohttp.ClientTimeout(total=(timeout or UPSTREAM_TIMEOUT), sock_connect=15),
    )
    r = await cm.__aenter__()
    if r.status == 200 and want_stream:
        resp = web.StreamResponse(status=200)
        resp.headers["Content-Type"] = r.headers.get("Content-Type", "text/event-stream")
        resp.headers["Cache-Control"] = "no-cache"
        await resp.prepare(request)
        # A prepared stream is irrevocable: the client already has 200 + headers, so
        # we can neither retry nor switch candidate. End the stream cleanly instead
        # of bubbling up as an "upstream transport" failure - that used to set
        # account_fail and make the shed path write a SECOND response onto a live
        # stream, which is where the misleading "429 <partial-generation-bytes>" and
        # "Cannot write to closing transport" access-log lines came from (a client
        # that gave up on a long generation is not an upstream fault, and it must
        # never push other callers into a shed).
        try:
            async for chunk in r.content.iter_any():
                if not chunk:
                    continue
                try:
                    await resp.write(chunk)
                except (ConnectionResetError, ConnectionAbortedError, RuntimeError):
                    log.info("stream: client went away, ending stream cleanly")
                    break
        except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
            log.info("stream: upstream ended early (%s), closing", type(exc).__name__)
        finally:
            with contextlib.suppress(Exception):
                await resp.write_eof()
            with contextlib.suppress(Exception):
                await cm.__aexit__(None, None, None)
        return "streamed", None, resp
    data = await r.read()
    ctype = r.headers.get("Content-Type", "application/json").split(";")[0]
    status = r.status
    await cm.__aexit__(None, None, None)
    return status, ctype, data


_key_cool: dict = {}
KEY_COOLDOWN = float(os.environ.get("NVG_KEY_COOLDOWN", "20"))


def ordered_keys() -> list:
    """Keys in order, but a key that recently 429'd is deprioritised."""
    now = time.time()
    ks = current_keys()
    ks.sort(key=lambda k: 1 if _key_cool.get(k, 0.0) > now else 0)
    return ks


def _cool_key(key: str):
    if key:
        _key_cool[key] = time.time() + KEY_COOLDOWN


def _cache_state(model: str) -> str:
    e = cache_get(model)
    return e["state"] if e else "unknown"


def _rank(state: str) -> int:
    return {"live": 0, "unknown": 1, "unresponsive": 2, "dead": 3}.get(state, 1)


def order_candidates(requested: str):
    """Return an ordered [(model, is_substitution)] list for a request.

    The requested model is tried first *unless* the cache already knows it is
    unavailable; then a live sibling from the same NVIDIA set is used instead.
    This is what makes a "not live" error impossible for the caller: the guard
    degrades to another of the four models rather than refusing the request.
    """
    if requested not in MODELS:
        return [(requested, False)]
    others = [m for m in MODELS if m != requested]
    others.sort(key=lambda m: _rank(_cache_state(m)))
    out = []
    if _cache_state(requested) == "live":
        # Requested model is confirmed live: it goes first (no pointless swap).
        out.append((requested, False))
        for m in others:
            if _cache_state(m) == "live":
                out.append((m, True))
    else:
        # Requested model is unknown/unavailable: prefer already-live siblings so
        # we NEVER block on a model we have no reason to trust. The requested
        # model is kept as a last resort (attempted only if all siblings fail).
        for m in others:
            if _cache_state(m) == "live":
                out.append((m, True))
        for m in others:
            if _cache_state(m) == "unknown" and (m, True) not in out:
                out.append((m, True))
        out.append((requested, False))
    # If nothing at all is known, still attempt in a sane order.
    if not out:
        out.append((requested, False))
        out.extend((m, True) for m in others)
    return out[:4]


def _rebuild_body(raw: bytes, model: str) -> bytes:
    try:
        b = json.loads(raw or b"{}")
        b["model"] = model
        if model in REASONING_MODELS:
            mt = b.get("max_tokens", b.get("max_completion_tokens"))
            if isinstance(mt, int) and 0 < mt < REASONING_MIN_TOKENS:
                key = "max_tokens" if "max_tokens" in b else "max_completion_tokens"
                b[key] = REASONING_MIN_TOKENS
        return json.dumps(b).encode()
    except Exception:  # noqa: BLE001
        return raw


async def _forward_once(fwd_raw: bytes, key: str, want_stream: bool, request: web.Request,
                        timeout: float, cand: str, budget: dict):
    """One upstream attempt, charged to the per-request budget.

    Returns ``(kind, payload)`` with kind ``ok`` | ``transport`` | ``budget``.
    ``transport`` means the socket/edge itself failed (RST, reset, reset-mid-write
    "Cannot write to closing transport", timeout) - an account/network-level
    condition: another key or a sibling model cannot help, so the caller sheds
    instead of stampeding. One fresh-socket retry only; never a per-key x
    per-model explosion.
    """
    transport_errors = (
        aiohttp.ClientConnectionError, aiohttp.ServerConnectionError,
        aiohttp.ServerDisconnectedError, asyncio.TimeoutError,
        aiohttp.ServerTimeoutError, ConnectionResetError, ConnectionError, OSError,
    )
    for tt in range(2):
        rem = budget["deadline"] - time.monotonic()
        if budget["n"] <= 0 or rem <= 0:
            return "budget", None
        budget["n"] -= 1
        try:
            if _SEM is not None:
                # The queue wait is part of the request's budget: a client must not
                # sit behind a saturated semaphore past its deadline (that was how a
                # burst turned into 90s+ waits and client-side timeouts).
                await asyncio.wait_for(_SEM.acquire(), timeout=rem)
                try:
                    return "ok", await _forward_bytes(fwd_raw, key, want_stream, request, timeout)
                finally:
                    _SEM.release()
            return "ok", await _forward_bytes(fwd_raw, key, want_stream, request, timeout)
        except transport_errors as exc:
            # str() is EMPTY for an asyncio timeout - log the type and repr, or
            # the log shows a bare "transport ... try#1/3: " with no cause.
            log.warning("transport %s try#%d: %s: %r", cand, tt + 1, type(exc).__name__, exc)
            if tt == 0:
                await asyncio.sleep(0.25 + random.random() * 0.25)  # small jittered backoff
                continue
            return "transport", None
        except Exception as exc:  # noqa: BLE001
            log.warning("forward error %s try#%d: %s: %r", cand, tt + 1, type(exc).__name__, exc)
            return "transport", None
    return "transport", None


async def handle_chat(request: web.Request) -> web.StreamResponse:
    raw = await request.read()
    try:
        body = json.loads(raw or b"{}")
    except Exception:  # noqa: BLE001
        body = {}
    requested = str((body or {}).get("model") or "")
    want_stream = bool((body or {}).get("stream"))

    if requested not in MODELS:
        return web.json_response(
            {"error": {"message": f"model {requested!r} is not served by this guard; "
                                  f"allowed: {', '.join(MODELS)}",
                       "type": "model_not_allowed"}}, status=404)

    keys = current_keys()
    if not keys:
        return web.json_response(
            {"error": {"message": "no NVIDIA key available", "type": "no_key"}}, status=503)

    candidates = order_candidates(requested)
    okeys = ordered_keys() or keys
    budget = {"n": MAX_ATTEMPTS, "deadline": time.monotonic() + REQUEST_BUDGET}
    last = ("none", 0)
    account_fail = False  # transport/quota trouble: an account-level, not model-level, condition
    for cand, subst in candidates:
        # Siblings share the same account and the same edge: once the transport or
        # the rate limit has spoken, walking the other models only multiplies load.
        if account_fail or budget["n"] <= 0 or time.monotonic() > budget["deadline"]:
            break
        fwd_raw = _rebuild_body(raw, cand) if subst else raw
        cand_timeout = min(UPSTREAM_TIMEOUT, ATTEMPT_TIMEOUT)  # bound worst-case latency per attempt
        saw_key_issue = False
        hard_fail = False
        n_keys = max(1, len(okeys))
        for attempt in range(n_keys):
            key = okeys[attempt % n_keys]
            kind, result = await _forward_once(fwd_raw, key, want_stream, request,
                                               cand_timeout, cand, budget)
            if kind != "ok":
                account_fail = True  # RST/timeout/budget exhausted -> shed, don't stampede
                break
            status, ctype, payload = result
            if status == "streamed":
                if cand in MODELS:
                    cache_set(cand, "live", 0.0, "served")
                return payload
            if status == 200:
                if cand in MODELS:
                    cache_set(cand, "live", 0.0, "served")
                resp = web.Response(body=payload, status=200, content_type=ctype)
                resp.headers["x-nvg-model"] = cand
                if subst:
                    resp.headers["x-nvg-substituted-from"] = requested
                    log.info("substitute: %s -> %s (served)", requested, cand)
                return resp
            last = (ctype, status)
            if status in (401, 402, 403):
                saw_key_issue = True
                _cool_key(key)
                log.info("rotate: %s key -> %s (key issue)", cand, status)
                continue  # a genuine key problem: the other key may still work
            if status == 429:
                # Both keys are on the SAME NVIDIA account, so the rate limit is
                # shared: rotating to the other key cannot help and just adds load.
                # Honour the throttle and shed with Retry-After.
                saw_key_issue = True
                _cool_key(key)
                account_fail = True
                log.info("throttled: %s -> 429 (account rate limit, not a key fault)", cand)
                break
            hard_fail = True  # model-side (5xx, 400, ...) -> a sibling may serve it
            break
        # Only mark a candidate bad for a *model-side* failure; transport/key-quota
        # problems must never label a healthy model as unavailable.
        if cand in MODELS and hard_fail and not saw_key_issue:
            cache_set(cand, "unresponsive", 0.0, f"failed {last}")
    # Transport/RST or quota exhaustion = account-level backpressure, NOT model
    # health. Do NOT mark any model unavailable (that would wrongly deprioritise a
    # perfectly healthy model). Shed load with a fast 429 + Retry-After so callers
    # back off instead of stampeding.
    if last[1] == 0 or last[1] == 429:
        resp = web.json_response(
            {"error": {"message": "nvidia guard saturated (quota/transport); retry shortly",
                       "type": "retry_later"}}, status=429)
        resp.headers["Retry-After"] = "5"
        return resp
    st = last[1] if isinstance(last[1], int) and last[1] in (401, 402, 403) else 503
    return web.json_response(
        {"error": {"message": f"nvidia upstream failed for all models ({last})",
                   "type": "upstream_failed"}}, status=st)


async def handle_generic(request: web.Request) -> web.StreamResponse:
    raw = await request.read()
    # Ollama / llama.cpp / litellm discovery probes. The upstream never serves
    # these, so forwarding them buys nothing but burns a slot on an account that
    # only tolerates ~2 concurrent calls (litellm health probing was ~2/min).
    if request.path in ("/props", "/v1/props", "/api/tags", "/api/v1/models",
                        "/api/ps", "/api/show", "/version", "/api/version"):
        return web.json_response(
            {"error": {"message": f"{request.path} is not served by this guard",
                       "type": "not_found"}}, status=404)
    keys = current_keys()
    if not keys:
        return web.json_response({"error": {"message": "no NVIDIA key available", "type": "no_key"}}, status=503)
    try:
        want_stream = bool(json.loads(raw or b"{}").get("stream"))
    except Exception:  # noqa: BLE001
        want_stream = False
    last = ("none", 0)
    for attempt in range(KEY_ROTATIONS):
        key = keys[attempt % len(keys)]
        try:
            status, ctype, payload = await _forward_bytes(raw, key, want_stream, request)
            if status == "streamed":
                return payload
            if status == 200:
                return web.Response(body=payload, status=200, content_type=ctype)
            last = (ctype, status)
            if _retryable(status):
                continue
            return web.Response(body=payload, status=status, content_type=ctype)
        except Exception as exc:  # noqa: BLE001
            last = (type(exc).__name__, 0)
            continue
    return web.json_response({"error": {"message": f"nvidia upstream failed: {last}"}}, status=503)


async def handle_models(request: web.Request) -> web.StreamResponse:
    # Advertise ONLY the four allow-listed NVIDIA models. Never proxy the full
    # upstream catalog: consumers that enumerate /v1/models must not be able to
    # discover (and then batch-verify) hundreds of non-allow-listed models, which
    # is what hammered NVIDIA and caused the recurring "not live"/reset cascade.
    now = int(time.time())
    return web.json_response({
        "object": "list",
        "data": [{"id": m, "object": "model", "created": now, "owned_by": "nvidia"}
                 for m in MODELS],
    })


async def handle_health(request: web.Request) -> web.StreamResponse:
    return web.json_response({
        "status": "ok",
        "upstream": UPSTREAM,
        "models": MODELS,
        "keys": len(current_keys()),
        "live_cache": {m: {"state": v["state"], "age": round(time.time() - v["ts"], 1)}
                       for m, v in _live_cache.items()},
    })


# --------------------------------------------------------------------------- lifecycle
async def probe_loop():
    while True:
        try:
            if current_keys():
                # Sequential on purpose: four concurrent probes against an account
                # that only tolerates ~2 concurrent calls is itself the burst that
                # makes the upstream answer real traffic with 429/hang. One probe
                # in flight, and it never runs through the forward semaphore.
                for m in MODELS:
                    await _probe_one(m)
        except Exception as exc:  # noqa: BLE001
            log.warning("probe loop error: %s", exc)
        await asyncio.sleep(PROBE_TTL)


async def _probe_one(model: str):
    state, dt, detail = await probe_with_rotation(model)
    if state == "inconclusive":
        state = "live"
    cache_set(model, state, dt, detail)
    log.info("probe %s -> %s (%.2fs) %s", model, state.upper(), dt, detail)


async def on_startup(app: web.Application):
    global _SESSION, _PROBE_TASK
    # force_close=True: never reuse a pooled keep-alive connection. NVIDIA silently
    # closes idle sockets, and reusing one raises "Cannot write to closing transport",
    # which used to cascade into a false "all models down" 503 storm. A fresh socket
    # per request removes that class of failure entirely.
    global _SEM  # noqa: PLW0603
    connector = aiohttp.TCPConnector(force_close=True, limit=256, enable_cleanup_closed=True)
    _SESSION = aiohttp.ClientSession(connector=connector)
    _SEM = asyncio.Semaphore(MAX_CONCURRENCY)
    log.info("NVIDIA guard up on http://%s:%d -> %s", LISTEN_HOST, LISTEN_PORT, UPSTREAM)
    log.info("models=%s keys=%d", MODELS, len(current_keys()))
    _PROBE_TASK = asyncio.create_task(probe_loop())


async def on_cleanup(app: web.Application):
    global _SESSION, _PROBE_TASK
    if _PROBE_TASK:
        _PROBE_TASK.cancel()
        try:
            await _PROBE_TASK
        except (asyncio.CancelledError, Exception):  # noqa: BLE001
            pass
    if _SESSION:
        await _SESSION.close()


def build_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/health", handle_health)
    app.router.add_get("/nvg/status", handle_health)
    app.router.add_get("/v1/models", handle_models)
    app.router.add_post("/v1/chat/completions", handle_chat)
    app.router.add_route("*", "/{tail:.*}", handle_generic)
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    return app


def main():
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    app = build_app()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    def _stop():
        log.info("shutdown signal received")
        loop.call_soon_threadsafe(loop.stop)

    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, _stop)
        except NotImplementedError:
            pass
    web.run_app(app, host=LISTEN_HOST, port=LISTEN_PORT, handle_signals=False, print=None)


if __name__ == "__main__":
    main()
