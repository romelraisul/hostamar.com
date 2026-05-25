# Hostamar — Full Project Implementation Plan

> **Project**: hostamar.com — AI Video SaaS (Next.js 14, Prisma, Neon PostgreSQL, Vercel)
> **Status**: LIVE with 37 pages, 42 API routes, 9 registered customers
> **Scope**: Fix existing issues → Complete core features → Ship production-ready

## Priority Legend
🔴 **P0 — CRITICAL** | 🟡 **P1 — HIGH** | 🟢 **P2 — MEDIUM** | ⚪ **P3 — NICE TO HAVE**

---

## PHASE 1: 🚑 CRITICAL FIXES (P0)

### 🔴 Fix 1: Local Dev Environment (WSL)

**Problem**: `dev server.log` shows SWC binary crash on WSL. `next dev` fails because win32-x64-msvc binary can't load from Windows node_modules.

**Fix**: Regenerate node_modules from WSL native Linux environment.

```bash
cd /mnt/c/Users/romel/hostamar-local
rm -rf node_modules .next
npm install
npx prisma generate
npx next build
```

If SWC still fails, add to next.config.js:
```js
experimental: {
  swcTrace: true,
}
```
Or switch to the WASM fallback by setting env: `NEXT_USE_SWC=0`

**Verify**:
```bash
npx next dev -p 3000
# Should see "Ready in Xms" without SWC error
```

---

### 🔴 Fix 2: Prisma Client — Generate & Verify

**Problem**: Local prisma client missing. DB migrations may be out of sync.

**Fix**:
```bash
cd /mnt/c/Users/romel/hostamar-local
npx prisma generate
npx prisma db push  # sync schema without migration history issues
```

**Verify**:
```bash
curl http://localhost:3000/api/health
# Should show database: { connected: true }
```

---

### 🔴 Fix 3: NEXTAUTH_SECRET — Set in Vercel Env

**Problem**: `auth-config.ts` reads `process.env.NEXTAUTH_SECRET` — if missing, sessions may fail unpredictably in production.

**Fix**: Generate and set a strong secret:
```bash
# Generate
openssl rand -base64 32
# Set in Vercel
npx vercel env add NEXTAUTH_SECRET production
npx vercel env add JWT_SECRET production
```

**Verify**: After redeploy, login should generate stable sessions.

---

### 🔴 Fix 4: Middleware — Enable Auth Protection

**Problem**: `middleware.ts` has `matcher: []` — it's a no-op. Dashboard and protected routes have no middleware guard.

**Fix**: Update middleware to protect `/dashboard`, `/admin`, `/api/dashboard/*` routes:

```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // Public paths that don't need auth
  const publicPaths = ['/', '/login', '/signup', '/api/auth/login', '/api/auth/register', '/api/health', '/pricing', '/about', '/contact']
  
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // API routes need token validation
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Page routes need token
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!token || !verifyToken(token)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|opengraph-image).*)']
}
```

---

### 🔴 Fix 5: Footer Flag & Links

**Problem**: Footer shows Argentina flag 🇦🇷 instead of Bangladesh 🇧🇩. Company/Blog/Careers/Contact links point to `"#"`.

**Fix** (`app/page.tsx`):
- Replace `🇦🇷` with `🇧🇩`
- Point Company links to actual pages (/about, /blog, /contact)
- Remove Careers link (no careers page exists)

---

## PHASE 2: 🛠 CORE FEATURES (P1)

### 🟡 Task 1: Route Cleanup — Remove Pages Router

**Files to remove**:
```
src/pages/api/health.ts        → replaced by app/api/health/route.ts
src/pages/api/payment/*.js     → replaced by app/api/payment/*/route.ts
src/pages/api/payment/*.ts     → replaced (same)
```

**Fix**:
```bash
rm -rf src/pages/
```

**Verify**: 
```bash
curl https://hostamar.com/api/health
# Should still return 200
curl https://hostamar.com/api/payment/create  
# Should return 200 or proper error, not 404
```

---

### 🟡 Task 2: Video Generation Engine — Implement MVP

**Current**: Placeholder/mockup. Studio interface shows static "Select template → Customize → Export"

**Implementation**:
1. Create `lib/video-generator.ts` — real engine that:
   - Takes: script text, template ID, language (en/bn)
   - Generates: a video URL or returns a processing job ID
   - Uses: FFmpeg or cloud API (consider Shotstack, Remotion, or local FFmpeg)

2. Create API `app/api/videos/generate/route.ts`:
   - POST: `{ script, template, language }` 
   - Returns: `{ jobId, status: "processing" }`
   - Stores job in DB via Prisma

3. Update `app/dashboard/videos/page.tsx`:
   - Real video list from DB
   - Generation form
   - Status polling

**Key files**:
- Create: `lib/video-engine.ts`
- Modify: `app/api/videos/generate/route.ts`
- Modify: `app/dashboard/videos/page.tsx`
- Modify: Prisma schema if needed for video jobs

---

### 🟡 Task 3: Payment Integration — End-to-End

**Current**: Payment API routes exist but need real gateway integration.

**Sub-tasks**:
1. bKash integration — verify callback, payment verification endpoint
2. Nagad integration — same pattern
3. Crypto (USDT/TRC20) — wallet address display + manual verify
4. Webhook handler — update subscription status on payment confirm

**Key files**:
- Modify: `app/api/payment/create/route.ts`
- Modify: `app/api/payment/webhook/route.ts`
- Modify: `app/api/payment/verify/route.ts`
- Modify: `lib/email.ts` — send payment confirmation emails

