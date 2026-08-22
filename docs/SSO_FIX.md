# SSO Fix — 2026-08-23

## Symptom
"SSO signup/login broken" reported after the TV ever-fresh work.

## Phase 0 reproduction — what was ACTUALLY broken
| check | result |
|---|---|
| GET /api/auth/providers | **200** JSON (credentials provider listed) |
| POST /api/auth/signup (email+password) | **200**, Customer row created in Neon |
| POST /api/auth/login (custom JWT) | **200**, token issued; /api/auth/me 200 with cookie |
| NextAuth credentials signin flow | **200**, session returns user |
| GET /api/auth/sso/start | **302 → Google** — but `redirect_uri=http://localhost:3000/api/auth/sso/callback` ❌ |

Email/password auth was NEVER broken. The only real failure: **Google/SSO OAuth**
— Google rejects the `localhost:3000` redirect_uri (not whitelisted), so the
consent screen errors out after account selection.

## Root cause
`app/api/auth/sso/start/route.ts`:
```ts
const appUrl = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
```
`NEXT_PUBLIC_SITE_URL` was NOT set in Vercel production envs (61 envs present;
this one missing; it existed only in local `.env.local`). The TV work did not
touch auth — this env had simply never been added to Vercel. Callback route
already defaulted correctly (`|| "https://hostamar.com"`), which is why the
callback side would have worked if the start URL had pointed at prod.

## Fix
1. `vercel env add NEXT_PUBLIC_SITE_URL production` = `https://hostamar.com`.
   - Gotcha #1: piping the value via heredoc (`echo "y\nurl\ny" |`) stored a
     literal `"y\nhttps://hostamar.com\ny"` string → redirect_uri became
     garbage (`y%0Ahttps%3A...`). Removed and re-added with
     `printf 'https://hostamar.com' | vercel env add ...`.
   - Gotcha #2: `vercel env pull` shows sensitive/new envs as empty strings —
     that is masking, not data loss. Verify via runtime behavior, not pull output.
2. Redeployed via empty commit to main.

## Verification (post-fix, on https://hostamar.com)
- `/api/auth/sso/start` Location header now:
  `redirect_uri=https%3A%2F%2Fhostamar.com%2Fapi%2Fauth%2Fsso%2Fcallback` ✅
- providers 200 / signup 200 / login 200 / me 200 ✅
- Google Cloud Console must still whitelist
  `https://hostamar.com/api/auth/sso/callback` for client
  `1095914482867-otvnb168acfpt06thm118roip6bcssfp` (it previously could only
  have localhost whitelisted — add the prod URI there if consent still fails).

## Ruled out (audited, all healthy)
- Env: DATABASE_URL (Neon), NEXTAUTH_URL, NEXTAUTH_SECRET, JWT_SECRET all set
  on Vercel; no LOCAL_DATABASE_URL leakage into Vercel.
- Prisma: single schema (no tv-local split exists); auth routes import
  `@/lib/prisma` only; zero `prismaLocal` references in app/api/auth.
- Neon: Customer table alive, 56 rows; signup inserts confirmed.
- Middleware: `/api/auth/*` public-listed; no JWT verify loop.

## TV regression check (untouched)
6 running + 2 exited(=podman infra) units, tv HLS 200, isLive:true,
watermark/gender/ever-fresh intact.
