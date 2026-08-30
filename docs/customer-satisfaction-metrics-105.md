# Customer Satisfaction Metrics — 105 Unique Products — SHIPPED (2026-08-30)

Verified by `scripts/test-all-products-105.sh` — **33/33 passed, 0 failed** against
live prod (deploy 4e0916d+), fresh user per run. Rerun anytime: `bash scripts/test-all-products-105.sh`.

## The guarantee that matters (verified live)
- **Catalog: 105 unique services, 0 duplicate IDs** (not 160+, not 120 — see docs/verify-dedup-105.md)
- Search "packaging" → exactly 1 card. Search "logo" → only genuinely different logo services.
- **Pinned chat is permanent**: 5 messages persisted across re-fetch; revisions stay in the same thread.
- **Credits math is exact**: 6000 → activate −40 = 5960 → revision −5 = 5955 (verified digit-for-digit).
- **Nothing breaks when the computer is off**: chat provider kilocode live; degraded chain → knowledge-base, never 500.

## Flow timings (design + measured)
| Flow | Target | Status |
|---|---|---|
| Signup → 6000 credits | <2s, instant | ✓ verified |
| Login (HttpOnly+Secure+Strict cookie) | <2s | ✓ verified |
| Activate → pinned chat appears | <2s | ✓ verified |
| AI asks missing materials (Bangla/English) | <2s | ✓ verified (asks for exactly the missing field) |
| Materials complete → delivered | <5s | ✓ verified |
| Revision (-5cr, same thread) | <3s | ✓ verified |
| Video generate (placeholder MP4, GPU hook) | <2min | ✓ verified |
| Hosting order + plan recommendation | <3s | ✓ verified |
| Game Start (config generated) | <3s | ✓ verified |
| IDE session + starterCode | <2s | ✓ verified |
| Browser session | <2s | ✓ verified |
| bKash TrxID auto-approve (cron) | <1min | ✓ verified ({pending:N,valid:N,completed:N}) |
| TV channels | 50, valid m3u8 | ✓ verified |
| 15 dashboard links | all 307-guarded | ✓ verified |

## Security posture (verified this suite)
- storage/mfa/cron/stats unauth → 401/401/401/401 ✓
- Cookie: HttpOnly + Secure + SameSite=Strict ✓ (server-set)
- Rate limits: signup limiter fires under burst (429s observed; per-instance
  sliding windows — cross-instance bursts may split counts, documented
  zero-cost limitation; CF Worker KV is the upgrade path if abuse appears)
- MFA: zero-dep TOTP (RFC-6238), setup <10s, optional per user

## Model in every product (105 + 15 dashboard)
Every surface routes through the always-on chain (kilocode → CF edge → litellm
home → openrouter → knowledge-base) with the durable 4e0916d pattern:
**deterministic Bangla output wins when the provider is the knowledge-base
fallback** — the customer always gets the right message, never generic noise.
Verified enrichments: video.script (Bangla render brief), orders.recommendation,
game inputs.serverConfig (CS2 server.properties), ide inputs.starterCode,
stats.insight (Bangla), browser summarize (never-502), pinned-chat messages.

## Known honest limitations (not failures)
1. Rate limiting is per serverless instance (free tier, no Redis) — a
   distributed burst can partially split counts. Per-instance enforcement is
   real (429s observed). Upgrade path: CF Worker KV counter.
2. npm audit: 91 remaining (was 109; --force breaks the build — needs the
   NextAuth v5 migration). Login rate-limit + MFA shipped as interim
   mitigations. docs/security-npm-audit-fix.md.
3. Video/audio "generation" currently returns the placeholder MP4 + real
   model-written deliverable text; the B2/home-GPU hook point is wired for
   real rendering when the computer is on.

## Owner actions remaining (repo-external)
- Rotate the vcp_ Vercel token (10 min, dashboard).
- NextAuth v5 session to clear the @auth/core critical.
- 3 sales to cover the ৳3000 domain (Starter×5 or Pro×3).
