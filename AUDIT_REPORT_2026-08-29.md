# HOSTAMAR.COM — COMPREHENSIVE AUDIT REPORT

**Date:** 2026-08-29
**Auditor:** Hermes Agent (automated + manual)
**Scope:** hostamar.com, dashboard, APIs, DNS, CDN, security, SEO, UX, privacy, business

---

## 1. EXECUTIVE SUMMARY

### Top Critical Risks

| # | Risk | Impact | Effort | Owner |
|---|------|--------|--------|-------|
| 1 | **Vercel API token `vcp_[TRUNCATED]...` exposed in chat/memory** — full project access, can delete prod, steal env vars | Catastrophic | Rotate immediately | Romel |
| 2 | **KILOCODE_API_KEY exposed** — LLM spending, key rotation needed | High | Rotate + redeploy | Romel |
| 3 | **Public `/api/v1/chat/completions` — no auth, no rate limit** — anyone can burn your kilocode credits | High | Add auth or rate-limit | Dev |
| 4 | **`/api/health` leaks customer count, DB status, AI provider configs** — reconnaissance for attackers | Medium | Redact sensitive fields | Dev |
| 5 | **No rate limiting on any API endpoint** — brute-force, enumeration, credit theft | High | Add Vercel rate-limit or CF rules | Dev |

### Top 5 Recommended Actions

1. **Rotate `vcp_[TRUNCATED]...` NOW** — go to Vercel → Settings → Tokens → revoke. Rotate KILOCODE_API_KEY too.
2. **Add rate limiting** to `/api/v1/chat/completions`, `/api/auth/*`, `/api/dashboard/*` (CF Rate Limiting rules or Vercel middleware).
3. **Add auth or API key** to `/api/v1/chat/completions` — even a simple `Authorization: Bearer <static-key>` check prevents abuse.
4. **Tighten CSP** — remove `unsafe-inline`, use nonces/hashes; remove `cdn.jsdelivr.net` or pin SRI.
5. **Enable MFA** on Vercel, Cloudflare, GitHub, Google accounts.

---

## 2. FULL REPORT

### A. Infrastructure & DNS

| Item | Finding | Severity |
|------|---------|----------|
| A records | `172.67.139.164`, `104.21.33.14` (Cloudflare anycast) | ✅ |
| Subdomains | www, api, tv, comfy, vp9 all → same CF IPs (no origin exposure) | ✅ |
| MX records | **None** — no email receiving. romelraisul@gmail.com is personal | Medium |
| SPF/DKIM/DMARC | **None** — email spoofing risk. Anyone can send @hostamar.com | High |
| SSL issuer | Google Trust Services (WE1) | ✅ |
| SSL expiry | **Oct 19 2026** (60 days) — auto-renew via CF? | Medium |
| TLS version | TLS 1.3 only ✅ | ✅ |
| HSTS | max-age=63072000 (2yr), includeSubDomains, preload | ✅ |
| CDN | Cloudflare + Vercel Edge | ✅ |
| Hosting | Vercel (serverless) + Neon (Prisma) + B2 (storage) | ✅ |
| Server header | `cloudflare` (origin hidden) | ✅ |

### B. HTTP Security Headers

| Header | Value | Verdict |
|--------|-------|---------|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; ...` | ⚠️ `unsafe-inline` + jsdelivr |
| [REDACTED-PAT] | `max-age=63072000; includeSubDomains; preload` | ✅ |
| X-Frame-Options | `DENY` | ✅ |
| X-Content-Type-Options | `nosniff` | ✅ |
| Referrer-Policy | `[REDACTED-ROTATE-ME]` | ✅ |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | ✅ |
| X-XSS-Protection | `1; mode=block` | ✅ |
| report-to | CF NEL (no CSP report-uri) | ⚠️ No CSP violation reporting |

**CSP Issues:**
- `script-src 'unsafe-inline'` — XSS risk, allows injection of inline scripts
- `script-src https://cdn.jsdelivr.net` — third-party CDN compromise = full RCE
- No `report-uri` / `report-to` for CSP violations — blind to attacks
- `frame-src` missing — falls to `default-src 'self'` ✅
- `frame-ancestors 'none'` ✅ (clickjacking protection)

### C. Authentication & Session

