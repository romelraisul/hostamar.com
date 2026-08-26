# DASHBOARD FINAL REPORT — 2026-08-26

## Live test accounts used

- qa-final+1787679xxx@hostamar.com (cmt94goyz0001g7e8cdy6uxn5) — welcome credits verified
- qa-final2+...@hostamar.com — re-verified on final deploy

## Before → After per tab (live, logged-in customer)

| Tab | Before | After |
|---|---|---|
| AI Chat | `/chat` public pricing page, leaves dashboard | `/dashboard/ai-studio` 200 inside shell |
| AI Browser | `/browser` standalone | `/dashboard/browser` 200, proxy iframe same-origin |
| Dev IDE | `/ide` standalone, no dashboard page | `/dashboard/ide` 200 wrapper in shell |
| Game | `/game` standalone | `/dashboard/game` 200 wrapper in shell |
| Hosting | POST = **401** (requireAdmin), no credit logic | **402 INSUFFICIENT_CREDITS** with balance+needed; affordable specs pass gate |

## Credit flow proof (live)

```
signup (new customer)      → balance 6000 (WELCOME_CREDITS)
POST hosting cpu100/ram500/storage50000 (price 28500)
                           → 402 {"error":"INSUFFICIENT_CREDITS","balance":6000,"needed":28500}
POST hosting cpu1/ram1/storage10 (price 20, balance ok)
                           → passes gate → 503 "Provisioning node offline"
                             (correct: docker provisioning runs from local node,
                              not Vercel; credit gate + deduction live on that path)
video create w/o credits   → "Insufficient credits. Need 1 credits, have 0."
```

## Chat how-to answers (live)

Q: "how can i generate video" →
"1. Click on 'AI Video' in the left sidebar. 2. Then you can either open an existing video or click 'Create Video'…"

Q: "how to add hosting with credit" →
"…adding hosting using your credits… Here's how: 1. F…" (steps referencing sidebar)

## Files changed (final round)

- lib/dashboard-routes.ts — NEW single source for product routes
- lib/pricing.ts — added HOSTING_PRICE() + WELCOME_CREDITS (kept existing PLANS)
- app/dashboard/layout.tsx — imports DASHBOARD_ROUTES (deduped), mounts DashHelpCenter
- app/dashboard/page.tsx — deduped DASH_ROUTES → DASHBOARD_ROUTES
- app/api/hosting/servers/route.ts — getAuthUser, credit gate BEFORE docker check
  (so 402 reachable on serverless), guarded $transaction decrement (credits gte price),
  HOSTING_PRICE from lib
- app/api/auth/register/route.ts — grants WELCOME_CREDITS at signup
- app/api/browser/proxy/route.ts — SSRF guard: localhost/127.0.0.1/169.254.169.254/
  10/8/172.16/12/192.168/.internal/.local blocked → 400 (metadata probe verified live)
- components/DashHelpCenter.tsx — data-testid="dash-help-center", collapsed state in
  localStorage (defaults open every session until user closes it)
- tests/dashboard-final.spec.ts + tests/live-customer-audit.spec.ts — Playwright E2E
- tsconfig.json — tests excluded from build typecheck

## Provisioning queue (2026-08-26 late) — 503 GONE

- New `HostingRequest` table on Neon (raw SQL applied; `prisma db push` deliberately
  NOT used — local schema had drifted from prod and push wanted destructive changes
  on Conversation/CreditTransaction).
- POST /api/hosting/servers: credit gate → guarded updateMany decrement → enqueue row
  → **202 {status:'provisioning', id, plan, creditsCharged, creditsRemaining}**.
  Live proof: starter spec → creditsCharged 28, balance 5972 in DB.
- Worker: `apps/provisioner/worker.mjs` + quadlet
  `~/.config/containers/systemd/hostamar-provisioner.container` — polls queued rows,
  `podman run` with cpu/ram limits, status→running. Start with:
  `systemctl --user daemon-reload && systemctl --user start hostamar-provisioner`
- Audit rows match the REAL prod table (`CreditTransaction.accountId` → CreditAccount,
  product field) — schema.prisma's CreditTransaction model has drifted from prod;
  raw SQL used for the signup audit row.
- podman-compose.yml at repo root (openwebui/code-server/provisioner/uptime-kuma).

## Known limits (documented, by design)

- ~~Affordable hosting creation ends in 503~~ FIXED: queue + provisioner (above).
- Bot Fight Mode + AI Labyrinth remain manual dashboard toggles (token scope).
- Turnstile is wired end-to-end; it no-ops until NEXT_PUBLIC_TURNSTILE_SITE_KEY and
  TURNSTILE_SECRET_KEY are added to Vercel env.
- schema.prisma drifted from prod: Customer.credits is Float locally and
  CreditTransaction/Account shapes don't match prod. HostingRequest was applied
  via raw SQL. **Never `prisma db push`** — review drift first.
- 25/78 legacy customers had no CreditAccount (audit rows skipped). Fixed by
  signup now auto-creating CreditAccount + migration script backfilling the
  rest. Chat deductions now write audit rows with accountId.


## Final 5% round (2026-08-26 late)

1. **CreditLog** — no new table needed: `CreditTransaction` already existed in the
   schema with exactly the right shape. Wired in:
   - signup → `welcome_bonus` row (amount +6000, balanceAfter 6000), best-effort,
     never blocks signup
   - hosting create → row inside the deduction transaction (`type: 'hosting_create'`,
     negative amount, balanceAfter)
2. **Turnstile** — fully wired, dormant until keys exist:
   - `components/Turnstile.tsx` (explicit render, no-op without site key)
   - widget on `/signup` before submit; form sends `turnstileToken`
   - `/api/auth/signup` verifies via challenges.cloudflare.com siteverify BEFORE
     creating the customer / granting credits; fails → 400 'Bot check failed'
   - `lib/turnstile.ts` — verification helper; no-ops when TURNSTILE_SECRET_KEY unset
     so current deploys are unaffected
   - `.env.example` documents both keys
3. **Live re-verified after deploy**: fresh signup works, balance 6000, hosting gate
   returns 402 needed=28500. Signup regression during this round (nested audit-row
   create caused a 500) was caught by live test and fixed by moving the audit write
   to best-effort after creation.

To finish bot protection completely: add the two Turnstile keys to Vercel prod env.
