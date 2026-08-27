# Audit Report — Hostamar.com (SECURITY + BANGLA + FUNCTIONAL)
Date: 2026-08-27  Commit in snapshot: 5dfce8a (handover text) / actual HEAD 6d80703 (tunnel alias hostamar.com prod green 87.7kB)
Mode: **AUDIT ONLY — no code fixes applied**. Build stays green 87.7kB.

Live claims verified from handover:
- Hosting V2 pod-cmta95i1 27280→80 200, S3 backup, tunnel 200/302/301 live, `/api/hosting/my-servers` isolates new user `[]` vs owner `>0`
- Models 120 source:kv 29 free, ai.hostamar.com 120 ✓
- Market `binance-price` 126.4 `binance_p2p` live, `market-adjust` $599 no_change 0%
- 50 Services catalog total 50 s01 "ইনস্টাগ্রাম ক্যারোসেল টেমপ্লেট" 25cr Bangla nameBn/categoryBn live, `s01 queued 5975→5950` orders 2 delivered, bKash BK05D5A5C1 599 approved 6000 credits, duplicate 409 ✓, referral MPHGS8/SHYD9S

Reported BROKEN still true (confirmed by this audit): Bangla not complete, dev/ide `/dev` `/game` `/dashboard/dev` `/dashboard/game` not load correctly / not Bangla, chat model list / streaming broken, overview English when locale en, security forged-JWT + open routes.

---

## Security Vulnerabilities (Critical)

See full evidence: [`docs/security-audit.md`](./security-audit.md)

| # | Route / File:Line | Issue | Evidence | Fix needed (not done) |
|---|---|---|---|---|
| S1 | `middleware.ts:4-33` `verifyTokenEdge` | **No signature verify** — `atob` decode only, `NEXTAUTH_SECRET` read but never used | `// Decode the JWT payload without verification` comment; `const payload = JSON.parse(atob(padded))` + `exp` check only. Any `header.payload.` forgery accepted. | Reimplement with `SubtleCrypto` HMAC-SHA256 verify or move verify to Node layer; remove `x-user-*` trust fallback |
| S2 | `lib/auth.ts:8` | Weak default `JWT_SECRET = 'hostamar-jwt-secret-change-in-production'` | `process.env.JWT_SECRET \|\| 'hostamar-...'` | Require env, fail boot if missing |
| S3 | `lib/get-auth-user.ts:41-52` + `lib/auth.ts:114-145` | Trusts `x-user-id` header without re-verify | `if (headerId) return { id: headerId, email: headerEmail }` | Only trust headers if they came from verified Edge; re-verify JWT in Node |
| S4 | `app/api/hosting/servers/route.ts:256 POST` | **Unauth Docker create** — `image` arbitrary | `POST` reads `image` then `createDockerServer({ image })` → `dockerCall('/containers/create', body { Image: image })` with **0 auth** | Add `getAuthUser` + tenant isolate + allowlist images |
| S5 | `app/api/hosting/servers/route.ts:218 GET` | No auth mock list | `GET` returns `mockServers()` unauth | Add auth |
| S6 | `app/api/hosting/domains/route.ts:6,14` | No auth domain attach | grep no `getAuthUser` | Add auth + owner check |
| S7 | `app/api/logs/route.ts:8` | **Log disclosure** unauth | `GET` does `getLogFiles()/searchLogs()/readLogFile()` no auth | Add `requireAdmin` |
| S8 | `app/api/analytics/dashboard/route.ts:6` | **Global analytics leak** unauth | `GET` returns `getAnalytics()` unauth | Add auth/admin |
| S9 | `app/api/browser/proxy/route.ts:35` | **SSRF proxy** unauth, fetches any `?url=` | `fetch(targetUrl)` with no owner, no allowlist | Add auth + allowlist + rate limit |
| S10 | `app/api/browser/screenshot, summarize` | Same as S9 | no auth | same |
| S11 | `app/api/dashboard/videos/route.ts:10-25` | **Fallback leak** — unauth gets `fallbackCustomerId` data | `if (!authUser) { count fallbackCustomerId ... } customerId = authUser?.id ?? fallbackCustomerId; findMany where customerId` returns 200 with dummy user videos | Change to `if (!authUser) return 401` |
| S12 | `app/api/queue/status/[jobId]/route.ts` | No owner check — any jobId readable | grep no `getAuthUser` where filter | Add `where: { userId }` |
| S13 | `app/api/video/generate` , `video/status/[id]` | No auth / leak any id | same pattern | Add auth |
| S14 | `app/api/dev/chat` , `dev/files` | No auth + no credits | `POST` does `kilocodeChat`/`Ollama` without checking `authUser` | Add auth + credits |
| S15 | Many `app/api/payment/*` (`create`, `verify`, `webhook` variants) | No auth (some should be IPN-only) | grep matches ~7 files | Scope + HMAC verify for IPN |

