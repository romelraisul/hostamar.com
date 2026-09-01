# V27 AI Gateway Audit — 2026-09-02, repo @ cffef0c (prod ika74zf7j)

## PHASE 0 — Live verification (all measured this session)

| Check | Result |
|---|---|
| quota | 20/100 ✓ (<80) |
| `GET ai.hostamar.com/v1/models` | **200, count 120, first id `hostamar-1m-a`** ✓ |
| `GET hostamar.com/api/v1/models` | **200, count 120, first `hostamar-1m-a`, owned_by `hostamar`** ✓ |
| `GET hostamar.com/api/ai/health` | **200 public** `{ok:true, models:120, chat reachable:true, hostamar1mAServed:true}` ✓ |
| `POST hostamar-1m-a` small ("hi test small") | **200 in 6.7s**, finish_reason `stop`, 339 chars ✓ |
| `POST` medium (~10k tokens) | **200 in 26.9s**, finish_reason `stop`, 1105 chars ✓ |
| `POST` large 99k tokens (398 msgs, 323KB — exact Hermes repro) | **200 in 4.7s**, finish_reason `stop** ✓ — 504 structurally eliminated |
| chain budget code | 6 markers (`CHAIN_BUDGET_MS`/`remainingMs`/`attemptTimeoutMs`) in lib/ai-fallback.ts ✓ |
| route | `maxDuration = 55`, force-dynamic, nodejs ✓ |

The three sizes cover the failing case from the user's logs (398-msg context → was
504 after 43s + EmptyStreamError; now completes with finish_reason always present).

## Sitemap transient — closed STRUCTURALLY this push

Observed mid-transient at audit time: 41 URLs (0 TV), age 1079s — the V25/V26
pattern (prebuilt build prerenders without DB → 41-URL sitemap baked → vercel.json
1h Cache-Control serves it). Instead of waiting for each TTL heal, `app/sitemap.ts`
now exports `dynamic = 'force-dynamic'` (kept revalidate=3600): the prerender is
skipped entirely, so a prebuilt deploy renders the sitemap per-request from the
deployed function WITH DATABASE_URL at runtime — first request post-deploy returns
124 URLs (83 TV + 8 blog + 33 static), then the CDN 1h header caches it. DB cost
unchanged (~1 query/hour). The raw-SQL fallback (409f5b5) stays as second insurance.

## PHASE 2 — 6 products + APIs (verified live)

- 6 dashboard pages 200 authed / guarded unauth (reel/hosting/chat/browser/ide/game — V26 suite tests 129-134 ✓)
- `/api/video/reel/generate` → 200 {ok, 4 images, 4 Bangla captions গ্রাফিন, 12s}
- `/api/chat/conversations` → 200 `{"conversations":[]}` (ALTER-TABLE healed V26)
- All 5 product APIs guarded: 401 unauth / 200-400 authed (suite tests 136-140 ✓)

## Spec corrections (carried from V26, all grounded)

- "Gateway down" — wrong: timeout math (8 sequential 30s attempts vs 55s maxDuration on 99k-token contexts)
- "CF Worker serves ai.*" — wrong: DNS → Vercel anycast; worker unreachable via ai.*
- "Clone 15 repos" — rejected as vendoring; 6 products integrated natively + docker-compose.all.yml profiles
- "hostamar-1m-a missing in litellm" — wrong: defined in catalog, embedded worker catalog, and gateway list
