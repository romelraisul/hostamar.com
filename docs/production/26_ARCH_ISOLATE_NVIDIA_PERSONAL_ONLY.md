# 26 — Architecture Isolation: NVIDIA API Personal-Only (2026-11-05)

## Decision
The NVIDIA-guard (:12436, 5 models, 2 keys) is now used ONLY by the personal
toolchain. The website API path serves the wide catalog instead, so the guard's
keys and latency stay private and are never a public dependency.

## Personal — verified on :12436 (no-auth, 5 models)

| Tool | Config |
|---|---|
| WSL Hermes | `~/.hermes/config.yaml` → base_url `http://127.0.0.1:12436/v1`, default `z-ai/glm-5.3-flash` |
| Desktop Hermes | `%USERPROFILE%/.hermes/config.yaml` → same |
| OpenCode | `~/.config/opencode/opencode.json` → `nvidia-guard` |
| AutoClaw | `~/.openclaw-autoclaw/openclaw.json` → `custom__ba61c803` → :12436 |
| OpenClaw | `~/.openclaw/openclaw.json` → provider `nvidia` → :12436 |
| MiniMax design | `hub-proxy.py` user-custom-nvidia lane → :12436 |

## Website — no longer on :12436 (verified over the public internet)

| Route | Serves | Result |
|---|---|---|
| `hostamar.com/api/v1/models` | own edge catalog (KV + free + local) | 200, 105 models |
| `api.hostamar.com` (Worker) → api-primary tunnel b9839ba7 | freellmapi :3002 | 200, 1454 models |
| `api-primary.hostamar.com` (direct, no bearer) | rejected | 401 `Invalid API key` (safe) |
| omniroute :20128 | available as the router lane | 697 models with its own key |

## What changed
1. `workers/api-router.js` — the Worker now sends `Authorization: Bearer
   <PRIMARY_API_KEY>` to the PRIMARY origin only. The key is a Wrangler secret,
   so it is never public and never reaches the fallback, and a primary 401/403
   is now treated as a primary failure, so an auth error can never leak to
   website users. Deployed as version `303bebf8-9b20-41d9-a24f-5d7670134cd4`.
   The zone route `api.hostamar.com/*` persists across redeploys (no DNS:Edit
   needed).
2. `.cloudflared/hostamar-api-primary-config.yml` — the b9839ba7 tunnel now
   routes `api-primary.hostamar.com` → WSL freellmapi :3002 (was :12436).
   Rollback: `cp .cloudflared/hostamar-api-primary-config.yml.bak-kilo-20261105-160545
   .cloudflared/hostamar-api-primary-config.yml &&
   systemctl --user restart cloudflared-hostamar-api-primary`.
   The :3002 variant is also kept at `config-api-primary-freellmapi.yml`.
3. Secret set: `wrangler secret put PRIMARY_API_KEY` (freellmapi unified key).
4. `kilo-boot-heal.sh` — per-backend health checks with per-backend keys:
   guard :12436 (no-auth) for personal; freellmapi :3002 and omniroute :20128
   (each with its own bearer) for the website; the freellmapi container is
   restarted if it stops answering. Plus the existing repairs: relay re-sync
   poke, perf-guard drift guard (it must never run Stop-Process again),
   podman-compose symlink repair, hostamar-vps restart, C: free-space watch.

## Why the first attempt was reverted, and why it is safe now
The first attempt pointed the tunnel straight at :3002 with no auth layer, and
api.hostamar.com returned 401 for every website user (the Worker passed any
primary status < 500 straight through). That was reverted to :12436 within
minutes. The switch was re-applied only AFTER the Worker key injection existed,
so the public path is authenticated server-side and the raw key is never
public: a direct api-primary call without the bearer gets a clean 401, which
the Worker itself treats as a failure and fails over.

## Secrets handling (masked everywhere)
- freellmapi key: `FRELLMAPI_KEY` in `/home/romel/automation/infisical.env`
  (len 59, prefix `freellmapi`) + a Wrangler secret. Never echoed.
- omniroute key: `OMNIROUTE_API_KEY` in the same file (len 20, prefix
  `sk-hostamar`); also the pinned :20128 endpoint key in freellmapi.config.json.
- These checks read keys from env files only; no key appears in logs or docs.
