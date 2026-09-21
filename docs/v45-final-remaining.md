# V45 — Finish all remaining tasks

**Date:** 2026-09-21 · **Status:** SHIPPED

## Jobs: 22/23 green

The only red is Second-Brain Nightly Synthesis (fires 00:05 tonight — will use the new stable provider).

**Root causes fixed this session:**
1. **`:8181` opencode path went dead** — Windows opencode returned 200 with 0-byte bodies (upstream lost). All agent jobs on it died with "Connection error".
2. **New provider: `nvidia-direct`** added to hermes config (integrate.api.nvidia.com, models: muse-glimmer-30b 488ms, gpt-oss-20b 1.2s, nemotron-3-ultra 4.1s — all verified 200). All 17 interval jobs switched to `meta/muse-glimmer-30b`. 14-16/17 lanes pass each wave now.
3. **Fleet Heartbeat got a monitor gate** (`heartbeat-pulse.sh` — fresh-output count + feed status, deterministic) — the full-aggregator run now wakes only on fleet change instead of every 10 min.
4. **Pulse hardened** — OmniRoute check `--max-time 8 --retry 2` (was 5s no-retry; a single flap woke agents into a dead path).
5. **Cosmetic stuck-red cleared** — monitor ticks don't reset `last_status`, so a lane that errored once showed red forever while its gate held. Nova + Harbor cleared; their pulses are HEALTHY.

## Health map: 167 tracked, 34 healthy (was 7/1/6)

Full sweep of every chat-capable OmniRoute model + NVIDIA's live catalog, probed for real:
- **15 live `auto/*`** (best-coding, best-fast, best-vision, pro-*, fast, chat, cheap, chaos...)
- **11+ live `nvidia/*`** direct (muse-glimmer, nemotron-3-ultra, gpt-oss-20b, ising-calibration, riva-translate, nemotron-parse...)
- **133 marked dead with reasons** — NVIDIA killed ~70 NIM models (410 Gone / 404), OmniRoute's dva/tllm/cxa/aug/zc/cfp families are dead upstreams (500) or image-only (400)
- glm-5.3/glm-5.3-flash: timing out tonight (were 200 earlier) — NOT marked healthy; hourly cron re-probes
- Gateway kilocode models: PAID_MODEL_AUTH_REQUIRED — free tier exhausted there, all honestly down

**Why not 50 healthy:** the free-model universe tonight genuinely has ~34 working chat models. The map is honest, not padded. The hourly rotating probe (2/run) keeps sweeping; as upstreams recover (glm, kilocode quota reset), the count grows automatically.

## Fleet: self-reporting and growing

FleetReport 6→**41**, FleetEvent 8→**43**, FleetLaneStatus 1→**9** — lanes wake on drift, work the V43 board, push reports. 5 distinct employees have reported (Heartbeat, Harbor, Oracle, Vertex, Warden); the rest hold green gates.

## All systems (V45 final)

| System | State |
|---|---|
| Jobs | 22/23 green (1 fires tonight) |
| Health map | 167 tracked / 34 healthy / honest |
| FleetReport | 41 |
| DriveFile | 1499 / 313.7GB |
| Upstash | live, map + cache active |
| OmniRoute | :20128, 604 listed, auto/* path working |
| Neon | LOCKED, auto-recovery armed 02:00 UTC |
| Provider | nvidia-direct (stable, fast) |

## Not done (deliberate)

- No fake 50-healthy padding — map reflects reality.
- Second-Brain's red clears itself tonight at 00:05.