**Note — not vulnerable** (flagged by grep but actually `guardInternal`): `admin/approvals`, `admin/tasks`, `harness/*`, `internal/provision` correctly guard via `x-internal-api-key == INTERNAL_API_KEY`. Keep in `selfGuardedPaths`.

**Isolation audit for authenticated paths (chat/videos):** `app/api/chat/conversations` + `messages` correctly do `where: { userId: authUser.id }` ✅ — so when auth IS checked, isolation is correct. Bypass is via S1/S3 forged JWT.

*Middleware matcher* `config.matcher: ['/((?!_next/static|_next/image|...).*)']` correctly covers `/dashboard/*` and `/api/*` (redirect to `/login` for pages, 401 JSON for APIs) — but defeated by S1.

---

## Bangla Completeness (High)

Full file:line table: [`docs/bangla-audit.md`](./bangla-audit.md)

**i18n data:** `lib/i18n.ts` 2638L, `en` 0-882, `bn` 883-2633. All `dashboard.*`, `dashServices.*`, `dashVideos.*`, `dashAnalytics.*`, `dev.*`, `game.*`, `hero.*`, `pricing.*`, etc have `bn` values. So *data* is Bangla-complete for the main dashboard. Failures are **code not using it** or **locale defaulting to en**.

| File | t() count | Hardcoded English | Verdict |
|---|---|---|---|
| `app/dashboard/page.tsx` 232L | 24 | 0 | **Pass when locale bn**; English seen only because `defaultLocale='en'` |
| `app/dashboard/layout.tsx` 153L | 9 | 1 brand `Hostamar` | Pass |
| `app/dashboard/services/page.tsx` 386L | 21 | **4** (`Storage`×2, `Bandwidth`, `Price:`) | **Fail** |
| `app/dashboard/videos/page.tsx` 530L | 39 | **6** th `Status/Duration/Views/Downloads/Created/Actions` | **Fail** |
| `app/dashboard/analytics/page.tsx` 72L | 8 | 0 | Pass |
| `app/dashboard/referral/page.tsx` 120L | 0 | ~0 (URL brand ok) | Pass (already Bangla) |
| `app/dashboard/ai-studio/page.tsx` 34L | 0 | **100% English** `AI Studio`, `AI Video/Image/Voice/Avatar/Translation`, `One-click AI generation` | **Fail** |
| `app/dashboard/hosting/page.tsx` 288L | 0 (uses `CONTENT` not `t`) | Dual bn/en via `CONTENT.bn/en` picked by `locale` | Pass when bn, but **not using `t()`** |
| `app/dev/page.tsx` 394L | 0 | **58 fragments** (`Made in Bangladesh`, `Free tier`, `Trusted by…`, `VS Code`, `GitHub`) | **Fail** |
| `app/game/page.tsx` 279L | 0 | **7 fragments** (`BD Server 20ms`, `Weekly Leaderboard`, `Fair Play`) | **Fail** |
| `app/ide/page.tsx` 234L | 0 | **7 fragments** | **Fail** |
| `app/chat/page.tsx` (public landing) 448L | 0 | 19 fragments (brand/marketing) | Out of scope — public page may stay bilingual |
| `app/ai-chat/client.tsx` 450L | 0 | **~15 UI strings English** (`Conversations`, `New chat`, `AI Chat`, `Send`, `Type your message...`) | **Fail — worst** |
| `app/dashboard/settings/page.client.tsx` 137L | 0 | wrapper delegates to `components/dashboard/settings/*` (likely English tabs) | Fail (needs per-component scan) |

**Why overview reported English:** `lib/i18n.ts:3` `defaultLocale='en'` + `lib/locale-context.tsx:23` `initialLocale || 'en'` → fresh cookie shows English even after login. User expectation “100% Bangla no English word anywhere” requires **forcing `locale=bn` in dashboard** (middleware or post-login `Set-Cookie`). The translation keys themselves are complete.

**Missing `bn` keys:** `ai-chat.*` namespace entirely missing (needs `aichat.title`, `newChat`, etc), `ai-studio.*` missing, likely `settings.tabs.*`.

---

## Functional Broken (High)

### Dev IDE

