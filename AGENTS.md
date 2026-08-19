# AGENTS.md — Hostamar (single source of truth)

> Read this FIRST. It encodes ground truth so any AI agent or developer starts from
> the same facts and does not re-discover them (or hallucinate "missing" files).

## What this project is

Hostamar.com — Bangladeshi AI platform (AI video, chat, browser, hosting, IDE).
Next.js 14 (App Router) + Tailwind + Prisma + next-auth.

## Repo layout (single source of truth)

The DEPLOYED repo is THIS directory: `/home/romel/hostamar-build` (branch `main`).
- Vercel projectId: prj_WwYkMz8Kk75NN573skKxxWcuMVYi (projectName `hostamar-build`)
- There is a SECOND checkout of the SAME GitHub repo at `/mnt/c/Users/User/hostamar.com`
  (branch `sso-providers`). It contains newer work-in-progress but is NOT the Vercel deploy.
  Edit THIS repo (`hostamar-build`) for production; keep the other for experiments.

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
