# NVIDIA guard — permanent fix for the "Cannot write to closing transport" RST storm

Box: DESKTOP-9KA03CQ (Ubuntu 26.04/WSL2, RTX 5060). Date: 2026-10-10.
Guard: `/home/romel/.hermes/nvidia-guard/nvidia_guard.py` (systemd user unit, port 12436).
Source of truth in this repo: `ops/nvidia-guard/`.

## Symptom

Every few hours the NVIDIA path collapsed:

```
transport ... try#1/3:
ClientConnectionResetError / Cannot write to closing transport / ServerDisconnectedError
```

followed by "model X is not live" for healthy models, `503` storms, and clients
(`kimi-k3` in particular) hanging to `http=000` after 120s.

## Root cause (measured, not inferred)

The upstream free tier for this account **tolerates only a couple of concurrent
calls**. Past that it answers `429` or simply leaves the socket hanging. Two
experiments pinned it down:

| Experiment | Result |
|---|---|
| Serial, 1 key, direct to NVIDIA, 8 calls | 8/8 `200`; latency climbing 1.6s -> 27.6s (queueing) |
| **10 concurrent, 1 key, direct** | **6x `429` within ~1s, 2x `200`, 2x hung the full 120s** |
| 30 concurrent via the patched guard | 27x `200`, 3x `429`, 0 transport errors, max 27.0s |

So the transport error was not stale keep-alive reuse (`force_close=True` was
already set and it still happened) and not an aiohttp bug (`ClientConnectionResetError`
is raised when the peer resets a connection **we are writing to** - which is what a
rate-limited edge does).

The guard itself was the amplifier. One client request could turn into:

```
3 retries  x  2 keys  x  up to 4 candidate models  =  24 upstream calls, ~24 minutes
```

and the guard retried at exactly the moment the account was saying "stop", walked
sibling models that share the same account, and rotated keys *within one account*
on `429`. Client retries (Hermes cron lanes) added on top. Result: 429s -> RSTs ->
"transport" -> failover -> more load -> all models look dead.

The other storm source, `hostamar-ai-gateway/free_model_router.py` (fetching the
~424-model catalog and live-POSTing the top-20 through the guard every 5 min), was
already fixed earlier: it now carries only the 4 allow-listed models and does no
direct NVIDIA probing. Live log confirms the storm is gone - Python-urllib traffic
is ~1-2 req/min, all `200` (6349 requests all-time, no bursts).

## What changed

Code (`nvidia_guard.py`):

1. **Per-request budget** - `NVG_MAX_ATTEMPTS` upstream calls and a hard
   `NVG_REQUEST_BUDGET` wall-clock deadline per client request. The semaphore wait
   is counted against that deadline (`asyncio.wait_for(_SEM.acquire(), rem)`), so a
   deep queue cannot silently turn into a 90s+ client wait.
2. **`NVG_ATTEMPT_TIMEOUT`** bounds one attempt (60s), so a hung model costs 60s,
   not 120s+.
3. **Transport failure -> shed**, do not walk candidate models: an RST/timeout is an
   account/edge condition, and siblings share it. (`kind` is now `ok|transport|budget`.)
4. **429 -> honour it, do not rotate keys.** Both keys are the same account, so
   rotation cannot help; it only adds load. Rotate keys only for `401/402/403`.
5. **Failures never poison model state** - transport/quota exhaustion returns a fast
   `429 + Retry-After: 5` with `type: retry_later` and leaves the live cache alone.
6. **Probes are sequential** (were 4-way `gather`), so probe traffic cannot compete
   with real traffic on a 2-3-concurrent upstream; probe timeout 45s -> 12s.
7. **Unreadable logs fixed** - `str(exc)` is empty for an asyncio timeout, so
   transport lines now log `type(exc).__name__` and `repr(exc)`.
8. `TimeoutStopSec=8` in the unit (a restart used to wait ~90s for an in-flight call).
9. **Discovery probes answered locally** - `/props`, `/v1/props`, `/api/tags`,
   `/api/v1/models`, `/api/ps`, `/api/show`, `/version`, `/api/version` return a
   local 404 in ~1.3ms instead of being forwarded to an upstream that never serves
   them (litellm health-probing was ~2 wasted upstream calls/min).

## Who is actually calling (identified from the access log)

| Source | UA | Behaviour |
|---|---|---|
| Hermes itself (`nvidia-direct`) | `OpenAI/Python 2.24.0` | the real traffic - chat, streaming, long generations |
| litellm `:4000` ("Local Brain") | `python-httpx/0.28.1` | Ollama-style discovery probes (`/props`, `/version`, `/api/tags`, ...), ~2/min |
| Hostamar gateway | `HostamarGateway/1.0` | `GET /v1/models` only |
| manual checks | `curl/8.x` | - |

No `Python-urllib/3.13` storm in the current log: the catalog-scanning
`free_model_router.py` fix holds (6349 requests all-time, ~1-2/min, all `200`).

## Second defect, found by auditing those numbers (also fixed)

The alarming access-log lines `429 171446` / `429 272693` were **not** 170 KB error
bodies. Sequence: a long *streaming* generation -> the client's own 120s timeout
fires -> the client goes away mid-stream -> `resp.write()` inside
`_forward_bytes`' pump raised -> the shared forward helper reported it as an
*upstream transport* failure -> that set `account_fail` and the shed path tried to
write a **second** response onto an already-prepared stream. Result: a bogus
`transport ... Cannot write to closing transport` warning, a bogus `429` status
logged with the partial-generation byte count, and a shed caused by nothing but a
client's timeout.

