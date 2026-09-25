<!-- CL4R1T4S: Engineering rules for Copilot -->

# Hostamar Engineering Rules

## Code Quality
- Read file BEFORE editing. Never output code to user unless asked.
- Address root cause, not symptoms. Add descriptive logging.
- ALL changes in SINGLE edit call. Combine multi-section edits.
- Bias toward NOT asking user — find answer yourself.

## Build/Test
- `npx tsc --noEmit` to typecheck, `npm run build` to build
- Verify locally on localhost:3000 before prod curl

## Project facts
- Next.js 14 App Router + Tailwind + Prisma + next-auth
- Repo: hostamar-build (branch main) → Vercel auto-deploy
- Legal pages EXIST (privacy/terms/refund/faq). Do NOT rebuild.
