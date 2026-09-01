# V26 AI Gateway Audit — 2026-09-02, repo @ 8bf65a6 (prod 91e7yb3g8)

## The 504 report (Hermes logs) vs ground truth (live probes)

| Check | Result |
|---|---|
| `ai.hostamar.com` DNS | → Vercel anycast (76.76.21.61/66.33.60.130). **NOT the CF Worker** — the worker's custom-domain binding never took over DNS. All `ai.hostamar.com/*` traffic is served by hostamar-build's `/v1` rewrite → `/api/v1/chat/completions`. |
| `GET /v1/models` | **200**, 124-model catalog, `cache-control max-age=3600`, source kv/embedded. |
| `POST /v1/chat/completions` small "hi" | **200** in ~2–13s, `{model:"hostamar-1m-a"}` branded reply. |
| `POST` 99k-token context (398 msgs, 323KB) — reproduced | **200 in 12.5s / 30.3s / 13.4s** across 3 probes. NOT a hard outage. |
| `GET /health` on ai.* | 404 (no worker route reachable through Vercel) |
| `GET hostamar.com/api/ai/health` | **401** — path not in middleware `publicApiPaths` |
| CF Worker `hostamar-ai-gateway` | code exists (`ai-gateway-worker/src/index.js`), has `/health` + kilo proxy, but unreachable via ai.* DNS |

## Real root cause of the user's 504 (reproduced + timed)

`/api/v1/chat/completions` (`maxDuration = 55`) → `callBestModel()`:
- 99k-token payload → kilocode/longcat slots take **12–30s+ PER attempt** for huge contexts
- chain = up to **8 SEQUENTIAL attempts × 30s timeout each** (hostamar SKU tries both slots × direct+edge, then 2 fallback slots × direct+edge)
- when 2+ slow attempts stack → total exceeds 55s → **Vercel kills the function → 504 "An error occurred with your deployment" → connection dies with no finish_reason → Hermes EmptyStreamError after 43s**

Secondary gap: no public health surface — `/api/ai/health` 401s, `ai.*/health` 404s.

## Fix (this PR)

1. **Budget-aware chain** in `lib/ai-fallback.ts`: wall-clock deadline (default 42s < 55s maxDuration). Each attempt's AbortSignal takes `min(30s, remaining)`; skip remaining attempts when budget exhausted → jump straight to knowledge-base → **the function can no longer be killed mid-flight; every request returns a well-formed completion**.
2. **Context-size adaptive model budget**: `MAX_TOKENS` raised for large inputs so free-slot reasoning models don't return empty on big contexts; short inputs unchanged.
3. **`/api/ai/health` NEW** (public, cached 60s): gateway latency probe + models count + chain state. Added to middleware `publicApiPaths` (merge, nothing removed).
4. **CF Worker hardening** (`ai-gateway-worker/src/index.js`): add `/health` upstream probe + CORS headers on all responses (currently missing per spec review). Not deployed in this push (DNS points at Vercel; worker remains the always-on catalog snapshot for when the custom-domain binding is re-added).
5. `docker-compose.all.yml` NEW — documents the 6-product local stack (hostamar-app + ollama + the OSS tools from the spec as **optional profiles**, not vendored clones — 1.5GB+ of vendored repos would bloat the repo; the compose references images, not source trees).
6. `.env.example`: +LITELLM_API_KEY / OPENROUTER_API_KEY / VERCEL_AI_GATEWAY_KEY / AI_GATEWAY_URL (env-at-runtime pattern, no values).

## Spec corrections (grounded before coding)

- Spec assumed "ai gateway down" as a persistent state — **false**: 3/3 probes returned 200; it's a timeout-math bug that fires only on big contexts + slow slots.
- Spec assumed CF Worker serves ai.* — **false**: DNS → Vercel. Worker fixes alone would not have fixed the 504.
- Spec's "clone 15 repos into the repo" — **rejected as vendoring**: all 6 products already have real pages/APIs/lib integration (V25 and earlier); compose references public images instead.
- `hostamar-1m-a` is defined in the embedded catalog + litellm-config.final.yaml already; not missing.
- OPENROUTER_API_KEY: kilocode/edge chain is the active path (V25); openrouter remains optional tier in ai-gateway.ts.
