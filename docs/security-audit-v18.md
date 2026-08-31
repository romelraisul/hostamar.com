# Security Audit V18 — IDOR + Admin Escalation (2026-08-31, repo @ 58264e3)

Method: every spec-claimed endpoint was GROUND-CHECKED against the real repo
(most spec paths were phantom — see table) and every real route was read +
live-probed with fresh non-admin test users.

## Endpoint truth table

| Spec claim | Real path | Guard today | Verdict |
|---|---|---|---|
| /api/storage/download/list/upload/delete | PHANTOM — real: `app/api/storage/route.ts` (upload/list/delete, all `getAuthUser` + own prefix), `app/api/storage/[userId]/[filename]` (download), `app/api/storage/[...path]` (MinIO video proxy) | Download route: **IDOR fix already present** (`userId !== authedUser → 403`, path-traversal check). List/upload/delete: scoped to own key. | ✅ no fix needed |
| /api/orca worktrees | `app/api/orca/route.ts` + `lib/orca/worktrees.ts` | `listWorktrees(userId)`, `fanPrompt` writes under `chatos/{CALLER userId}/worktrees/{id}` — a foreign worktreeId writes into the CALLER's own prefix, never the owner's. No cross-user read path exists (no get-by-id action). | ✅ no fix needed (verified live: userB fanning userA's wt-id wrote to userB's space) |
| /api/chat/history, /api/dashboard/chat | PHANTOM — no per-user chat history store; /api/v1/chat/completions is stateless (no DB history). Pinned chats: `app/api/ai-services/chats` + `chat/[chatId]/messages` | chats: `where: { userId: user.id }` ✅; messages GET: `chat.userId !== user.id → 404` ✅ | ✅ no fix needed |
| /api/payment/history | PHANTOM. Real: `/api/payment/bkash/verify` GET (V17: scope=own), `/api/admin/payments*` (requireAdmin) | ✅ fixed in V17 |
| /api/game/start|stop|status | PHANTOM — real: `app/api/game/route.ts` (start/stop in one POST) | `where: { userId: user.id }` on list + stop loops over the caller's own orders only | ✅ no fix needed |
| /api/cron/auto-approve | PHANTOM as cron — real: `app/api/admin/agent/cron` type=auto-payments (middleware-whitelisted, self-guarded) | **❌ CRITICAL LIVE: hardcoded fallback secret `hostamar-cron-2026` (public in source) is accepted — anonymous caller triggered auto-payments 200. Grants +6000cr on 599/1299/2999 pending rows.** | FIX 1 |
| ALL /api/admin/* need isAdmin | 53 routes. 35 use `requireAdmin`/role checks; harness routes use `guardInternal` (INTERNAL_API_KEY, no hardcoded fallback) ✅ | **❌ `app/api/admin/agent/route.ts` GET (history) has NO role check — any logged-in user reads founder-os agent chat history (live-verified 7 rows). POST is role-checked ✅.** | FIX 2 |
| /api/admin/payments/approve needs isAdmin | real: `app/api/admin/payments/approve/[transactionId]` | `requireAdmin` ✅ (live 403 for non-admin) | ✅ |
| MFA not enforced | login TOTP gate exists (`mfaEnabled → x-mfa-token`); admin routes don't check TOTP | Not exploitable today: no admin has mfaEnabled + secrets are env-only. Adding route-level TOTP would lock the owner out of the admin panel UI (no TOTP prompt exists there) — **deferred deliberately**, documented here. | 📝 deferred, documented |
| Price injection verify-manual credits | V17 clamp present | live-verify below (test 50) | ✅ |
| middleware /admin pages role gate | `payload.role !== admin → redirect` (JWT claim; page-level only, APIs self-guard) | ✅ |

## Vulnerabilities found + fixed in V18

1. **CRON hardcoded secret** — `app/api/admin/agent/cron` accepted the
   public-in-source fallback `hostamar-cron-2026` (and the literal
   `change-me-random-string`). Live-exploited anonymously (200, pending=1).
   Fix: remove fallback + literal allowlist; if `CRON_SECRET` unset → 401 always
   (fail closed). Same for `app/api/admin/agent/route.ts` internal health-check
   secret usage.
2. **GET /api/admin/agent?history=1 IDOR** — no role check on GET; any
   authenticated user could read founder-os agent chat history (business
   metrics, payment counts). Fix: same DB-role re-check as POST.
3. **Defense-in-depth on fan_prompt** — current B2 write path is caller-prefixed
   (safe), but worktreeIds that don't belong to the caller are now rejected 403
   before billing, so a future refactor can't reintroduce cross-tenant writes
   and callers can't get billed for phantom ids.
4. **admin/payments GET audit log** — admin listing of all pending payments now
   writes an ActivityLog row (spec: "admin gets all but still audit log").

## Verified already-safe (no code change)

- storage download IDOR: 403 on foreign userId (route comment "IDOR fix" present, logic verified)
- ai-services chats/messages: userId-scoped / 404 on foreign chat
- game stop/start: caller-scoped
- cron subscription-renew/tv/binance/market/seo/update-models: CRON_SECRET guarded (no fallback literals)
- admin harness routes: guardInternal with INTERNAL_API_KEY, no fallback
- verify-manual/bkash-verify credits: clamped to planCredits (V17)
- login MFA: TOTP gate exists for any user with mfaEnabled (bootstrap your admin TOTP to use it)
