# AUTH_SECURITY — hostamar.com

## Context

Authentication via NextAuth v4 (Credentials + GitHub + Google). JWT strategy, 30-day sessions. Authorization via RBAC (ADMIN/CUSTOMER). Security enforced at trust boundaries: bKash webhook HMAC verification, rate limiting, input validation.

**P4 Status: CLOSED** — `/models.json` 404 fixed (was @libsql/isomorphic-ws esbuild bug).
**P5 Status: IN PROGRESS** — f005 CDN Worker (B2 version) deployed, routes pending Zone permission.

## Task

Document auth flow, RBAC, rate limiting, bKash webhook security, and security audit references.

## Includes

### Auth Flow

1. User signs in via `/api/auth/callback/*` (NextAuth v4)
2. JWT issued, stored in cookie (`next-auth.session-token`)
3. Session maxAge: 30 days
4. Middleware protects `/dashboard`, `/admin`, `/api/admin/*`
5. Admin routes check `session.user.role === 'ADMIN'`

### RBAC Matrix

| Role | Can Access | Cannot Access |
|------|-----------|---------------|
| CUSTOMER | `/dashboard`, `/store`, `/tv`, `/api/credit/*` | `/admin/*`, `/api/admin/*` |
| ADMIN | All routes + `/admin/*` | None |
| PUBLIC | `/tv`, `/api/tv`, `/models.json`, `/api/auth/*` | Authenticated routes |

### Rate Limiting

- Cloudflare WAF: 100 req / 10s per IP (cap 10s)
- API routes: additional app-level rate limit via BullMQ queue
- Auth endpoints: 5 attempts / 15min per IP

### bKash Webhook Security

- HMAC-SHA256 signature verification on every webhook
- Webhook ID dedupe (idempotency key)
- Webhook events stored in `WebhookEvent` table
- Failed webhooks retried via BullMQ (max 3 retries)

### Security Audit References

- `security-audit.md` — quarterly audit checklist (in `/docs/security/`)
- NextAuth secret: `NEXTAUTH_SECRET` from Infisical, never committed
- bKash credentials: sandbox + production from Infisical
- B2 credentials: `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY` from Infisical
- All secrets: [REDACTED] in docs, real values in `/home/romel/automation/infisical.env` + Infisical

### Security Rules

- No API keys in client-side code
- All POST bodies validated with Zod
- SQL injection prevented by Prisma parameterized queries
- XSS: React auto-escapes, no `dangerouslySetInnerHTML` without sanitization
- CSRF: NextAuth handles via CSRF tokens on callbacks
- **B2 not R2**: All manifests and video assets on Backblaze B2 (f005/us-east-005), NOT Cloudflare R2
- **Infisical secrets**: ALL secrets in `/home/romel/automation/infisical.env` — NEVER commit

## Output

This document. Referenced by every auth/security change.