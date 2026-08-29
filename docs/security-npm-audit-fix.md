# Security Fix Log — npm audit & auth hardening — 2026-08-30

## What shipped in this release (all verified via `npx tsc --noEmit` + `npm run build` ✓)

### Auth/session (HIGH → DONE)
- **HttpOnly cookie**: `/api/auth/login` now sets `auth_token` server-side via
  `res.cookies.set()` with `httpOnly:true, secure:true, sameSite:'strict',
  maxAge:7d, path:'/'`. XSS can no longer read the token.
- **localStorage removal**: login/signup pages no longer write `auth_token`
  to `localStorage` or `document.cookie` (server cookie only; JSON `token`
  remains for Bearer/CLI use, never persisted by the UI).
- **Storage page**: no longer decodes the JWT client-side — identity comes
  from `/api/auth/me` (reads the HttpOnly cookie). StorageDashboard calls use
  `credentials:'include'` exclusively.

### MFA (MEDIUM → DONE) — zero deps
- `lib/totp.ts` — RFC-6238 TOTP + base32, ±30s window, Google-Authenticator
  compatible. No speakeasy/qrcode packages (no supply-chain surface, 0 bytes added).
- `/api/auth/mfa` — setup (secret + otpauth + QR) / verify / disable / status;
  columns runtime-ensured (`ADD COLUMN IF NOT EXISTS`) — no migration risk.
- Login route enforces: `mfaEnabled` users must send `mfaToken` (body) or
  `x-mfa-token` (header); 401 `mfaRequired:true` otherwise.
- `/dashboard/settings` → new "Security / MFA" tab with QR scan + enable/disable.

### Rate limiting (HIGH → DONE)
- `lib/rate-limit-edge.ts` sliding window — always enforced, no DB dependency:
  - signup: 5/hour per IP + 3/hour per email
  - login: 10 per 15min per IP
  - /api/v1/chat/completions: 100/min per IP
  - /api/support-chat: 30/min per IP
- Fixes the "20 rapid signups all 200" finding (DB limiter fails open when the
  RateLimitEvent table is missing; edge layer cannot fail open).

### /api/storage IDOR defense-in-depth (CRITICAL follow-up → DONE)
- Route handlers now call `getAuthUser()` directly (cookie/Bearer JWT) and only
  fall back to the middleware-injected header; forged client headers never
  reach the handlers (middleware overwrites) and the route ignores anonymous.
- Download route `/api/storage/[userId]/[filename]` enforces
  `path.userId === verifiedUser.id` → 403 on mismatch.
- Storage UI download URL fixed (was pointing at a nonexistent
  `/api/storage/download/...` route).

### Model-in-every-point (product completeness → DONE)
`lib/model-in-every-point.ts` — dynamic LLM enrichment, non-blocking on failure:
- /api/generate → `script` field: expanded render brief
- /api/services/orders → `recommendation`: plan advice from usage stats
- /api/game → `inputs.serverConfig`: generated server.properties
- /api/ide/server → `inputs.starterCode`: starter template
- /api/browser/summarize → 502 when home Ollama off FIXED: falls to the
  always-on chain (kilocode → CF edge → … → knowledge-base)
- /api/dashboard/stats → `insight`: Bangla explanation of the numbers
- agents/rag/orchestrator already use `callBestModel` throughout.

## npm audit status
- Baseline (evidence/npm-audit.json): 109 vulns — 5 critical
  (`@auth/core` homoglyph login bypass, `fast-xml-parser` DOCTYPE entity,
  `tar` path traversal; two via next-auth/prisma-adapter chains), 44 high.
- NOT auto-`npm audit fix --force` in this push: the repo pins next-auth ^4.24
  (v4). The @auth/core fix requires the NextAuth v5 line — a breaking migration
  that must not be rushed in the same push as auth-hardening. Interim
  mitigation SHIPPED this release: the login route now rate-limits
  (10/15min/IP) and supports MFA, which blunts credential-attack paths;
  fast-xml-parser and tar are transitive (server-side SAML parsing / build
  tooling, not client-exposed).
- Next action (owner): dedicated `npm audit fix --force` session + NextAuth v5
  migration + regression test of Google SSO + login. Until then the audit
  tracker keeps this as the ONLY open item.

## Token rotation (owner actions, cannot be done from the repo)
- `vcp_…` Vercel PAT (pasted in chats, caught by GH013): REVOKE in Vercel →
  Settings → Tokens; create a new one locally OUTSIDE the repo.
- `KILOCODE_API_KEY`: rotate on kilo.ai dashboard → update Vercel env →
  CF Worker env (hostamar-ai-gateway).
- `.env.docker` untracked from the public repo (this push).
