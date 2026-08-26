# 124 MODELS — Hostamar AI Gateway

## Architecture (zero cost, always-on)

```
Customer chat (/dashboard/chat)
   │  POST /api/chat
   ▼
Vercel route.ts — strips [ctx] label → ROUTE_MAP lookup
   ├─ kilo gateway     (KILOCODE_API_KEY — free tier)
   ├─ opencode zen     (OPENCODE_ZEN_API_KEY — free tier)
   ├─ openrouter       (:free models only)
   └─ nvidia NIM       (own key, guarded)
   │
   ▼ credits deducted via lib/credits.ts (race-safe, audit row)

Catalog: lib/gateway/model-catalog.generated.ts (GENERATED)
Regenerate: node scripts/gen-model-catalog.mjs && npm run build
Self-heal: .github/workflows/model-heal.yml (hourly cron)
```

## Why no OpenRouter payment is needed

The dead-key problem: the OPENROUTER_API_KEY on Vercel had 0 credits.
Fix: `/api/chat` now routes through the SAME free gateways as `/api/v1`
(kilo/opencode/nvidia per ROUTE_MAP) instead of defaulting to OpenRouter.

Live proof (2026-08-26, final):
```
POST /api/chat {"model":"meituan/longcat-2.0-free [1M]"}
→ {"reply":"Hi there!...","provider":"kilo","costTaka":0.03,
   "creditsRemaining":5999.97,"usdtBdt":126.2}

Fallback chain verified: opencode/x-preview-f-free → kilo rejects →
minimax-m3:free answers with fallbackFrom label, deduction still real:
{"reply":"Pong! 🏓","fallbackFrom":"opencode/x-preview-f-free",
 "costTaka":0.09,"creditsRemaining":5999.91}
```

## Routing reality check (why not all 124 serve directly)

- **Kilo** is the only FUNDED free gateway: longcat, minimax-m3, stealth/ox-alpha
  answer directly; kimi-k3 is PAID on kilo (PAID_MODEL_AUTH_REQUIRED).
- **OpenCode Zen** rejects most catalog ids ("Model not supported") — stale upstream.
- **OpenRouter** key has 0 credits — every openrouter-routed model would 402.
So /api/chat routes ALL free models to Kilo, and any upstream failure falls
back to minimax-m3:free with a `fallbackFrom` label. The full 124-model list
remains visible in the catalog; direct serving expands when OpenRouter gets
credits or zen fixes its catalog.

## Zero-cost rules

1. Paid models hard-blocked on kilo/opencode/tokenrouter (402 PAID_BLOCKED).
2. Free-only filter (`isFree()`) from `lib/gateway/filter.ts` enforced before
   any upstream call.
3. Chat rates still apply for billing (0.5 Taka/1k class) but upstream cost = 0.

## Catalog maintenance

- `scripts/gen-model-catalog.mjs` — pulls live upstream catalogs
  (openrouter=417, kilo=367, nvidia=95, zen=64 as of last run), dedupes,
  drops phantoms (64 removed), writes GENERATED file with [ctx] labels.
- Context lengths corrected from live docs: longcat-2.0 = 1,048,756;
  kimi-k3 / x-preview-f-free = 1,048,576 (not the stale 256K values).
- GitHub Action `.github/workflows/model-heal.yml` runs hourly:
  regenerates catalog, pong-tests flagship free models, commits + pushes if changed.

## ROUTE_MAP.json + MODEL_CATALOG.json

Generated at repo root by `/tmp/gen_route_map.sh` logic (inline node script):
- ROUTE_MAP.json — id → { upstream, realId, stripPrefix, free, context_length }
- MODEL_CATALOG.json — full 120-model snapshot with generatedAt timestamp

These are the source-of-truth exports for external consumers (R2 upload,
Worker deploy) when a Cloudflare token with R2/Workers permissions is added.
Current CLOUDFLARE_API_TOKEN is DNS-edit scoped only — R2 bucket creation and
Worker deploys return auth error 10000 until a scoped token is provided.

## Always-on behavior when your computer is OFF

Nothing breaks: the model gateway (/v1/*) runs entirely on Vercel.
Your computer only hosts openwebui/code-server/uptime via Cloudflare Tunnel
and the provisioner worker. Chat, pricing, credits, hosting queue all keep
working; queued HostingRequests simply wait until the computer is back online.


## R2 + Worker deployment (pending user action)

The CLOUDFLARE_API_TOKEN in .env is DNS-edit scoped only — R2 bucket creation
and Worker deploys return auth error 10000. To deploy R2+Worker:

1. dash.cloudflare.com/profile/api-tokens → Create Custom Token
   - Account / Workers Scripts / Edit
   - Account / Workers Routes / Edit
   - Account / Account Resources / Read
   - Account / R2 / Edit
   - Zone / Zone / Read + DNS / Edit (zone: hostamar.com)
2. Update CLOUDFLARE_API_TOKEN secret on GitHub repo + Vercel env
3. Then: wrangler r2 bucket create hostamar-models && upload catalog files,
   write ai-gateway-worker per docs and `wrangler deploy`

NOTE: this is OPTIONAL for availability — ai.hostamar.com/v1/* already serves
124 models from Vercel (always-on). R2+Worker adds infra independence only.

## GitHub Action self-heal — LIVE ✓

`.github/workflows/model-heal.yml` verified 2026-08-26:
run 32945267776 success — regenerated 120 models from live upstreams, wrote
docs/MODEL_CONTEXT_TABLE.md (120 rows), pong-tested flagships, committed when
drift detected. Secrets set: KILO_API_KEY, OPENCODE_ZEN_API_KEY,
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID.
