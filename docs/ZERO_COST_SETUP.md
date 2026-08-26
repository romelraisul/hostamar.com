# Zero-cost always-on setup — hostamar.com 95-model gateway

Last verified: 2026-08-26 (PC OFF test PASS + permanent filter/cron live)

## What serves the models

| Endpoint | Served by | Cost |
|---|---|---|
| https://hostamar.com/v1/* | Vercel project `hostamar-build` (Next.js API routes) | Hobby free $0 |
| http://127.0.0.1:4000/v1/* | Local podman litellm gateway (DEV ONLY, dies with PC) | $0 |

- `ai.hostamar.com/v1` is currently routed by Cloudflare to localhost:3000 on the PC
  (cloudflared tunnel config `~/.cloudflared/config.yml`). It is NOT yet always-on.
  To make it always-on: in Cloudflare dashboard, add CNAME `ai` → `cname.vercel-dns.com`
  (proxied OFF for vercel alias, or use Vercel domain assignment), then remove the
  `ai.hostamar.com` ingress from the tunnel config. Needs CF dashboard/API access.

## Free tiers used

- **Vercel Hobby ($0)**: serverless functions maxDuration=10s, ~100GB bandwidth/mo.
  Streaming responses keep long chats under the limit.
- **Neon free ($0)**: DATABASE_URL = ep-spring-frog-aoikue4i-pooler...neon.tech (already live).
- **OpenRouter**: paid 1M models run on free credits; :free models unlimited.
- **Cloudflare free**: DNS + tunnels for TV/rtmp only.

## Gateway code layout

- `lib/gateway/95-models.ts` — exact model list (95). 1M first: kimi-k3, kimi-k2,
  minimax-m1, hostamar-1m-a/b. Last two: hostamar-own (→ qwen3:8b), minimax-m3 (→ qwen3.5:4b).
- `lib/gateway/filter.ts` — isFree / shouldKeep. opencode/kilocode/tokenrouter models
  must be :free or they are dropped (zero-cost rule). Matches by provider field OR
  vendor prefix in the id — paid can never slip in. Enforced at build AND per-request
  in the chat route.
- `lib/gateway/hostamar-models.ts` — getHostamarModels(latest1M) + fetchLatest1M()
  auto-update from openrouter.ai/models (context ≥ 1M, newest first, experimental/
  stealth/:free ids excluded, kimi-k3/minimax-m1 anchored first).
- `lib/gateway/nvidia-guard.ts` — token cap 120k, 429/402 circuit breaker 60s,
  retry 3x backoff 1s/2s/4s, auto-fallback to openrouter same model id.
- `lib/gateway/update-free-models.ts` — fetchLatestFreeModels() (:free only from
  opencode/kilocode/tokenrouter/nvidia) + buildCatalog() drift rebuild.
- `app/api/cron/update-models/route.ts` + vercel.json cron `0 0 * * *` — daily
  re-check of free catalogs, world ranking, and NVIDIA limits. Trusts Vercel's
  `x-vercel-cron` header; manual calls need CRON_SECRET as Bearer or ?secret=.
- `lib/gateway/ranking-fallback.ts` — world-ranking fallback. glm-family fails →
  kimi-k3; circuit-open/token-overflow → current #1 stable 1M model. Ranking +
  per-model NVIDIA context limits refresh via browser.hostamar.com
  (/api/browser/proxy) with direct-fetch fallback and static defaults when the
  PC is off — never throws, always serves.
- `app/api/v1/chat/completions/route.ts` — provider router + guard + streaming proxy.
  `:free` ids always route to openrouter (even nvidia/-prefixed) — NIM 404 fix.
- `vercel.json` — rewrite `/v1/:path*` → `/api/v1/:path*`.
- `middleware.ts` — `/v1/`, `/api/v1/`, `/api/tv/status|heartbeat|r2|now-playing|playlist|hls-url` are public.

## Env keys required on BOTH Vercel projects

OPENROUTER_API_KEY, OPENROUTER_BASE_URL=https://openrouter.ai/api/v1,
LITELLM_MASTER_KEY (client Bearer auth), TOKENROUTER_API_KEY, KILOCODE_API_KEY

## How to redeploy (always-on part)

```
cd ~/hostamar-build
vercel link --project hostamar-build --yes   # owns hostamar.com domain!
bash push-env.sh                              # or manual vercel env add ... production --force
vercel --prod --yes --force
```

NOTE: project `hostamar.com` and `ai.hostamar.com` exist but do NOT own the domains.
Only `hostamar-build` has hostamar.com aliased (see `vercel alias ls`).

## PC OFF survival test (the gate)

```
podman stop hostamar-gateway          # kill local dev gateway
curl -s https://hostamar.com/v1/models -H "Authorization: Bearer $LITELLM_MASTER_KEY" | jq '.data | length'   # → 95
curl -s https://hostamar.com/v1/chat/completions -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"moonshotai/kimi-k3","messages":[{"role":"user","content":"hi"}],"max_tokens":20}'   # → 200
```

PASS state (2026-08-25): 95 models + kimi-k3 200 while local container Exited.

## Deploy gotchas (learned the hard way)

1. `.vercelignore` MUST exclude `docker/` (9.9GB tv-station videos), else deploy fails
   "File size limit exceeded (100 MB)". Already added: docker/, *.mp4, *.zip, state/, demo/.
2. Domain lives on `hostamar-build`, not project named `hostamar.com`. Check:
   `vercel alias ls | grep hostamar.com`
3. Vercel hobby = 10s function cap → chat route uses `maxDuration = 10` + streaming.

## Hermes fallback order (prod)

https://hostamar.com/v1 → (ai.hostamar.com once always-on) → 127.0.0.1:4000 (dev only)
