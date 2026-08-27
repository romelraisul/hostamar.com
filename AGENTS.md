# Hostamar — AI Agent Context (AGENTS.md)

> Read this before doing ANY work in this repo. It encodes hard-won ground truth so no
> matter which AI model is used, work is consistent and doesn't get lost/redone.

## What this project is

Hostamar.com — a Bangladeshi AI platform (AI video, hosting, chat, browser, gaming, IDE).
Next.js 14 (App Router) + Prisma + next-auth. Live checkout is
`/mnt/c/Users/User/hostamar.com` (branch `sso-providers`). There is also a stale
copy at `/home/romel/hostamar.com` — DO NOT edit that one; it is not the live path.

## Critical rules (do not repeat these mistakes)

1. **.env handling:** `.env.local` holds real config. Never commit `.env*` with real
   secrets (`.env.example` is the template). `NEXTAUTH_URL` must be a real URL
   (`http://localhost:3000` locally), NOT empty string — empty breaks next-auth with
   `TypeError: Invalid URL`.
2. **Model serving (gateway):** `C:\Users\User\hostamar-ai-gateway\gateway.py` runs on
   the Windows host, NOT WSL. Port 11442. WSL must reach it via `172.17.112.1`,
   Windows IDE via `127.0.0.1`.
3. **Which model is fast:** rafan (bonsai 3.6GB Q1_0) = FAST (GPU). rushan/borna/
   hostamar (17-18GB) = CPU-bound and slow locally. Free-cloud routing now handles
   them (see below). Never promise customers fast 17GB models on local 8GB VRAM.
4. **Database:** PostgreSQL via Prisma. Run `schema` migrations with `npx prisma migrate`.
5. **i18n:** single source = `lib/i18n.ts` (`t(key, lang)`). `locale-context.tsx`
   must import from it.

## Build / test commands

- Typecheck: `npx tsc --noEmit`
- Build: `npm run build` (or `./node_modules/.bin/next build`)
- Dev: `npm run dev`
- Test: `npm test`

## Active infrastructure state (verify before touching)

- Free-model router: `hostamar-ai-gateway/free_model_router.py` polls KiloCode +
  NVIDIA + OpenCode for free models every 5 min, ranks them, assigns top-3 to
  rushan/borna/hostamar. Gateway `/v1/models` returns ~424 models.
- Watchdogs are registered as Windows Task Scheduler tasks (`HostamarRAMWatchdog`,
  `HostamarRafanWatchdog`) — they survive reboots.
- Prompt suggestions: `lib/prompt-suggestions.ts` + `components/PromptSuggestions.tsx`
  wired into chat/video/image.

## Prior decisions (don't "fix" these back)

- rafan is the default/fast customer model. rushan/borna/hostamar are premium/slow.
- Support widget (3-tier: bonsai → Ollama → Gemini) in `app/api/support-chat/route.ts`.
- Prompt suggestions from prompts.chat (CC0 data) shipped into chat/video/image inputs.
