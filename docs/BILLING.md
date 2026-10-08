# Billing — metered credits (PERMANENT invariants)

Read this before touching any AI endpoint. These rules are the fix for the
"customer credit not deducted" bug; breaking one of them silently gives the
product away.

## Invariants

1. `FREE_TIER_ENABLED = false` in `lib/credits.ts`. The free tier is dead —
   do not re-enable it to "make a demo work".
2. Every cost-bearing endpoint debits through the single shared helper
   `deductCredits(userId, -cost, type, description)`. It is atomic
   (`UPDATE ... WHERE credits + amount >= 0`) and writes its own
   `CreditTransaction` audit row.
3. Never hand-roll a `decrement` / read-then-write balance check: that is the
   check-then-write race that leaked free usage, and it writes no audit row.
4. Never write a second ("phantom") audit row for the same spend — the helper
   already wrote the real one.
5. Never add an early-return bypass (`isFree`, `FULL FREE`, "skip if owner").
   Every catalog service and every model call is metered.
6. Insufficient credits → **HTTP 402** (not 403/500) with
   `{ balance, required, bkash: '01822417463' }` so the client can route to
   bKash. A 402 must leave the balance untouched — never negative.
7. A failed call must not cost the caller: debit only when the upstream
   answers 2xx, or refund the debit (`deductCredits(id, +1, 'refund', …)`) when
   it answers non-2xx. A provider key that is missing/absent returns 5xx
   *before* any debit.
8. Pricing: `1cr = 1TK = 1 future HOST coin`; signup bonus 6000cr;
   `VIDEO_COST = 50`; embeddings `1cr`.
9. Every credit **grant** goes through `lib/credit-grant.ts` — never
   `prisma.customer.update({ credits: { increment } })`, which writes no
   `CreditTransaction` row (paid credits then vanish from billing history).
   `grantCredits` = one grant, one audit row.
10. A paid plan grants through `grantPlanPurchase(...)`, which owns all three
    legs: plan credits (`purchase`), first-purchase bonus 6000cr (`bonus`), and
    the referrer's 10% (`referral`, claimed atomically — the `Referral` row is
    flipped `PENDING → paid` with a guarded UPDATE so two approval paths can
    never pay the same referral twice).
11. Marketplace sales go through `splitSale(...)`: buyer `-credits`, seller
    `+80%`, platform `+20%` — three audit rows, all atomic. A listing with
    `ServiceCatalog.sellerId = NULL` is Hostamar's own service and keeps 100%.
    Never settle a sale by writing one balance by hand.

## Endpoints that must debit

`/api/generate` · `/api/tools/run` (create_video) ·
`/api/dashboard/videos/create` · `/api/video/generate` ·
`/api/v1/chat/completions` · `/api/v1/responses` · `/api/v1/embeddings` ·
`/api/chat`

The internal gateway path (`LITELLM_MASTER_KEY`) stays free by design — that is
the only legitimate bypass, and it is authenticated by the master key itself.

## Embeddings upstream — local-first, `$0`, no OpenRouter needed

`/api/v1/embeddings` calls **our own** embedding router first:
`EMBEDDINGS_URL` = `https://embeddings.hostamar.com/v1/embeddings` (Cloudflare
tunnel `5affa5bd` → `localhost:8081` → Ollama on `:11434`). Four local models,
auto-routed by script/length, all free:

| input | model | dim |
|---|---|---|
| Bangla script | `bge-m3` | 1024 |
| ≤ 100 chars | `all-minilm` | 384 |
| > 2000 chars | `nomic-embed-text` | 768 |
| anything else | `mxbai-embed-large` | 1024 |

The Worker passes the request through and returns the router body verbatim
(so `_router.model` / `_router.dim` / `_router.reason` are visible to the
caller). **1cr** is debited only on a `200`; the credit is refunded on any
failure.

The PC is not always on, so `OPENROUTER_API_KEY` (21st Worker secret) stays as
a **dormant fallback**: if the tunnel is down the fetch fails and the request
goes to OpenRouter, which retries **once** on the free model in
`OPENROUTER_EMBED_FALLBACK` (`nvidia/llama-nemotron-embed-vl-1b-v2:free`,
2048-dim — the only embedding model that answers 200 on that $0 account).
No key, no credits, no config needed for the local path.

Durability: user-level systemd units `hostamar-ollama.service` +
`hostamar-embedding-router.service` (`~/.config/systemd/user/`, `Restart=always`,
linger enabled → start at WSL boot). `OLLAMA_KEEP_ALIVE=5m` unloads the model
between calls so the 8GB card stays free for ComfyUI.

## Verify (against production, self-cleaning)

```bash
node scripts/test-billing.mjs            # every charged endpoint debits / 402s
node scripts/test-store.mjs              # store money paths
```

`test-store.mjs` seeds a buyer/seller/referrer + a real listing and a pending
bKash payment, then asserts: 80/20 split on a seller listing, plan credits +
6000cr first-purchase bonus + 600cr referral cut on approval, idempotent second
approval, then deletes every test row (the platform commission leg is reverted
exactly, so no residue on the real admin balance).

Seeds a throwaway Customer + ApiKey in live Turso, asserts every charged
endpoint debits, asserts 402 + bKash at zero credits with no negative balance,
then deletes its own rows. Every line must read `PASS`.

## Deploy — a git push ships nothing

hostamar.com is served by the **`hostamar-pages` Cloudflare Worker** (OpenNext),
not by the Vercel project. Vercel (`hostamar-build`) still builds the same repo,
but the live origin is the Worker. Ship with:

```bash
# 1 next build        (npm run build:cloudflare, production env sourced)
# 2 npx opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion
# 3 find .open-next/assets -type f -size +25M -delete
# 4 npx wrangler deploy -c wrangler-pages.toml   (OAuth; unset CLOUDFLARE_API_TOKEN)
```

Then confirm the new code is actually live — `Current Version ID` in the deploy
output, and a content marker grepped out of `https://hostamar.com`.
`server: cloudflare` on the response and the absence of `x-vercel-id` is how you
tell the Worker answered instead of Vercel.
