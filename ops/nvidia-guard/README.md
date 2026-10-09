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
