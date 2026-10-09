# AGENTS.md — Hostamar (single source of truth)

> Read this FIRST. It encodes ground truth so any AI agent or developer starts from
> the same facts and does not re-discover them (or hallucinate "missing" files).

## What this project is

Hostamar.com — Bangladeshi AI platform (AI video, chat, browser, hosting, IDE).
Next.js 14 (App Router) + Tailwind + Prisma + next-auth.

## Repo layout (single source of truth)

Several checkouts of these repos exist on this machine. Verify before editing —
`git -C <dir> remote -v && git -C <dir> rev-parse --abbrev-ref HEAD` (checked 2026-10-10):

- `/home/romel/hostamar.com` — github `romelraisul/hostamar.com` (public), branch `main`.
  Holds `wrangler-pages.toml` (`name = "hostamar-pages"`) and `open-next.config.ts`: this is
  WHERE HOSTAMAR.COM's CLOUDFLARE WORKER IS BUILT AND SHIPPED FROM. No local `.vercel/` link.
- `/home/romel/hostamar-build` — github `romelraisul/hostamar-build` (private), branch `master`.
  Vercel-linked: projectId prj_WwYkMz8Kk75NN573skKxxWcuMVYi (projectName `hostamar-build`).
- `/mnt/c/Users/User/hostamar` — github `romelraisul/hostamar.com`, branch `fix/store-page-design`
  (an `sso-providers` branch exists but is NOT checked out; `/mnt/c/Users/User/hostamar.com`
  does not exist). WIP with 500+ uncommitted files — NOT the deploy, do not edit for production.
- `/mnt/c/Users/User/hostamar-build` — remote is `romelraisul/hostamar.com` despite the
  directory name, branch `master`.

## Build / test commands

- Typecheck: `npx tsc --noEmit`
- Build: `npm run build` (runs `prisma generate && next build`)
- Dev: `npm run dev`
- Deploy: `git push origin main` → Vercel auto-deploys

## Critical rules (do NOT repeat these mistakes)

1. **Legal pages EXIST** — `app/privacy/`, `app/terms/`, `app/refund/`, `app/faq/`
   are all present. Do NOT report them as "missing" or rebuild them.
2. **SEO schema EXISTS** — `@context: schema.org` Product + FAQPage JSON-LD is in
   `app/layout.tsx` and `app/page.tsx`. Do NOT report schema as missing.
3. **NEXTAUTH_URL must be a real URL** (`https://hostamar.com`), never empty string —
   empty breaks next-auth with `TypeError: Invalid URL`.
4. **Model serving (gateway)** runs on the Windows HOST (`C:\Users\User\hostamar-ai-gateway\gateway.py`,
   port 11442), NOT inside this repo. rafan (bonsai 3.6GB) = fast/local; rushan/borna/
   hostamar (17-18GB) = free-cloud routed via `free_model_router.py`.
5. **Hardware ceiling:** RTX 5060 = 8GB VRAM. No quant makes 17GB models fast locally.
6. **i18n:** single source `lib/i18n.ts` (`t(key, lang)`); `locale-context.tsx` imports from it.

## Prior decisions (don't "undo" these)

- rafan = default/fast customer model. rushan/borna/hostamar = premium/large (free cloud).
- Support widget 3-tier fallback: bonsai → Ollama → Gemini (`app/api/support-chat/route.ts`).
- Prompt suggestions (from prompts.chat CC0 data) in chat/video/image inputs.
- Zero-budget constraint: free tiers only; serverless/Vercel-first.

## Boundaries

- Never commit `.env*` with real secrets (use `.env.example`).
- Never modify `/mnt/c/Users/User/hostamar.com` expecting it to affect production —
  this repo (`hostamar-build`) is the deploy target.


# Billing — metered credits (PERMANENT invariants)

Never touch an AI/billing endpoint without reading **[docs/BILLING.md](docs/BILLING.md)**:
free tier is OFF, every cost-bearing route debits via `deductCredits()` (atomic +
audit row), insufficient → 402 + bKash `01822417463`, a failed upstream is refunded.
Verify against production with `node scripts/test-billing.mjs` (must be all PASS).
hostamar.com is served by the **`hostamar-pages` Cloudflare Worker** (OpenNext) —
`git push` alone ships nothing; use the 4-step ship in that doc.

## Embeddings - local, free, no OpenRouter needed

`/api/v1/embeddings` calls our own router first: `EMBEDDINGS_URL` ->
`https://embeddings.hostamar.com/v1/embeddings` (tunnel `5affa5bd` ->
`localhost:8081` -> Ollama `:11434`). Four local models, auto-routed, all `$0`:

    Bangla script -> bge-m3            1024d  (90% Bengali)
    <=100 chars   -> all-minilm         384d  (fast)
    >2000 chars   -> nomic-embed-text   768d  (8192 ctx)
    else          -> mxbai-embed-large 1024d  (best English)

Response carries `_router: {chosen_model, detected_language, reason, dim}`.
`1cr` debited only on a `200`; refunded on failure. PC-off fallback:
`OPENROUTER_API_KEY` + `OPENROUTER_EMBED_FALLBACK` (free 2048d model) so the
route never 500s while the PC sleeps.

Persistent via user units `hostamar-ollama.service` +
`hostamar-embedding-router.service` (`~/.config/systemd/user/`, linger on =>
they start at WSL boot). `OLLAMA_KEEP_ALIVE=5m` frees the 8GB card for ComfyUI.
Details: `docs/BILLING.md`.

## VERCEL DEPLOY RULE - FREE TIER 100/DAY (always apply)

- NEVER `git push + vercel --prod --yes` double deploy (1 push = 1 deploy). Use ONLY `git push`.
- Check quota BEFORE push: `vercel ls --limit 100 | grep -c "Ready|Building"` — if >80 batch, >95 stop until 06:00 AM BST (00:00 UTC) reset.
- Batch fixes into 1 commit, use `git commit --amend` if not pushed, never --force rebase.
- Local `npm run build` 87.7kB green before push, curl local not prod.
- Guard: `bash scripts/check-vercel-quota.sh` (exit 1 if >80)
