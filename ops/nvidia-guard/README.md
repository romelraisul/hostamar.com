# NVIDIA guard (ops)

Loopback-only OpenAI-compatible shim in front of `integrate.api.nvidia.com`.
It exists because Hermes / ZCode / MiniMax / litellm all point at one NVIDIA
free-tier account: the guard keeps that account from being stampeded, and keeps
a dead model from being reported as if it were healthy.

- Deployed at `/home/romel/.hermes/nvidia-guard/` (systemd **user** unit
  `nvidia-guard.service`, `Linger=yes`, port `12436`).
- `nvidia_guard.py` here is kept **byte-identical** to the deployed copy. Verify
  with `md5sum`; they must match.
- Root cause + evidence for the RST-storm fix: `docs/NVIDIA_GUARD_PERMANENT_FIX.md`.

## Invariants (do not regress)

| Behaviour | Why |
|---|---|
| `/v1/models` returns exactly the 4 allow-listed models | Stops consumers enumerating + batch-verifying ~424 catalog models |
| Non-allow-listed model -> ~1ms 404, no upstream call | Kills the probe storm at the source |
| `NVG_MAX_ATTEMPTS` caps upstream calls per client request | Was 3 retries x 2 keys x 4 models = 24 calls / ~24 min |
| `NVG_REQUEST_BUDGET` includes time spent waiting for a semaphore slot | A burst must not become 90s+ client waits |
| 429 from upstream = **account** limit -> shed `429 + Retry-After`, never rotate keys | Both keys share one account; rotating just adds load |
| Transport RST / timeout -> shed immediately, do **not** walk sibling models | Siblings share the same account and edge |
| 401/402/403 -> rotate key (a real key fault) | That is the only case rotation helps |
| Transport/quota failure never marks a model unavailable | Account pressure != model health |
| `kimi-k3` unresponsive -> substitute a live sibling, return 200 with `x-nvg-substituted-from` | Client gets an answer, not a 120s hang/`000` |
| Probes run **sequentially** | 4 concurrent probes against a 2-3-concurrent upstream is itself the burst |
| A prepared stream is irrevocable: client write-failure ends the stream cleanly, no retry, no shed | The client already has `200` + headers; retrying/shedding wrote a second response onto a live stream (the bogus `429 <partial-bytes>` lines). A client's own timeout is not an upstream fault |
| `/props`, `/v1/props`, `/api/tags`, `/api/v1/models`, `/api/ps`, `/api/show`, `/version`, `/api/version` -> local 404 in ~1.3ms | Ollama-style discovery probes are never served upstream; forwarding them burned ~2 account slots/min |
| Log transport failures with `type(exc).__name__` + `repr` | `str()` of an asyncio timeout is empty - the log used to show a cause-less line |

## Operate

```bash
systemctl --user restart nvidia-guard.service      # guard.env is read at start only
systemctl --user status  nvidia-guard.service --no-pager | grep Active
curl -s http://127.0.0.1:12436/health | python3 -m json.tool   # keys + live_cache
curl -s http://127.0.0.1:12436/v1/models                        # must list 4
```

`TimeoutStopSec=8` is deliberate: an in-flight upstream call used to block a
restart for ~90s before systemd SIGKILLed it.

## Check (the runnable proof)

```bash
cd /home/romel/.hermes/nvidia-guard
NVG_TEST_N=30 NVG_TEST_M=5 /usr/bin/python3 test_burst.py
```

Pass = **0 transport errors and 0 503s**. `429` is a legitimate shed, not a
failure. Use `/usr/bin/python3` - the Hermes-bundled 3.14.7 has no `aiohttp`/`attr`.

Reference run (2026-10-10, this box): 30 concurrent -> `{'200': 27, '429': 3}`,
`transport_errors=0 503s=0`, p50 11.4s / p95 21.9s / max 27.0s.

Re-verified after the 05:17 restart: 12 concurrent -> `{'200': 12}`, serial 3 -> `{'200': 3}`,
`transport_errors=0 503s=0 429s=0`, p95 70.5s. Slower p95 under a cold cache, zero faults.

## "Cannot write to closing transport" — what the log actually shows

Two shapes, counted from `guard.log` (whole file, not a tail window):

    forward error key#N: Cannot write to closing transport   (key-indexed forward path)
    transport <model> try#N/3: ClientConnectionResetError    (upstream reset, retried by design)

The first is the client-write-on-a-closed-socket class (a browser/tool that hung up, or an idle
socket reused — `_forward_bytes` ends that stream cleanly, it is logged after the fact). The
second is a genuine upstream-side reset and *is* retried, bounded at 3 tries.

Hourly counts, 2026-10-10: 00h 15, 01h 23, **02h 138, 03h 261**, 04h 23 — last line at
**04:16:52**. The service restarted at **05:17:28** and since then the count is **0** in both
`guard.log` and `journalctl -u nvidia-guard`. So the taper is real, but it did not stop at
03:00 — an earlier note claiming "0 transport in the 2 h window after 03:00" was measured from
a tail window and is superseded by these file-level counts.

## The guard's allow-list is 4 models; litellm's `:4000` list is 57 — unrelated

`litserve`/`litellm` on `:4000` advertises its own `model_list` of 57 local routes (ComfyUI /
LitServe, Ollama, embedding router). That is a different gateway from this guard, which holds a
hard allow-list of 4 for NVIDIA egress:

    z-ai/glm-5.3-flash, z-ai/glm-5.3, moonshotai/kimi-k3, deepseek-ai/deepseek-v4.1-flash

Anything else sent to `127.0.0.1:12436/v1` is refused locally (404, ~1 ms, no upstream call).
Two different model counts on one box is not a conflict. The storm this guard fixed was never
litellm's catalogue; it was the discovery probes and the shared-forward RST.
