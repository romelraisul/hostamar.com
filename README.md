# Hostamar 🚀

AI Video SaaS Platform — Create, collaborate, and grow with AI-powered video generation.

## Stack

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS 3
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Neon)
- **Auth:** NextAuth.js + JWT
- **Deploy:** Vercel (primary), Docker (alternative)

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start dev server |
| `make build` | Production build |
| `make typecheck` | TypeScript check |
| `make lint` | ESLint |
| `make clean` | Remove build artifacts |
| `make migrate` | Run Prisma migrations |
| `make studio` | Open Prisma Studio |
| `make vercel-deploy` | Deploy to Vercel |

## Project Structure

```
app/              # Next.js App Router pages
  api/            # API routes (55+)
  dashboard/      # User dashboard
  admin/          # Admin panel
  collab/         # Collaboration
  generate/       # AI video generation
  ossu/           # OSSU curriculum
components/       # Reusable UI components
  home/           # Homepage sections
  collab/         # Collab page components
  generate/       # Generate page components
lib/              # Shared utilities
prisma/           # Database schema & migrations
payment/          # Payment integrations (bKash, Nagad, Crypto)
marketing-output/ # Marketing collateral
public/           # Static assets & PWA icons
deploy/           # Deployment scripts
```

## Environment Variables

See `.env.example` for required variables. Key ones:

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://hostamar.com
```

## Marketing

Marketing engine at `marketing-output/marketing-engine.py` supports:
- Facebook posting
- WhatsApp messaging
- Email campaigns
- YouTube uploads

Configure via `.env.marketing` file.

## Browser Automation

Camofox-based browser automation for research and content gathering:
- `npm run browser:health` — Check Camofox status
- `npm run browser:auto` — Run automation scripts
- `npm run browser:api` — API documentation


## Tunnel (Windows)
```bat
cloudflared tunnel list
cloudflared tunnel run hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b)
python C:\hostamar\gateway.py
```
Auto-start: Task Scheduler → hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b) + gateway.py on boot.


## NVIDIA guard (egress to integrate.api.nvidia.com)

Loopback shim (`127.0.0.1:12436`) that Hermes, ZCode, MiniMax and litellm point at
so a single NVIDIA free-tier account cannot be stampeded, and so a hung model never
reads as "not live".

- Source: `ops/nvidia-guard/` (byte-identical to the deployed copy — check with `md5sum`).
- Root cause + evidence: `docs/NVIDIA_GUARD_PERMANENT_FIX.md`.
- Restart: `systemctl --user restart nvidia-guard.service` (env is read at start only).
- Proof: `NVG_TEST_N=30 /usr/bin/python3 ~/.hermes/nvidia-guard/test_burst.py` — pass = 0 transport errors, 0 503s.

### Why it used to fail again and again (root cause, both fixed)

1. **Catalog-scan storm (upstream).** `free_model_router.py` (the litellm "Local
   Brain") enumerated the whole ~424-model NVIDIA catalog through the guard and
   live-verified the top 20 — including models outside the allowed four — with POSTs
   every 5 minutes, and ~18 Hermes cron lane jobs added load on top. The free tier
   tolerates only ~2-3 concurrent calls, so it answered with 429/RST, which surfaced
   as `Cannot write to closing transport` on nearly every forward; the guard failed
   over per model, so the whole pool looked dead and clients got 503s. Fix: the guard
   advertises and probes only its 4 models (anything else 404s locally in ~1ms), caps
   global concurrency, tries each key once, sheds with `Retry-After` instead of
   stampeding, and a transport/quota failure **never** marks a model unavailable.
2. **A client giving up was read as an upstream fault (guard).** When a long
   streaming generation hit the client's own timeout, `resp.write()` raised inside
   the shared forward helper, which reported an *upstream* transport failure — the
   shed path then tried to write a second response onto an already-prepared stream.
   That produced the bogus `Cannot write to closing transport` warnings and `429`
   lines carrying the partial-generation byte count, and could shed other callers
   because one client timed out. Fix: a prepared stream is irrevocable — the guard
   ends it cleanly (`stream: client went away`), never retries and never sheds.

Who actually calls the guard: Hermes itself (`OpenAI/Python 2.24.0`), litellm `:4000`
(`python-httpx`, Ollama-style discovery probes — now answered locally), the Hostamar
gateway (`HostamarGateway/1.0`, `GET /v1/models` only) and curl for manual checks.

litellm `:4000` also has its own `model_list` of **57** models. That catalogue is unrelated to
the guard's allow-list of **4** — a litellm route to anything outside the four gets a local 404
from the guard. The two counts differing is expected, not drift (both recounted 2026-10-10:
57 litellm / 4 guard).

Shedding under load is deliberate. When the free tier pushes back, the guard answers `429` with
`Retry-After: 5` instead of stampeding the account; Hermes retries it (`api_max_retries: 5`) and
the cron lanes ride it out. **A `429` from the guard is therefore correct behaviour, not a
fault.** For a body it rebuilds (substitution only), the guard floors `max_tokens` to **800**:
reasoning models emit hidden thinking tokens before any content, so a small client ceiling comes
back as `finish_reason=length` with `content:null`. A body forwarded unchanged is never rewritten.