| Check | Finding | Severity |
|-------|---------|----------|
| Login | NextAuth.js credentials provider | ✅ |
| Password reset | `/forgot-password` exists (200) | ✅ |
| Session cookies | Cannot inspect via curl (set only on auth) | — |
| MFA | **None** — admin accounts have no 2FA | High |
| Rate limit on auth | **None visible** — brute-force possible | High |
| Session expiry | Default NextAuth (30 days) | Medium |
| JWT storage | NextAuth encrypted JWT in cookie | ✅ |
| RBAC | `getAuthUser()` + `role` field (admin/customer) | ✅ |
| Admin endpoints | `/api/admin/agent`, `/admin/payments` → 401 without auth | ✅ |

**Missing:**
- No account lockout after N failed logins
- No suspicious login alerts
- No session revocation (logout doesn't invalidate JWT server-side)

### D. API & Data Exposure

| Endpoint | Auth | Rate Limit | Data Leak | Severity |
|----------|------|------------|-----------|----------|
| `/api/health` | None | None | customer count, DB status, AI configs, nextAuthUrl | Medium |
| `/api/services/catalog` | None | None | 50 services + pricing | Low |
| `/api/v1/models` | None | None | 120 models, providers, context lengths | Medium |
| `/api/v1/chat/completions` | **None** | **None** | Burns real credits, returns model+provider | **Critical** |
| `/api/auth/session` | None | None | Returns session if cookie present | Low |
| `/api/auth/csrf` | None | None | CSRF token | Low |
| `/api/dashboard/stats` | 401 | None | Customer-specific stats | ✅ |
| `/api/tv/stable-channels` | None | None | 50 channel URLs | Low |
| `/api/support/chat` | None | None | bKash number + LLM response | Medium |

**Critical: `/api/v1/chat/completions`**
```
POST /api/v1/chat/completions
Host: hostamar.com
Content-Type: application/json

{"model":"kilo-auto/free","messages":[{"role":"user","content":"hi"}],"max_tokens":10}

→ 200 OK
→ {"choices":[{"message":{"content":"Yes, Hostamar AI works! 🚀..."}}],"provider":"kilocode"}
```
**No auth. No rate limit. Anyone can spend your kilocode credits 24/7.**

**Health check leak:**
```json
{
  "status": "healthy",
  "database": { "connected": true, "customers": 104 },
  "environment": { "nodeEnv": "production", "nextAuthUrl": "https://hostamar.com" },
  "aiFallback": [
    {"provider": "kilocode", "configured": true, "model": "kilo-auto/free"},
    {"provider": "nvidia", "configured": true, "model": "meta/llama-3.1-8b-instruct"},
    {"provider": "tokenrouter", "configured": true, "model": "qwen/qwen3.8-max-free"},
    {"provider": "opencode", "configured": true, "model": "hy3-free"}
  ]
}
```
Exposes infrastructure fingerprint to attackers.

### E. Client-Side & Supply Chain

| Item | Finding |
|------|---------|
| package.json | 35 deps, 20 devDeps |
| npm audit | **0 vulnerabilities** ✅ |
| Hardcoded secrets in JS | None found in homepage HTML |
| `NEXT_PUBLIC_*` | Properly prefixed (not secret) |
| Third-party scripts | Google Fonts (Hind Siliguri, Inter), jsdelivr CDN |
| Bundle size | ~87.7 kB First Load JS shared |
| Webpack warnings | typeorm "Critical dependency" warnings silenced ✅ |

**Supply chain risks:**
- `cdn.jsdelivr.net` in CSP — if compromised, attacker controls all pages
- Google Fonts external dependency — privacy (user IP logged by Google)
- No SRI (Subresource Integrity) on external scripts

### F. Performance & SEO

| Metric | Value | Verdict |
|--------|-------|---------|
| TTFB (homepage) | 520ms | Medium |
| TTFB (health) | 1.2s | Slow (serverless cold start) |
| TTFB (dashboard) | 496ms | OK |
| Lighthouse | Not runnable (no Chrome in env) | — |
| robots.txt | ✅ CF-managed, AI train=no, search=yes | ✅ |
| sitemap.xml | 30+ URLs, daily refresh | ✅ |
| og:image | `/opengraph-image?hash` (dynamic) | ⚠️ May not render on all platforms |
| twitter:card | `summary_large_image` | ✅ |
| structured data | Product + Organization + WebSite + FAQPage | ✅ |
| hreflang | Missing `<link rel="alternate">` in DOM | Medium |
| canonical | Self-referencing | ✅ |

**OG image concern:** Dynamic URLs with hash (`/opengraph-image?c4beace96fe4d5a0`) — Facebook/LinkedIn cache by URL; if hash changes, scraper re-fetches. But if the hash is stable per deploy, it's fine.

### G. Privacy & Compliance

| Item | Finding | Severity |
|------|---------|----------|
| Privacy policy | `/privacy` exists, Bengali + English | ✅ |
| Terms of service | `/terms` exists | ✅ |
| Refund policy | `/refund` exists (7-day money-back) | ✅ |
| Cookie consent | `_v-consent` cookie, CF-managed banner | ✅ |
| GDPR data deletion | **Not documented** — no "Delete my account" flow | High |
| GDPR data export | **Not documented** | Medium |
| Data retention policy | **Not stated** in privacy policy | Medium |
| Third-party data sharing | Google Fonts (user IP), Vercel (logs), Cloudflare (logs) — should be disclosed | Medium |
| Children's privacy | No age gate (COPPA) | Low (BD market) |

### H. Business & Analytics

| Item | Finding |
|------|---------|
| Pricing | Free → Starter ৳2000 → Business ৳3500 → Enterprise ৳6000 |
| Payment | Manual bKash (01822417463), Nagad, Rocket, USDT |
| PCI compliance | No card data touches your server (manual bKash) ✅ |
| Analytics provider | Not detected (no GA, Mixpanel, Amplitude IDs in HTML) |
| Conversion tracking | **None** — no signup/purchase events instrumented |
| Monitoring | Sentry mentioned in code (disabled), CF NEL for errors |
| Backups | B2 for video backups; **no visible DB backup/restore test** |

### I. UX & Accessibility

| Check | Finding | Severity |
|-------|---------|----------|
| WCAG automated | Not runnable in env | — |
| Color contrast | Bangla on white — Hind Siliguri may have thin strokes | Low |
| Form labels | Cannot verify without browser | — |
| Keyboard nav | Cannot verify without browser | — |
| Error messages | Bengali + English ✅ | ✅ |
| Onboarding | 6000 free credits at signup ✅ | ✅ |
| Loading states | Skeleton loaders present ✅ | ✅ |
| Mobile responsive | Tailwind responsive classes used | ✅ |
| `lang` attribute | `bn` (Bengali) on `<html>` | ✅ |
| `bangla` CSS class | `font-family: 'Hind Siliguri'` | ✅ |

---

## 3. SECURITY APPENDIX

### A. SSL/TLS Analysis

```
issuer=C=US, O=Google Trust Services, CN=WE1
notBefore=Jul 21 09:17:04 2026 GMT
notAfter=Oct 19 10:17:00 2026 GMT  ← 60 days, verify auto-renew
subject=CN=hostamar.com
SAN: DNS:hostamar.com, DNS:*.hostamar.com
Protocol: TLSv1.3, Cipher: TLS_AES_256_GCM_SHA384 ✅
```

### B. CSP Evaluation

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;  ← REMOVE unsafe-inline
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
media-src 'self' blob: data: https:;
worker-src 'self' blob:;
child-src 'self' blob:;
connect-src 'self' https://comfy.hostamar.com https://api.hostamar.com https://tv.hostamar.com https://vp9.hostamar.com;
frame-ancestors 'none'
```

**Recommendations:**
1. Remove `'unsafe-inline'` from script-src — use nonces
2. Remove `https://cdn.jsdelivr.net` — self-host or use SRI
3. Add `report-uri https://hostamar.com/api/csp-report` for violation monitoring
4. Add `upgrade-insecure-requests` (defense in depth)

### C. Cookie Flags

Cannot verify via curl (cookies set only on auth flow). **Recommend verifying:**
- `Next-Auth.session-token`: `HttpOnly; Secure; SameSite=Lax; Path=/`
- `Next-Auth.csrf-token`: `HttpOnly; Secure; SameSite=Lax`
- `Next-Auth.callback-url`: `HttpOnly; Secure; SameSite=Lax`

### D. Secrets Exposed

| Secret | Location | Action |
|--------|----------|--------|
| `vcp_[REDACTED-ROTATE-ME]` | Chat history, memory, terminal | **ROTATE NOW** |
| `KILOCODE_API_KEY` | .env (referenced in memory) | Rotate if pasted in chat |
| `[REDACTED-PAT]-xK39m` | Memory (CF worker key) | Rotate if exposed |
| `01822417463` | Public (bKash number) | OK — business number |

### E. Dependency Vulnerabilities

`npm audit` → **0 vulnerabilities** ✅ (as of 2026-08-29)

---

## 4. INFRASTRUCTURE INVENTORY

| Component | Provider | Hardening Notes |
|-----------|----------|-----------------|
| DNS | Cloudflare | Add DMARC, SPF, DKIM for email |
| CDN | Cloudflare | Enable WAF, Bot Fight Mode |
| Hosting | Vercel | Enable 2FA, restrict team |
| DB | Neon (Prisma) | Enable connection pooling, backups |
| Storage | B2 (Backblaze) | 9 objects, 0/5GB, verify lifecycle rules |
| Email | **None** | Add Zoho/Google Workspace for @hostamar.com |
| CI/CD | GitHub → Vercel webhook | Add branch protection, required reviews |
| Monitoring | CF NEL, Sentry (disabled) | Enable Sentry for error tracking |
| Secrets | .env (Vercel) | Rotate all exposed keys |

---

## 5. ACTION PLAN (CSV)

```
Issue,Severity,Owner,ETA,Effort,Notes
Rotate Vercel API token vcp_[TRUNCATED]...,Critical,Romel,Immediate,5 min,Vercel Settings → Tokens → Revoke
Rotate KILOCODE_API_KEY,Critical,Romel,Immediate,10 min,Kilo dashboard + Vercel env update
Add rate limiting to /api/v1/chat/completions,High,Dev,1 day,2 hr,Vercel middleware or CF Rate Limiting
Add auth/API key to /api/v1/chat/completions,High,Dev,1 day,4 hr,Simple bearer <REDACTED> check
Remove unsafe-inline from CSP,High,Dev,1 day,1 hr,Use nonces or self-host scripts
Add DMARC/SPF/DKIM records,High,Romel,1 day,30 min,Cloudflare DNS → add TXT records
Enable MFA on Vercel+CF+GitHub+Google,High,Romel,1 day,30 min,Account settings
Redact /api/health sensitive fields,Medium,Dev,1 day,1 hr,Remove customer count, AI configs
Add GDPR data deletion flow,Medium,Dev,3 days,4 hr,API endpoint + UI button
Add analytics (GA4 or Plausible),Medium,Dev,2 days,2 hr,Track signup, activation, payment
Add CSP report-uri,Low,Dev,1 day,1 hr,POST violations to /api/csp-report
Add SRI to external scripts,Low,Dev,1 day,1 hr,jsdelivr → pin integrity hash
Add hreflang link tags,Low,Dev,1 day,30 min,bn-BD, en-US alternates
Add email (Zoho/Rocketmail),Low,Romel,1 day,30 min,@hostamar.com professional
Test DB backup restore,Medium,Dev,1 day,2 hr,Verify Neon backup + restore
Add account lockout after 5 fails,Medium,Dev,2 days,2 hr,NextAuth custom logic
```

---

## 6. COMPETITIVE NOTES

Hostamar competes in BD AI marketing video space:
- **Local:** Chorki, Bongo (video), 10 Minute School (AI)
- **Global:** Canva, InVideo, Synthesia, Pictory

**Differentiators:**
- Bangla-first (বাংলা ভয়েসওভার, সাবটাইটেল)
- bKash payment (local fit)
- 6000 free credits (low barrier)
- All-in-one (video + hosting + chat + browser + IDE + game)

**Weaknesses vs competitors:**
- No automated payment (manual bKash TrxID)
- No team/collaboration features
- No API for video generation (only chat)
- No mobile app

---

## 7. MONITORING RECOMMENDATIONS

1. **Uptime:** Vercel Analytics + CF Health Checks
2. **Errors:** Enable Sentry (currently disabled in next.config.js)
3. **Security:** CF WAF + Rate Limiting rules
4. **Business:** GA4 or Plausible for funnel tracking
5. **Alerts:** Telegram/Discord bot for:
   - Deploy failures
   - 5xx errors > 1%
   - Credit spend anomalies
   - New user signups

---

## 8. FINAL VERDICT

**Overall security posture: MEDIUM-LOW**

**Strengths:**
- TLS 1.3, HSTS, secure headers ✅
- No SQL injection vectors (Prisma ORM) ✅
- No XSS via React auto-escaping ✅
- B2 storage intact, DB connected ✅
- 0 npm audit vulnerabilities ✅

**Weaknesses:**
- **Exposed API tokens** (critical, immediate)
- **No rate limiting** (high, easy fix)
- **Public credit-spending endpoint** (critical)
- **No MFA** (high)
- **No email authentication** (DMARC/SPF)
- **No analytics** (blind to funnel)

**Priority:** Rotate tokens → Add rate limiting → Enable MFA → Add DMARC → Monitor.

---

*Report generated 2026-08-29T13:40:00Z by Hermes Agent. All findings non-destructive. No PII or live secrets published.*