Fix - a prepared stream is irrevocable (client already has `200` + headers, so no
retry and no candidate switch is possible):

- write failure to the client -> `stream: client went away, ending stream cleanly`
- upstream ends early -> `stream: upstream ended early (...), closing` + `write_eof`
- neither path retries, marks a model, or sheds

Both `handle_chat` and `handle_generic` stream through this one helper, so the fix
covers every streaming path (and `curl --max-time 6` on a long generation now logs
exactly the clean line above plus `200 0`, with no `429`).


Unchanged, deliberately: `/v1/models` = the 4 allow-listed models; non-allow-listed
model = ~1ms local `404` with no upstream call; `kimi-k3` unresponsive ->
substitution to a live sibling with `x-nvg-substituted-from`; only a genuine
model-side failure can mark a model `unresponsive`.

## Verification (live, this box)

| Check | Result |
|---|---|
| `/v1/models` | exactly 4 allow-listed models |
| `google/gemma-4-31b-it` (not allow-listed) | `404` in **1.2ms**, no upstream call |
| 30-concurrent + 5 serial burst | `{'200': 27, '429': 3}`, **0 transport errors, 0 503**, p50 11.4s / p95 21.9s / max 27.0s |
| Same burst on the old code (20 concurrent) | `{'200': 20}` but p50 14.6s / **max 82.7s** - unbounded stalls |
| `moonshotai/kimi-k3` (used to hang to `000`) | `200` in **1.6s** via substitution (`x-nvg-substituted-from: moonshotai/kimi-k3`) |
| Liveness cache | 3 live, kimi-k3 `unresponsive` (short TTL) - **no model marked "not live"** |
| Idle window after the burst | 0 transport warnings, 0 `503`; no `404` storm |
| **Re-verified later same day, while the account was genuinely busy** | 30 concurrent -> `{'200': 29, '429': 1}`, **0 transport errors, 0 503**, p50 38.5s / p95 97.7s / max 103.0s; serial 5/5 `200` |
| Discovery probes (`/props`, `/version`, `/api/tags`, `/api/v1/models`, `/v1/props`) | local `404` in **1.1-1.4ms**, no upstream call |
| Client gives up mid-stream (`curl --max-time 6` on a long generation) | `stream: client went away, ending stream cleanly` + access line `200 0` - **no** bogus `429`, no `Cannot write to closing transport` |
| Streaming / non-stream end to end | `200` with 13 SSE chunks / `200` JSON |
| Guard restart | **11s** (was 90s + SIGKILL) |
| "not live" cron failures today | none |
| Repo vs deployed `nvidia_guard.py` | `md5sum` identical |

## Honest limits

- The NVIDIA free-tier concurrency/RPM limit is **real and not fixable from here**.
  Under a heavy burst the guard will still shed some requests - now as a clean
  `429 + Retry-After` (client retries in 5s) instead of a hang, a `000`, or a false
  "model is not live". Clients that ignore `Retry-After` and stampede will still see
  429s; they must back off.
- A long generation legitimately needs up to `NVG_ATTEMPT_TIMEOUT` (60s); the 90s
  request budget is the client-visible ceiling.

## Operate

```bash
systemctl --user restart nvidia-guard.service     # env is read at start only
curl -s http://127.0.0.1:12436/health | python3 -m json.tool
NVG_TEST_N=30 /usr/bin/python3 ~/.hermes/nvidia-guard/test_burst.py   # pass = 0 transport, 0 503
```

Upon `guard.env` change: restart the unit. `test_burst.py` needs `/usr/bin/python3`
(the Hermes-bundled 3.14.7 lacks `aiohttp`/`attr`).

## A 429 from the guard is correct behaviour, not a fault

When the free tier pushes back, the guard sheds with `429` + `Retry-After: 5` instead of
stampeding the account (the tier tolerates ~2-3 concurrent). Those 429s show up in Hermes cron
logs as `nvidia guard saturated quota/transport retry shortly` — expected under a burst, and
correct: Hermes retries (`api_max_retries: 5`), and the shed is what keeps the *other* callers
alive. Do not "fix" a shed by raising concurrency; that is the storm this guard exists to stop.
Distinguish the two cases before acting:

    guard 429 + Retry-After   -> shed, correct, client backs off            (no action)
    genuine 503 / transport RST -> guard could not serve even alone         (investigate)

Since the fix the 503/RST side has been flat: 0 models dead, 0 503 in the 2 h window after
03:00 (pre-fix counts were 447 + 237 + 183 in 00:00-02:00), and re-verified bursts give
29x200 + 1x429, 0 transport, 0 503.

## Substitutions floor max_tokens at 800

Reasoning models emit hidden thinking tokens before any content, so a small client ceiling
returns `finish_reason=length` with `content:null` — that is a client-side artefact, not a dead
model. `_rebuild_body()` sets `max_tokens` (or `max_completion_tokens`, whichever the caller
used) to `NVG_REASONING_MIN_TOKENS` (default **800**) when it rebuilds a body for a substitution
and the client asked for less. A body forwarded unchanged is never rewritten. Verified:
`kimi-k3` (unresponsive) substituted by `glm-5.3-flash` returns 200 with `max_tokens=300`.

