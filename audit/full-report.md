# Hostamar.com — Full Audit Report (Non-Destructive)
**2026-08-29 · Deploy dpl_F1XiUeLm7Tt1hXpXCouLvaiE6fUN · Evidence:** `audit/evidence/`

## 1. Critical findings

### C1. /api/storage IDOR — fixed this release
- **Evidence:** `security-probes.txt` — `curl /api/storage -H "x-user-id: anyuser"` → 200 with quota listing; route code (pre-fix) read `request.headers.get('x-user-id')` with no verification; middleware publicApiPaths included `/api/storage`.
- **Reproduction (was):** forge `x-user-id: victim-id` → list victim files (`customers/{victim}/` prefix), upload over their objects, delete `?filename=`.
- **Fix shipped:** (a) removed `/api/storage` from `middleware.ts` publicApiPaths; (b) middleware overwrites `x-user-id`/`x-user-email` from verified JWT before route handlers run; (c) `app/api/storage/route.ts` GET/POST/DELETE now reject `anonymous` (401); (d) `app/api/storage/[userId]/[filename]/route.ts` (download) enforces path-user == verified-user (403 mismatch); (e) storage-dashboard UI switched to `credentials:'include'` (no client identity headers). Client-forged headers can no longer select a victim.

### C2. Signup granted 0 welcome credits — fixed this release
- **Evidence:** live `POST /api/auth/register` → 500 `"রেজিস্ট্রেশনে সমস্যা হয়েছে"`; live `/api/auth/signup` → 200 but `credits` omitted from `customer.create` (audit test user `audit-fn-test-002` showed `creditsBalance: 0`); CreditTransaction required for welcome only existed in broken register route.
- **Impact:** every new customer → 402 INSUFFICIENT_CREDITS on chat/generate/game/ide/browser = "dashboard links don't work" reports.
- **Fix shipped:** signup creates customer with `credits: WELCOME_CREDITS` (6000) + nested `creditTransactions.create` welcome_bonus row (balanceAfter 6000).

### C3. vcp_… token exposure (owner-reported pasted 4× in chat history)
- **Verified:** 0 hits in live HTML, 5 main JS chunks, tracked repo files; `.env.prod` in repo has EMPTY values ✓; `.env.docker` tracked with local-dev DATABASE_URL + placeholder KILOCODE key (13 chars) — moderate.
- **Action:** ROTATE the token anyway (paste-hygiene), and untrack `.env.docker` from the public repo (git rm --cached + .gitignore). Not code-blocking; owner action.

## 2. High findings

### H1. Rate limiting fails open — partially fixed this release
- **Evidence:** 20 sequential `POST /api/auth/signup` in one burst → all 200 (limit was 5/hour). Root: `checkRateLimit` catch-path returns `allowed:true` when the `RateLimitEvent` table is missing (fail-open by design comment).
- **Fix shipped:** in-process sliding-window limiter (lib/rate-limit-edge.ts) applied to `/api/v1/chat/completions` (100/min/IP) and `/api/support-chat` (30/min/IP). Auth routes still rely on the DB limiter → **remaining:** create RateLimitEvent table via ensure-schema or accept Vercel-concurrency-bounded risk.

### H2. auth_token cookie hardening — partially fixed
- **Evidence (was):** `document.cookie = auth_token=…;path=/;max-age=31536000` (no Secure/SameSite; 1yr) + localStorage copy. Login page line 56.
- **Fix shipped:** `Secure; SameSite=Strict; max-age=604800` (7d) on both login & signup; comment documents why HttpOnly is deferred (storage-dashboard decodes JWT client-side for user-scoped download URLs — full fix needs server-side identity in download links).

### H3. Dependency vulnerabilities (109: 5 critical, 44 high)
- **Evidence:** `evidence/npm-audit.json`. Criticals: `@auth/core` homoglyph Unicode-normalization login bypass; `fast-xml-parser` DOCTYPE entity regex injection; `tar` hardlink path traversal (via next-auth/prisma-adapter chains).
- **Remediation:** `npm audit fix` non-breaking subset first; then targeted `@auth/core` ≥ patched minor. Budget 2-3h + regression test of Google SSO + login. NOT auto-run this session (Next 14 pin, breaking risk before a push).

### H4. No MFA on admin accounts
- romelraisul@gmail.com role=admin (bootstrap-admin path). /admin/payments approves real money movement.
- **Remediation:** TOTP (free, no dep — implement HOTP/RFC-6238 in ~60 lines) on admin role logins; break-glass code in Vercel env.

## 3. Medium findings
- **M1. TV stable-channels 3.8s** — 4× `CREATE TABLE IF NOT EXISTS` DDL per request. Fixed this release: once-per-instance guard (`ensureSchemaOnce`). Cache header s-maxage=60 present but Vercel normalizes to `max-age=60`, cf-cache-status DYNAMIC — acceptable; re-measure post-deploy.
- **M2. No analytics/consent** — 0 hits for GA/gtm/speed-insights in live HTML; no cookie-consent banner (CSP does block nothing here; first-party only). Remediation: add @vercel/analytics + speed-insights (free, no consent needed for first-party aggregate) + a dismissible banner for localStorage prefs. Roadmap item.
- **M3. Public AI endpoints cost surface** — /api/v1/chat/completions is public (by design for OPENAI_BASE_URL customers); rate limit now shipped; consider requiring key ≥ free tier quota.
- **M4. .env.docker tracked in PUBLIC repo** — contains local-dev DATABASE_URL (hostamar@localhost) + placeholder keys. Untrack.
- **M5. Session cookie lacks `Secure` on any legacy 1yr tokens** — existing users keep old cookie until re-login; deploy note: force re-login after push (or accept 7d decay).

