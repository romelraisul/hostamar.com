> **SUPERSEDED 2026-11-05**: the switch described here is now LIVE — the
> api-router Worker injects the bearer key server-side, so the public tunnel
> serves freellmapi :3002 (1454 models) with no key exposure. Current state is
> documented in docs/production/26_ARCH_ISOLATE_NVIDIA_PERSONAL_ONLY.md.
> The narrative below is kept as the record of the first attempt and its revert.


# Architecture Switch — Website API vs Personal Tools (2026-11-05)

## Goal
Website/API traffic should be served by the wide catalog (freellmapi :3002, 1454
models) with omniroute :20128 (697) as the router, while every personal tool
(WSL Hermes, Desktop Hermes, OpenCode, AutoClaw, OpenClaw, MiniMax design)
stays on the private low-latency nvidia-guard (:12436).

## Verified state (this doc)

| Path | Backend | Models | Auth | State |
|---|---|---|---|---|
| Personal: WSL Hermes (`~/.hermes/config.yaml`) | nvidia-guard :12436 | 5 | none | ACTIVE |
| Personal: Desktop Hermes (`.hermes/config.yaml`) | nvidia-guard :12436 | 5 | none | ACTIVE |
| Personal: AutoClaw (`~/.openclaw-autoclaw/openclaw.json` → custom__ba61c803) | nvidia-guard :12436 | 5 | none | ACTIVE |
| Personal: OpenClaw desktop (`~/.openclaw/openclaw.json` → provider `nvidia`) | nvidia-guard :12436 | 5 | none | ACTIVE |
| Personal: MiniMax design (`hub-proxy.py` → user-custom-nvidia lane) | nvidia-guard :12436 | 5 | none | ACTIVE |
| Personal: OpenCode desktop (`.config/opencode/opencode.json`) | nvidia-guard :12436 | 5 | none | ACTIVE |
| Website: hostamar.com/api/v1/models | own catalog (edge KV + free + local) | 105 | none | 200 |
| Website: api.hostamar.com (Cloudflare Worker) | → api-primary tunnel b9839ba7 → WSL | 5 (guard) | none | 202 fallback |

## What was changed
1. `cloudflared-hostamar-api-primary.service` — tried pointing api-primary at
   freellmapi :3002 as instructed.
2. **Reverted to :12436** after verification showed the public regression:
   both :3002 and :20128 answer `401 Authentication required` unauthenticated,
   and the Cloudflare Worker passes any primary response < 500 straight through
   to callers. Re-pointing the public tunnel at either backend therefore made
   api.hostamar.com return 401 to every website user. Guard serves no-auth, so
   the public path stays on it.

   Backups kept: `.cloudflared/hostamar-api-primary-config.yml.bak-kilo-20261105-160545`
   (the :3002 version, ready to re-apply once auth exists).

3. `kilo-boot-heal.sh` — now health-checks all three backends every boot + every
   20 min: guard :12436 (personal), freellmapi :3002 (website catalog),
   omniroute :20128 (router), plus the existing relay re-sync poke, perf-guard
   drift guard (it must never run Stop-Process again), C: free-space watch, and
   the podman-compose symlink check.

## Why the auth layer is required for the switch
- freellmapi is a single-user proxy guarded by the unified API key
  (freellmapi-6c70351f6b38214255fe719a1373efa3728b338a8c394642, 1454 models).
- omniroute is a router with pinned endpoints and needs its own bearer
  (sk-hostamar-wsl-2026, 697 models).
- Neither exposes an unauthenticated catalog path; making one public would leak
  the key (upstream quota) to the internet.
- cloudflared cannot inject Authorization headers (`originRequest.headers` is
  not a supported field — verified by `cloudflared tunnel ingress validate`).

## Next steps to complete the switch (in order)
1. Cloudflare worker: add `Authorization: Bearer <freellmapi key>` to the
   PRIMARY fetch in `workers/api-router.js`, set it as a Wrangler secret, and
   redeploy. **Blocked: `/home/romel/.cloudflared/.api_token` returns
   `9109 Invalid access token` — token is from Jun 23 and needs renewal.**
2. Re-apply the :3002 tunnel config (backup above) + restart
   `cloudflared-hostamar-api-primary`.
3. Optional: add the api-primary CNAME
   (`api-primary.hostamar.com → b9839ba7-…​.cfargotunnel.com`) — the hostname
   currently resolves to flat Cloudflare IPs with no tunnel route, which is why
   public requests flap between 530 and (once DNS caches settle) 401.

## Operating state
- 12 containers UP; teldrive fixed; infisical-wsl healthy.
- Self-heal active: linger on, `wsl-keepalive.service` + `kilo-boot-heal`
  (boot + every 20 min) + `weekly-trim` Mon 00:00.
- WSL VM still restarts periodically (host-side pressure); every service
  auto-recovers on boot — guard, tunnels, 12 containers, personal backends.