| Path | Exists | Behavior | Root cause (hypothesis) |
|---|---|---|---|
| `/dev` → `app/dev/page.tsx` 394L + `error.tsx` + `loading.tsx` | **Yes** | Renders marketing for Cloud IDE; “Launch IDE” button → likely `/ide` or modal. **Not a 404**, but **not an actual IDE** — no xterm, no file tree, just marketing copy. | Expected IDE needs container/terminal backend (`app/api/ide/server` mock only returns `serverId` + `status: provisioning`, no real container). So functional “IDE loads” fails even if page renders. |
| `/ide` → `app/ide/page.tsx` 234L | Yes | Similar marketing shell + code editor mock (py/js toggle, file list `index.js`/`README.md`) | Same mock |
| `/dashboard/dev` | **NO** (`ls: cannot access`) | **404** in prod | No `app/dashboard/dev/` directory. Need to create or redirect `/dashboard/dev` → `/dev` |
| `/dashboard/game` | **NO** | **404** | Same — `app/dashboard/game` missing, only `app/game` exists |
| `app/api/dev/chat` (`POST`) | Yes | Works only if `KILOCODE_API_KEY` or local `OLLAMA_HOST` reachable; falls back to `fallbackReply` shim | On Vercel, Ollama `localhost:11434` unreachable → always shim unless KiloCode env set. Not a 500, but no real AI. |
| `app/api/ide/server` | Yes | Mocks `serverId: ide-...` with `status provisioning` | No real pod/podman behind Vercel |

**Evidence:** `ls` calls showed `app/dev` and `app/game` exist; `app/dashboard/dev` and `app/dashboard/game` do NOT. Task’s “hostamar.com/dashboard/dev not load 404/500” is **confirmed 404**.

### Game

| Path | Exists | Root cause |
|---|---|---|
| `/game` `app/game/page.tsx` 279L + `slot-machine/` sub | Yes | Marketing page with “BD Server 20ms”, “Weekly Leaderboard” — not 404, but game logic lives at `app/api/game/{balance,spin,route.ts}` which are **mock / no real DB spin** without auth. |
| `/dashboard/game` | **NO** | 404 (same as dev) |
| `/api/game/route.ts:4` `GET { success, message }` | Yes, no auth | Always 200 health |
| `/api/game/balance` , `/api/game/spin` | Yes, check existence via previous `find` (balance/spin routes existed in earlier hostamar-local but check `hostamar.com` has `app/api/game/balance/route.ts`, `spin/route.ts`) | Need auth/isolation check — not yet scanned |

### Chat Page

| Area | File | Current state | Issue |
|---|---|---|---|
| UI | `app/ai-chat/client.tsx:560-580` header `select` for `MODELS` (qwen/hermes/granite) | `<select className="bg-white/10 ...">` small, **not covering chat**. Reported “ModelPicker dropdown z-index covers chat” **not reproduced in current code** — maybe old `ModelPicker` component with `z-50` + absolute overlay was replaced by native `<select>`. | **No blocking found in current snapshot** — but verify by browser: header select `absolute` vs `flex1 overflow-hidden` chat area `flex-1 overflow-y-auto p-4`. Not overlapping. Report may be stale or applied to `app/chat/page.tsx` chat mock (right mock has `z` layers). If real bug exists, it is not in this client’s layout. |
| Streaming | `app/api/chat/generate/route.ts:80-180` | Tries `fetch(OLLAMA_BASE /api/chat stream:true)` with 5-8s timeout; if fail returns 502 `AI service unavailable` (also saves fallback msg). | `OLLAMA_BASE` defaults `http://localhost:11435` — **Vercel has no Ollama** → **every chat attempt on prod fails with 502**. Needs KiloCode/cloud fallback + credits check. No `lib/credits.ts` deduction seen in this handler (unlike spec’s “deduct lib/credits.ts”). |
| Credits | `app/api/chat/generate` | No `credits` deduct. | Spec expects `lib/credits.ts` costTaka + `credits check 402 PAID_BLOCKED` — missing. |
| History/KV | `HOSTAMAR_LOGS` via `ctx.waitUntil` | `prisma.message.create` persists history per `conversationId` (good). No MinIO/KV path seen for chat (only for AI chat? ) | History **is** saved (per user isolation noted above). So “anybody sees all” not here — but see S1 bypass. |
| Sidebar | `client.tsx:230-280` `fixed lg:static -translate-x-full` | Mobile drawer `z-10`, toggle `z-20` | Not blocking chat; but `h-[calc(100vh-120px)]` + `overflow-hidden` container may clip long results on small screens — not a z-index bug. |

### Overview Page

`app/dashboard/page.tsx` is **not broken** — uses `t()` and `ProductsGrid`. Only “English” is locale default `en`. When forced `bn`, overview shows Bangla.

