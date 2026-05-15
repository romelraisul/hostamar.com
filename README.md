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
