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

## Endpoints that must debit

`/api/generate` · `/api/tools/run` (create_video) ·
`/api/dashboard/videos/create` · `/api/video/generate` ·
`/api/v1/chat/completions` · `/api/v1/responses` · `/api/v1/embeddings` ·
`/api/chat`

The internal gateway path (`LITELLM_MASTER_KEY`) stays free by design — that is
the only legitimate bypass, and it is authenticated by the master key itself.

## Verify (against production, self-cleaning)

```bash
node scripts/test-billing.mjs            # https://hostamar.com
```

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