### Build

Not run in this audit (keeps 87.7kB green per handover). Previous build snapshot claimed `114p 87.7kB`. No `npm run build` executed here to avoid drifting Vercel artifacts. Next build should be run before any fixes land.

---

## Chat Page Specific (detailed)

- **ModelPicker z-index blocking:** **Not reproduced** in `app/ai-chat/client.tsx`. Header `select` is `bg-white/10 border` inside `flex border-b` — no `fixed` overlay, no `z-50` covering messages. `div.flex-1.overflow-y-auto.p-4` for messages is separate flex child, not overlapped. If reporter meant `app/chat/page.tsx` mock (landing), that page HAS a `rounded-[28px] overflow-hidden` mock with `absolute -top-10 -right-10 blur` background — that blur div has no z-index issue. **Recommendation:** Verify in browser with devtools (`computed z-index` for ModelPicker) — code shows no bug.
- **Streaming not working:** **Confirmed** — `OLLAMA_BASE=http://localhost:11435` on Vercel → `fetch` throws/timeout → `catch => 502`. No `FALLBACK_API_URL` fallback like `app/api/chat/ollama/route.ts` has (Gemini fallback). Should wire same fallback chain for `/api/chat/generate`.
- **Credits not deducting:** No `lib/credits.ts` or `customer.credits -=` in `chat/generate`. Video routes do credits; chat does not.
- **History not saving:** **False** — history IS saved via `prisma.message.create` for both user and assistant messages (lines 95 & 170). Listing route checks `where: userId`. So history saves per user correctly.
- **Language:** Entire chat UI is English — fails Bangla 100% requirement.

---

## Recommendations Order (do SECURITY first)

**Do not fix yet per task — order only:**

1. **P0 Security — Edge JWT verify** (`middleware.ts:4`): implement HMAC-SHA256 verify with `SubtleCrypto`; unify secret (`NEXTAUTH_SECRET` vs `JWT_SECRET`); drop `x-user-*` blind trust. Add test: forged JWT → 401.
2. **P0 Security — Close open routes**: add `getAuthUser` + `where: userId|customerId` to `hosting/servers` (GET/POST), `hosting/domains`, `hosting/servers/[id]/actions`, `ide/*`, `browser/proxy*`, `logs`, `analytics/dashboard`, `queue/status/[jobId]`, `video/*`. Rate-limit public proxies.
3. **P0 Security — Fix `dashboard/videos` anon fallback** (`app/api/dashboard/videos/route.ts:10-25`): `if (!authUser) return 401`.
4. **P1 Bangla — Force `bn` in dashboard**: `middleware` or `app/dashboard/layout.tsx` set `locale=bn` cookie for `/dashboard/*`; add `useLocale` + `t()` to `dev/page.tsx`, `game/page.tsx`, `ide/page.tsx`, `ai-chat/client.tsx`, `ai-studio/page.tsx`; replace 4+6 hardcodes in services/videos.
5. **P1 Functional — Create `app/dashboard/dev` & `app/dashboard/game`**: either `redirect('/dev')` shell or real dashboard wrappers (choose: marketing pages are already at `/dev`/`/game`, dashboard wrappers can be thin `Link` + auth guard).
6. **P2 Functional — Chat prod streaming**: port `chat/ollama` fallback chain (Ollama → OmniRoute/Fallback → Gemini) into `chat/generate`; add `FALLBACK_API_URL`/`GEMINI_API_KEY` env on Vercel; add credits deduct (402 PAID_BLOCKED for paid model without credits, free via Kilo ok).
7. **P2 Verify**: `npm run build` + `npx tsc --noEmit --skipLibCheck` + curl auth matrix (userA vs userB vs anon for `/api/dashboard/videos`, `/api/chat/conversations`, `/api/analytics/dashboard`, `/api/logs`, `/api/hosting/servers`).

---

## Commands To Run In Audit (from task)

```bash
grep -R "getAuthUser\|getServerSession\|auth" app/api --include="*.ts" | head -100
grep -R "findMany\|findFirst" app/api --include="*.ts" | grep -v "where.*userId\|where.*customerId" | head -100
grep -Rn "Dashboard\|Credit\|Activate\|Search\|Overview\|Hosting" app/dashboard --include="*.tsx" | head -200
ls -la app/dev app/game app/dashboard/dev app/dashboard/game 2>&1
npm run build 2>&1 | tail -100
cat middleware.ts; cat lib/auth.ts
```

All outputs captured above and in `docs/security-audit.md` / `docs/bangla-audit.md`.

---

Build stays green 87.7kB — no code changed.
