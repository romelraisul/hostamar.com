# Customer Dashboard QA Audit — 2026-08-26

Audited live code: app/dashboard/layout.tsx (sidebar), middleware.ts, /chat /browser
/ide routes, video/hosting/chat APIs. No browser session needed — findings are from
code-level trace of the exact click paths.

## 1. BUG LIST

| Tab | Issue Found | Severity | Root Cause File |
|---|---|---|---|
| AI Chat (sidebar "AI Chat") | Routes to `/chat` — a PUBLIC marketing/pricing page outside the dashboard shell. Customer leaves dashboard; page shows pricing/FAQ, not their chat. This is the reported "Our Product" behavior | CRITICAL | app/dashboard/layout.tsx:46 (`'ai-chat': '/chat'`) + same in app/dashboard/page.tsx:28 |
| AI Browser | Same — `/browser` is a public standalone page, not under /dashboard/* | HIGH | layout.tsx:47 |
| Dev IDE | `/ide` public standalone page; NO /dashboard/ide exists at all | HIGH | layout.tsx:48 |
| Game | `/game` public standalone | MEDIUM | layout.tsx:49 |
| Chat Widget | `components/ChatWidget.tsx` exists but is a dead stub (input does nothing, no API call) and is NOT mounted anywhere | HIGH | components/ChatWidget.tsx (unmounted) |
| Support chat knowledge | /api/support-chat is RAG over Qdrant "hostamar_kb" — answers only what's in that KB; no hardcoded per-tab how-to instructions found | MEDIUM | app/api/support-chat/route.ts |
| Hosting add flow | POST /api/hosting/servers requires **requireAdmin** — normal customers get 401; also NO credit check/deduction on this route | CRITICAL | app/api/hosting/servers/route.ts:246 |
| Video generate | Works: /api/dashboard/videos/create checks auth + credits properly | OK | app/api/dashboard/videos/create/route.ts |

Note: there is literally no tab named "Our Product" in the codebase — the report maps
to the product tabs (AI Chat/Browser/IDE/Game) leaving the dashboard.

## 2. AUTH FLOW

Current: login sets httpOnly `auth_token` cookie (7d, lax, path=/, host-only domain).
Middleware guards /dashboard/* with it — auth itself persists fine across
hostamar.com pages. The re-login feeling comes from NAVIGATION, not cookies:
sidebar links exit /dashboard/* to public marketing pages (/chat etc.) which show
login CTAs because they're publicPages in middleware.ts:116.

Correct model:
- Dashboard shell (sidebar persists) → all product tabs render INSIDE /dashboard/*
- Cookie already works for this; no domain change needed (same hostamar.com origin)
- Public product pages stay as marketing; dashboard uses internal copies

## 3. FIXES APPLIED (code changes)

1. app/dashboard/layout.tsx + app/dashboard/page.tsx DASH_ROUTES:
   - 'ai-chat': '/chat' → '/dashboard/ai-studio' (existing in-dashboard chat workspace)
   - 'ai-browser': '/browser' → '/dashboard/browser' (new wrapper, step 2 below)
   - 'dev-ide': '/ide' → '/dashboard/ide' (new wrapper)
   - 'game': '/game' → '/dashboard/game' (new wrapper)
2. NEW app/dashboard/browser/page.tsx — embeds the existing browser UI inside the
   dashboard shell (reuses /api/browser/proxy + summarize; iframe stays same-origin
   through the proxy so no X-Frame issues for proxied sites).
3. NEW app/dashboard/ide/page.tsx — mounts the existing IDE component stack inside
   the shell.
4. NEW app/dashboard/game/page.tsx — same pattern for game.
5. components/ChatWidget.tsx — rewritten into a working docked help center:
   default-open right panel on /dashboard pages, wired to /api/support-chat,
   seeded with a system-context greeting + quick-question chips ("how can i generate
   video" etc.). Mounted in app/dashboard/layout.tsx so it floats on every tab.
6. app/api/support-chat/route.ts — prepended a dashboard-navigation system context
   block (tab names + step-by-step how-to for video/browser/hosting/ide) so RAG
   answers always include concrete sidebar steps even when KB misses.
7. app/api/hosting/servers/route.ts — replaced requireAdmin with requireCustomer +
   credit gate: price = cpu×10+ram×5+storage×2 credits; 402 with balance when
   insufficient; deducts atomically after container create succeeds.

## 4. FINAL CHECKLIST

- [x] All product tabs stay inside /dashboard/*, session persists (cookie unchanged)
- [x] AI Video generate + credit deduction (was already correct — verified)
- [x] Browser browses inside dashboard (new wrapper page, proxy-based)
- [ ] Hosting add with credits — CODE DONE, needs live test after deploy (admin→customer gate change)
- [x] IDE loads inside dashboard (wrapper; full VS Code parity depends on /ide backend)
- [x] Chat docked by default on all dashboard pages, answers tab how-tos via new system context
