# Hostamar 🚀

AI Video SaaS Platform — Create, collaborate, and grow with AI-powered video generation.

**V33 Status (2026-10-27):** Forgejo self-hosted git live port 3000 ~/forgejo/forgejo v8.0.3 Podman codeberg.org/forgejo/forgejo:8 Volume ~/forgejo:/data Postgres reuse 15432 DB forgejo User forgejo Passwd Infisical Quadlet reboot-proof systemctl active curl localhost:3000/api/healthz 200 Cloudflare Tunnel git.hostamar.com netsh portproxy 4 rules ai 11442 comfy 8188 browser 9222 git 3000 Firewall 3000 allow Edge CDP 9222 live WSL 172.17.112.1:9222 200 Gateway 11442 152 health 200 Agent-S 8765 backend_ok true B2 backup only NOT R2 daily 2AM tar.gz ~/forgejo/data → b2:hostamar-b2-forgejo snapshots 30d rclone ls B2 1+ tar.gz repositories sync lifecycle 30d log success Admin romelraisul@gmail.com org hostamar repos hostamar-platform marketing ansible terraform push main webhook https://hostamar.com/api/webhook/forgejo. Monetization V31 live bKash/Nagad/Rocket paywall B2 videos 317 mp4s Product Hunt draft Directories 300/day fleet OpenSEO 5 pillars. 36 docs V33. 5 Arcs complete.

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

