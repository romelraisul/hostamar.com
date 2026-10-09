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