---

### 🟡 Task 4: Dashboard Completion

**Current**: Dashboard fetches `/api/dashboard/stats` and renders stats cards.

**Missing**:
- Real video creation UI (uses mockup)
- Service management (create, stop, restart VPS)
- Payment history

**Implementation**:
1. Build real video creation form with script input, template picker, language selector
2. Add video list with status badges (processing/ready/failed)
3. Add service panel showing active VPS/services with management controls
4. Add payment history table

---

## PHASE 3: 🎯 LAUNCH READY (P1-P2)

### 🟡 Task 5: TypeScript Quality Gate

**Current**: `typescript.ignoreBuildErrors: true` hides all TS errors.

**Fix**:
1. Remove `typescript.ignoreBuildErrors` from next.config.js (or set to false)
2. Run: `npx tsc --noEmit --strictNullChecks --skipLibCheck`
3. Fix all errors at the P0/P1 level
4. Re-enable only critical paths if needed (use `// @ts-ignore` sparingly)

**Pattern for common fixes**:
```ts
// Before (causes null errors)
const user = await prisma.customer.findUnique(...)
return user.name  // TS error: user could be null

// After
const user = await prisma.customer.findUnique(...)
if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
return user.name
```

---

### 🟡 Task 6: Error Handling & UX

**Current**: Pages have basic error handlers.

**Needs**:
- Global error boundary (`app/error.tsx`) — styled nicely, already exists
- Loading skeletons for dashboard
- Toast notifications for actions (video generation, payment)
- 404 page (`app/not-found.tsx`) — already exists, check styling

**Verify**: 
- Navigate to `/does-not-exist` → see styled 404
- Trigger API error → see toast/alert

---

### 🟢 Task 7: Email & Notifications

**Current**: `lib/email.ts` exists but SMTP settings incomplete (WHATSAPP_PHONE_ID empty in .env.local).

**Fix**:
1. Complete SMTP config with working credentials
2. Wire up: welcome email on signup, payment receipt, video ready notification
3. Test: `curl -X POST https://hostamar.com/api/email/test`

---

## PHASE 4: 🚀 SCALE (P2-P3)

### 🟢 Task 8: SEO & Content Pages

- `/about/page.tsx` — fill with real company info
- `/blog/page.tsx` — implement blog listing
- `/contact/page.tsx` — add contact form
- `/privacy/page.tsx` — add real privacy policy
- `/terms/page.tsx` — add real terms of service

---

### 🟢 Task 9: OSSU Academy

**Current**: Full OSSU structure exists (courses, curriculum, projects, quizzes, certificates) but content is JSON data files.

**Needs**:
- Populate `data/ossu-curriculum.json` with real CS curriculum
- Create demo quizzes
- Build certificate generator

---

### ⚪ Task 10: Performance & Monitoring

- Lighthouse audit (< 90 on mobile = fix)
- Add `/app/monitor/page.tsx` content (currently exists but may be empty)
- Set up uptime monitoring (cron job)
- Add rate limiting logs review

---

### ⚪ Task 11: Analytics Dashboard

**Current**: CRM analytics, page tracking pipeline exists (`lib/analytics.ts`, `data/analytics/`).

**Needs**:
- Real user-facing analytics charts
- Video performance metrics
- Conversion tracking

---

## PHASE 5: 🏗 INFRASTRUCTURE (P2)

### 🟢 Task 12: GitHub Setup

**Current**: No git remote configured.

```bash
cd /mnt/c/Users/romel/hostamar-local
git init
git add -A
git commit -m "init: Hostamar platform v1"
gh repo create hostamar --private --push
```

---

### 🟢 Task 13: Camofox Browser Automation

**Current**: Camofox engine installed at `/home/romelraisul/hostamar-local/camofox/` but not running.

**Fix** (if marketing automation is needed):
```bash
export PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH"
cd /home/romelraisul/hostamar-local/camofox/
node server.js &
```

**Verify**: `curl http://[::1]:9377/health`

---

## EXECUTION ORDER

```
PHASE 1 (P0) — Do first, ship today:
  Fix 1 → Fix 2 → Fix 3 → Fix 4 → Fix 5

PHASE 2 (P1) — Core features, ship this week:
  Task 1 → Task 2 → Task 3 → Task 4

PHASE 3 (P1-P2) — Quality, ship this sprint:
  Task 5 → Task 6 → Task 7

PHASE 4 (P2-P3) — Growth, ship next sprint:
  Task 8 → Task 9 → Task 10 → Task 11

PHASE 5 (P2) — Infra:
  Task 12 → Task 13
```

---

## VERIFICATION CHECKLIST

- [ ] `https://hostamar.com/api/health` → `{"status":"healthy","database":{"connected":true}}`
- [ ] Login at `/login` → works with registered credentials
- [ ] Signup at `/signup` → creates new account
- [ ] Dashboard at `/dashboard` → shows stats after login
- [ ] Footer → Bangladesh flag 🇧🇩, working links
- [ ] `npx tsc --noEmit --strictNullChecks --skipLibCheck` → zero errors
- [ ] `npx next build` → succeeds
- [ ] Unauthenticated access to `/dashboard` → redirects to `/login`
- [ ] Video generation API → returns job ID
- [ ] Payment API → processes bKash/Nagad/Crypto
- [ ] Email → sends welcome on signup
