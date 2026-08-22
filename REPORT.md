# HOSTAMAR — MARKET LEADER GAP REPORT
Generated: 2026-08-22 · Post-hardening audit (build green, 0 mocks, 0 getServerSession)

## 1. ENV CHAOS (CRITICAL)
**19 env files** in repo root:
```
.env.bak  .env.docker  .env.docker.bak.20260703123638  .env.example
.env.local  .env.local.bak  .env.marketing  .env.mbak  .env.migrate
.env.production  .env.production.example  .env.production.local
.env.queue  .env.run  .env.stale-20260703125212.bak  .env.vercel
.env.vercel-prod  .vercel/.env.development.local  eval/.env
```
- **172 unique `process.env.*` vars** referenced across app/ + lib/
- No validation layer — typos fail silently at runtime
- `.env.production.local` sets `NEXT_PUBLIC_BUILD_TARGET=api` (disables rewrites locally)
- Vercel has its own env set (17 days old, includes INVALID BKASH_* keys)
- **FIX (Phase 1):** single `lib/env.ts` (zod) + ONE `.env.example` + ONE `.env.local`

## 2. PRODUCT AUDIT vs 2026 SAAS STANDARD

### Platform features
| Feature | Status | Notes |
|---|---|---|
| Credits system | ✅ DONE | Customer.credits + CreditTransaction (schema drift on prod DB — ledger non-fatal) |
| API Keys | ✅ DONE | ApiKey model + /api/keys (cookie auth, rate limit, perms) |
| Referral (basic) | ✅ DONE | Referral model + /api/referral + /dashboard/referral |
| **Affiliate (20% recurring)** | ❌ MISSING | Need AffiliateCode/Commission models + tracking + dashboard |
| **Team workspaces** | ❌ MISSING | Organization model exists but no Team/TeamMember/invite flow |
| **User webhooks** | ❌ MISSING | Only inbound webhooks exist; no outbound job-completed hooks |
| Usage analytics chart | ⚠️ PARTIAL | /dashboard/analytics exists; needs Chart.js usage viz |
| Usage-based pricing | ⚠️ PARTIAL | Video deducts credits; chat/browser/game need verification |

### Per-product gaps
| Product | Missing vs 2026 leaders |
|---|---|
| VIDEO (core) | Templates marketplace, trending style presets (TikTok/Reels/Shorts), Pexels stock, ElevenLabs voice, auto-captions, bulk gen |
| HOSTING | SSL toggle, WAF status, malware scan, file manager, 99.9% uptime badge, NVMe tag, free-domain-yearly (HostArmada parity) |
| CHAT | History search, export, share link, system-prompt marketplace (128-model selector ✅) |
| BROWSER | AI agent tasks, session history, proxy selector |
| IDE | Real Docker provisioning (currently honest 503 beta), terminal WebSocket |
| GAMING | Daily rewards, leaderboard (GameBalance/GameSpin models ✅ exist) |
| OSSU | Certificate PDF generation, payment-gated unlock |

## 3. PAYMENT FLOW AUDIT (END-TO-END)
Current state after hardening:
- `/api/payment/create` → manual "send money" instructions (DB-backed, no fake URLs) ✅
- `/api/payment/verify` → DB lookup + real gateway query ✅
- `/api/payments/bkash/create` → REAL bKash tokenized API → **502: gateway says credentials invalid** (creds on Vercel are stale/wrong env)
- `/api/payments/nagad/create` → 503 PAYMENT_NOT_CONFIGURED (no creds) ✅ honest
- **BLOCKER: user has NO business docs → cannot get merchant credentials**
- **FIX (Phase 2):** Personal Send Money P2P flow — user sends Tk to personal number, submits TrxID, admin approves OR Android SMS-sync app auto-verifies

Missing pieces:
- ❌ PaymentVerification model (TrxID submissions)
- ❌ SmsLog model (incoming SMS from Android sync app)
- ❌ /api/payments/verify-manual
- ❌ /api/payments/sms-webhook
- ❌ Personal-number UI with QR + Bangla instructions
- ❌ Admin approve/reject queue for TrxID submissions

## 4. MARKETING ENGINE
- ❌ No TV station (Phase 4): RSS→AI video→RTMP multi-stream to YT/FB/Twitch
- ❌ No auto-social-posting of generated videos
- Existing assets: 27 videos in DB, ComfyUI + RTX 5060 UP, /api/social/post working

## 5. EXECUTION ORDER
1. **Phase 1** — env consolidation (unblocks everything, removes foot-guns)
2. **Phase 2** — personal payments (unblocks revenue — #1 business blocker)
3. **Phase 3** — affiliate + webhooks + teams + per-product 2026 features
4. **Phase 4** — 24/7 AI TV station (marketing engine)
5. **Phase 5** — verification + launch checklist