## 4. Low findings
- L1. `/api/auth/register` (legacy) 500s — dead duplicate of signup; retire it (301 → signup) later.
- L2. `/dashboard/storage` decodes JWT in JS for userId — works but is the HttpOnly blocker; refactor.
- L3. Storage download UI pointed at nonexistent `/api/storage/download/...` — fixed to real route this session.
- L4. Support-chat needs 9.8s worst case (kb RAG + Ollama when home ON) — acceptable; AI-fallback path is faster.
- L5. crt.sh scrape returned non-JSON (rate-limit) — subdomain census via DNS instead: ai→Vercel CNAME, s3/www→Cloudflare proxied, apex A 104.21.33.14/172.67.139.164 (CF).

## 5. Infrastructure inventory (evidence: dns-records.txt, headers-home.txt)
- **DNS (Cloudflare, NS maeve/rodney):** apex A 104.21.33.14 + 172.67.139.164 (proxied), AAAA 2606:4700:3030::ac43:8ba4/…:210e; TXT SPF `v=spf1 include:_spf.mx.cloudflare.net ~all`; MX 10 route1.mx.cloudflare.net / 20 route2; DMARC `p=quarantine; rua=mailto:dmarc@hostamar.com; ruf; fo=1; pct=100`; ai.hostamar.com → cname.vercel-dns.com.
- **TLS:** TLSv1.3, TLS_AES_256_GCM_SHA384, cert CN=hostamar.com (issuer Google Trust Services WE1), valid 2026-07-21 → 2026-10-19. HSTS preload 2yr.
- **Headers (all verified live):** CSP (self + jsdelivr script + google fonts style/font; frame-ancestors none), X-Frame-Options DENY, nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera/mic/geo off, X-XSS-Protection, report-to CF NEL.
- **Hosting:** Vercel single project hostamar-build (17/100 deploys today), edge nodes bom1/iad1/sin1 observed. CDN: Cloudflare (DYNAMIC for HTML, HIT paths for statics). Storage: B2 us-east-005 hostamar-prod (9 objects, 0/5GB). DB: Neon (104 customers, connected=true). CI/CD: git push only (CLI --prod BANNED by ops rule).
- **Caching:** og-image immutable 86400 ✓, /api/v1/models s-maxage 300 ✓, /api/services/catalog 300 ✓, /api/health 30 ✓, fonts immutable ✓.

## 6. Performance (live, from BD edge)
- / 759ms TTFB-incl-Cloudflare · /dashboard 307 in 153ms · og-image warm 560ms · /api/health 797ms · /api/tv/stable-channels 3.86s (→ fixed, re-measure) · /api/storage 727ms · v1-chat 11.4s cold (LongCat reasoning, max_tokens 600) · support-chat 1.6s.
- Core Web Vitals risk: LCP likely fine (hero text-based); og-image 102KB 1200×630 ✓ English-safe OCR-verified ✓.

## 7. SEO
- robots.txt content-signal format ✓; sitemap.xml 200; canonical + hreflang bn-BD/en-US; JSON-LD WebSite+Product+FAQ (2 ld+json blocks); og/twitter cards complete. Gap: no IndexNow key yet; no GSC/Bing submission evidence.

## 8. UX & Accessibility
- Bangla-first UI (Hind Siliguri); keyboard nav untested systematically; labels present in new forms; contrast unverified (WCAG audit pending).
- Onboarding friction FIXED this release: 15 links were shells → now wired end-to-end (signup→6000cr→chat/generate/game/ide/browser real actions).

## 9. Privacy & compliance
- Privacy/terms live. GDPR/CCPA-style rights partially implemented (deletion via Prisma cascade; export partial). Bangladesh PDPA-draft: localization gap documented in docs/governance.md (B2 us-east-005 stores customer files). bKash manual TrxID — no PCI scope.

## 10. Business analysis
- Pricing Starter ৳599 / Pro ৳1299 / Business ৳2999 vs InVideo $17/mo, Veed $12/mo — compelling local play (bKash, Bangla, free 6000cr).
- Conversion path now complete: signup (6000cr) → free product use → credit exhaustion → bKash top-up → auto-approve (valid TrxID + plan amount) → +6000cr. Domain ৳3000 ≈ 3 Pro sales.
- Gap: no analytics on the funnel (see M2), no email capture beyond signup.

## 11. Security appendix — verified live (evidence/security-probes.txt)
- Admin cron guard: no secret → 401 ✓; correct secret → 200 daily-health (health ok b2Count, db customers 105).
- /api/dashboard/stats: unauth → 401 "Not authenticated" ✓; forged Bearer (wrong secret) → 401 "Invalid token" ✓; `?userId=` param ignored (server derives identity) ✓ — no IDOR.
- Unauth POST /api/game, /api/browser/sessions, /api/generate → 401 ✓.
- CORS preflight on /api/v1/chat/completions from evil origin → 204 with no Access-Control-Allow-Origin (no CORS echo) ✓.
- /api/storage (post-fix pending deploy) currently still public until push — fix ships with this release.

## 12. Prioritized action plan
See `action-plan.csv`.
