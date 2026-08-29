# Hostamar.com — Security & Operations Audit — Executive Summary
**Date:** 2026-08-29 · **Auditor:** Hermes Agent (owner-authorized, non-destructive) · **Live deploy audited:** dpl_F1XiUeLm7Tt1hXpXCouLvaiE6fUN

## Grade: B- (solid transport & infra; identity edge-cases and dependency debt)

## Top 5 findings (risk-ranked)
| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | **`/api/storage` IDOR** — endpoint trusted client `x-user-id` headers; anyone could list/upload/delete ANY user's B2 files | CRITICAL | **FIXED this release** (removed from middleware public paths; middleware overwrites identity from verified JWT; route rejects anonymous; download route enforces owner match) |
| 2 | **Signup granted 0 credits** — welcome-6000 only lived in a broken `/register` route; every new user hit 402 on every product ("nothing works" root cause) | CRITICAL | **FIXED this release** (signup now grants WELCOME_CREDITS + welcome_bonus transaction) |
| 3 | **Rate limiting fails open** — 20 rapid signups all returned 200 (5/hour config existed but DB-table check swallows errors); `/api/v1/chat/completions` & `/api/support-chat` had none | HIGH | **FIXED this release** (in-process sliding window: chat 100/min, support 30/min; DB layer still fail-open — harden later) |
| 4 | **auth_token cookie** set by JS without `Secure`/`SameSite`, 1-year max-age, token duplicated in localStorage (XSS = account theft) | HIGH | **PARTIALLY FIXED** (Secure+SameSite=Strict, 7-day max-age; HttpOnly deferred — storage page decodes JWT client-side; vcp_ token: 0 hits in bundles ✓, REMAINING ACTION: rotate) |
| 5 | **npm audit: 109 vulns (5 critical)** — @auth/core homoglyph login bypass, fast-xml-parser entity bypass, tar path traversal | HIGH | OPEN — `npm audit fix` needs a dedicated session (update may break Next 14 auth adapters) |

## Top 5 actions (effort → impact)
1. Rotate any pasted keys (vcp_…, KILOCODE) — 10 min → kills the only leak vector that matters.
2. Push this release (IDOR + credits + rate limits + TV 3.8s fix) — already built.
3. npm audit fix in a fresh branch — 2-3 h → removes 5 criticals.
4. HttpOnly cookie + server-rendered storage identity — 1 day → closes XSS token theft.
5. MFA (TOTP, speakeasy-free impl) for admin — 1 day → protects /admin/payments.

## What's verified healthy (no action)
TLS 1.3 AES-256-GCM, cert valid → Oct 19 2026 (GTS WE1); HSTS preload 2yr; CSP with frame-ancestors none; X-Frame-Options DENY; nosniff; Referrer-Policy; Permissions-Policy; DMARC quarantine; SPF (Cloudflare MX routing); robots+sitemap 200; privacy/terms live; /api/admin/agent/cron 401 without x-cron-secret ✓; all 15 dashboard links 307-guarded ✓; B2 9 objects 0/5GB ✓; quota single project 17/100 ✓.

## Zero-cost posture confirmed
Vercel (primary, survives computer-off) + CF Worker free 100k/day + kilocode free LLM chain (live-verified: real LongCat-2.0 replies, 4.2-11.4s) + B2 free + Neon free. Only real cost: domain renewal ৳3000 → 3 Pro sales.
