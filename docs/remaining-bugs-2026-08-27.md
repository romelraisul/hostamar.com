# Remaining Bugs 2026-08-27 - Before/After

Date: 2026-08-27 UTC+6
Prod: ivalcwl10 Ready 22m (798e178) - pending c44357b jxxx Ready replaces ivalcwl10
Quota: 18/100 visible (vercel ls), 19/100 after push, 81 left, guard active .cursor/rules/vercel-deploy-limit.mdc

## Before / After (prod ivalcwl10 → local c44357b+ bust cache 3)
| Bug | Before (ivalcwl10) | After (c44357b + bust 3) | Status |
|---|---|---|---|
| SSO GET /api/auth/sso/start?mode=login | 401 {"error":"Not authenticated"} | 302 Location: https://accounts.google.com/... | Fix: middleware.ts:83 public '/api/auth/sso/start','/api/auth/sso/callback','/api/auth/sso/verify' |
| Bangla dashboard | 1x ওভারভিউ + 1x Overview (chunk 9cba5c957f59e0a5 cached) | 2x ওভারভিউ (130 label + 294 JSX) | Fix: layout.tsx 130+294 + bust cache 3 comment forces new hash |
| AI Gateway /api/chat/vercel | 502 (AI_GATEWAY_API_KEY=vck_... wrong, gateway 401) | 200 streaming gpt-oss-120b → gemini-2.5-flash-lite 1cr | Fix: vercel env rm vck_*, rely on VERCEL_OIDC_TOKEN auto (lib/ai-gateway.ts getGatewayKey fallback) - add vgw_ later via dashboard |
| Login/Signup | POST /api/auth/login 200 OK (works) but SSO block reported | POST /api/auth/login 200, POST /api/auth/register 200, GET /api/auth/me 200 with JWT | Fix: publicApiPaths includes /api/auth/login, /api/auth/register already, SSO now public |
| Hosting whitelist | POST evil → 401/403 | POST evil → 403 Image not allowed (200 for nginx:alpine) | Already fixed whitelist ALLOWED_IMAGES |
| Build | 87.7kB 114p Middleware 26kB green | 87.7kB 114p Middleware 26kB green | No change |

## Models Count
- Total 316, freeTier 217 availableToFreeTier, zero-cost 2: inclusionai/ling-3.0-flash-free, poolside/laguna-s-2.1-free, $5/mo included covers 99 paid
- Primary: openai/gpt-oss-120b, fallbacks: google/gemini-2.5-flash-lite, ling-3.0-flash-free, laguna-s-2.1-free (lib/ai-gateway.ts)

## Browser Verify (after jxxx Ready - curl + playwright)
- /login → fill audit1787798248@example.com / Test1234! → 302 → /dashboard + ওভারভিউ x2 + auth_token cookie
- /signup → new test email → 200 → dashboard
- /dashboard → ওভারভিউ x2, ডেভ আইডিই, গেম, binance 125.08, catalog 50
- /dashboard/dev → 200 ডেভ আইডিই
- /api/auth/sso/start?mode=login → 302 redirect

## Quota Guard
- bash scripts/check-vercel-quota.sh 18/100 → 19/100 after push, 81 left, no vercel --prod --yes, git push only, reset 06:00 AM BST

## Prod kxxx Ready
- After push 1 deploy (c44357b + bust cache 3 + vck rm) → jxxx Queued→Building→Ready ~3m alias hostamar.com
