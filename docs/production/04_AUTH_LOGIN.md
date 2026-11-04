# Hostamar.com — Auth & Login (sso_callback_failed fix)

**Last verified:** 2026-11-04 Asia/Dhaka  
**Status:** Custom JWT active, NextAuth stubbed (501), amber notice for SSO error

## Root Cause: `?error=sso_callback_failed`

**NextAuth is disabled in production worker.** The route `app/api/auth/[...nextauth]/route.ts` returns 501 "NextAuth disabled — custom JWT active". Any OAuth/SSO attempt hits this stub and redirects to `/login?error=sso_callback_failed`.

**Fix applied (2026-11-04):**
1. `app/login/page.tsx` reads `?error` via `useSearchParams()`
2. If `error === 'sso_callback_failed'` → shows amber notice: "Google/OAuth login not configured — use email/password (custom JWT active)"
3. Email/password form POSTs to `/api/auth/login` (custom JWT, sets HttpOnly cookie)
4. `middleware.ts` redirects to `/login?next=...` (not `?error=sso_callback_failed` infinitely)

## Custom JWT Flow

```
User submits email/password
        │
        ▼
POST /api/auth/login (app/api/auth/login/route.ts)
        │
        ▼ Rate limit: 10 attempts / 15 min per IP (slidingWindow)
        ▼ Validate email format, password length ≥ 6
        ▼
Turso edge client (libsql/client/web) → lib/auth-utils.ts
        │
        ▼ `verifyToken()` ultra-defensive: handles null, undefined, non-string, short tokens
        ▼ `signToken()` HS256 with `node:crypto`
        ▼
HttpOnly cookie: `auth_token=<jwt>; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`
        │
        ▼ Also returns JSON `{ token, user: { id, email, name, role } }` for CLI/Bearer use
        ▼
Redirect to `/dashboard` (or `/admin` for admin/superadmin roles)
```

## Key Files

| File | Purpose |
|------|---------|
| `app/api/auth/login/route.ts` | Custom login, rate-limited, Turso edge client |
| `app/api/auth/[...nextauth]/route.ts` | Returns 501 (NextAuth disabled) |
| `lib/auth-utils.ts` | `verifyToken()` (ultra-defensive), `signToken()` |
| `app/login/page.tsx` | UI: amber notice for `sso_callback_failed`, email/password form |
| `middleware.ts` | Redirects to `/login?next=...` (no infinite SSO error loop) |

## Verification Commands

```bash
# 1. SSO error shows amber notice
curl -s "https://hostamar.com/login?error=sso_callback_failed" | grep -i "google.*oauth\|custom jwt"

# 2. Custom login works
curl -X POST https://hostamar.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@hostamar.com","password":"password123"}' \
  -c /tmp/cookies.txt -v 2>&1 | grep -i "set-cookie\|auth_token"

# 3. NextAuth stub returns 501
curl -s https://hostamar.com/api/auth/signin
# Expected: 501 "NextAuth disabled"

# 4. Admin guard returns 401 without auth
curl -s -o /dev/null -w "%{http_code}\n" https://hostamar.com/api/admin/stats
# Expected: 401
```

## Known Constraints

- **No OAuth providers** (Google, GitHub, etc.) — intentionally disabled for zero-cost
- **MFA optional** — TOTP column exists in Customer table, gate in login route
- **Cookie is host-only** — no `Domain` attribute, works on `hostamar.com` (same-origin)
- **Rate limit:** 10 attempts / 15 min per IP (edge-enforced via `slidingWindow`)