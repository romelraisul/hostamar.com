# Hostamar Governance — Bangladesh AI & Data Compliance (Zero Cost)

Scope: hostamar.com — AI services for Bangladeshi businesses.

## Applicable frameworks
| Framework | Status | Hostamar posture |
|---|---|---|
| National AI Policy 2024 (draft) | Social equity, transparency, human-in-the-loop, risk-based tiers | Human review kept for payments (>৳2999), AI outputs labeled, low-risk automation for content/support |
| Cyber Security Act 2023 | Active | HTTPS/TLS 1.3, HSTS preload, CSP, audit headers verified 2026-08-29 |
| Draft Personal Data Protection Act 2023 | Data localization, explicit consent, DPIA, right to forgotten, data portability | Customer PII (name/email/phone) stored in Neon Postgres (regional proximity + B2 US storage flagged below) |

## Key obligations & our controls
1. **Explicit consent** — signup collects only name/email/password; marketing consent box before any newsletter. (TODO: consent log table.)
2. **DPIA** — this repo audit (audit/) is the standing DPIA basis; re-run after major feature adds.
3. **Right to forgotten / portability** — customer deletion = Customer CASCADE (Prisma onDelete: Cascade across videos/notifications/orders). Export = JSON via /api/auth/me + admin export (roadmap).
4. **Data localization** — PII: Neon (regional). Files: B2 us-east-005 (US). ⚠️ GAP: move B2 customer files to a BD/regional-compatible store or document cross-border transfer consent at signup. **Action item.**
5. **Human-in-the-loop** — payments >known plan amounts and all refunds require admin approval at /admin/payments; agent auto-approve is capped at ৳599/৳1299/৳2999 with valid TrxID format.
6. **Enforcement risk** — fines up to millions of taka / service block; keep this doc + privacy/terms current.

## Enforcement bodies (reference)
ICT Division, NAICE (National Cyber Security Agency), Data Protection Board (pending), sector: Bangladesh Bank (payments), DGHS (health), a2i (public service).

## Payment handling (bKash personal 01822417463)
Manual TrxID verification — no card data ever touches our systems (no PCI scope). TrxID ^[A-Za-z0-9]{8,15}$ validated; auto-approve only exact plan amounts; everything else → human review queue.

## File inventory
- /privacy, /terms — legal pages (live, 200)
- lib/security.ts — prompt-injection filter, secret redaction
- middleware.ts — JWT-only identity injection
- audit/ — DPIA evidence
