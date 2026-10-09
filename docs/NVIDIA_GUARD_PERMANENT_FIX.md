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
