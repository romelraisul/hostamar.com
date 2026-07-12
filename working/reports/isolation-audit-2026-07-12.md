# Tenant Isolation Audit — (c) READ-ONLY

**Date:** 2026-07-12
**Author:** Hermes (human-gate review of prior isolation prompt)
**Scope:** Read-only grep + corrected diff. **NO migration, NO ALTER TABLE, NO code change.**
**Prerequisites locked:**
- Commit `5d5f827` — AI review pipeline (guards `_reset.ts`, secrets, phantom migrations).
- Decision A: Tenant = `Organization`. `Customer` is identity, links to orgs via `Membership`. `getCurrentOrg()` resolves org from session. `customerId` alone is NOT a tenant boundary.
- Decision B: `Goal`, `AutonomousTask`, `TaskRunLog` are GLOBAL (system automation). No tenant FK.

---

## TASK 1 — REAL GREP OUTPUT (grounded, not assumed)

### 1.1 Model line numbers (`prisma/schema.prisma`)
```
51:  model Customer {
152: model Video {
255: model VideoQueue {
298: model Payment {
670: model AutonomousTask {
689: model TaskRunLog {
732: model Goal {
751: model VoiceCall {
771: model Organization {
784: model SamlConnection {
806: model Membership {
```

### 1.2 Tenant fields present today (grep `organizationId|customerId|userId|tenantId`)
- `Video` (154): `customerId String` — NO `organizationId`.
- `Payment` (300): `customerId String` — NO `organizationId`.
- `VoiceCall` (753): `userId String?` — NO `organizationId`, and `userId` is NOT `customerId`.
- `Customer` (51): has NO `organizationId`. Links to orgs ONLY via `memberships Membership[]` (line 102). **There is no tenant column on Customer.**
- `SamlConnection` (786): `organizationId String` + relation → Organization. ✅ already tenant-scoped.
- `Membership` (806-815): `customerId` + `organizationId` + `role` (owner/admin/member), `@@unique([customerId, organizationId])`. ✅ already the tenant link. **NOTE: there is NO `isDefault` column (see GAP-1).**
- `Goal` (732), `AutonomousTask` (670), `TaskRunLog` (689): NO tenant field of any kind. GLOBAL per Decision B. ✅ correct.

### 1.3 API reads that touch tenant data (grep `prisma.video/payment/voiceCall/customer.find`)
Sample of 30 (full output truncated; representative):
```
app/api/auth/me/route.ts:26:          prisma.customer.findUnique({ where:{ id: authUser.id } })
app/api/chat/generate/route.ts:59:    prisma.video.findUnique({ where:{ id } })
app/api/chat/video/route.ts:26:       prisma.video.findUnique({ where:{ id } })
app/api/referral/route.ts:23:         prisma.customer.findUnique({ where:{ id } })
app/api/subscription/route.ts:21:     prisma.customer.findUnique({ where:{ id: authUser.id } })
app/api/payment/webhook/route.ts:26:  prisma.customer.findUnique({ where:{ email } })      <- cross-customer by email
app/api/webhooks/route.ts:99:         prisma.payment.findFirst({ where:{ transactionId } })
app/api/webhooks/route.ts:122:        prisma.customer.findUnique({ where:{ id: customerId } })
app/api/payments/webhook/route.ts:130:prisma.customer.findUnique({ where:{ id: customerId } })
app/api/payments/webhook/route.ts:176:prisma.customer.findFirst({ where:{ phone } })      <- cross-customer by phone
app/api/payments/webhook/route.ts:228:prisma.customer.findUnique({ where:{ email } })      <- cross-customer by email
app/api/analytics/crm-analytics/route.ts:31: prisma.payment.findMany({ ... })             <- ADMIN: all payments, no org filter
app/api/crm/pipeline/route.ts:42:     prisma.customer.count()                              <- ADMIN: all customers
app/api/dashboard/videos/* :           prisma.video.findMany({ where:{ customerId } })    <- customer-scoped, NOT org-scoped
```
**Key finding:** `prisma.video.findMany({ where:{ customerId } })` is the common pattern. Since `customerId` ≠ `organizationId` (Decision A), a customer who is a member of TWO orgs has all their videos visible under both orgs once `organizationId` filtering is added unless every write stamps the *right* org. Webhook/admin routes that resolve `customer` by `email`/`phone`/`id` from a third-party payload are the real cross-tenant surface today — they don't check org at all.

### 1.4 Creates that write tenant data (grep `prisma.video/payment/voiceCall.create`)
```
app/api/dashboard/videos/create/route.ts:48:   prisma.video.create({ data:{ customerId, ... } })
app/api/ai/videos/generate/route.ts:26:        prisma.video.create({ data:{ customerId, ... } })
app/api/videos/generate/route.ts:54:          prisma.video.create({ data:{ customerId, ... } })
app/api/payments/bkash/create/route.ts:126:   prisma.payment.create({ data:{ customerId, ... } })
app/api/payments/bkash/create/route.ts:149:   prisma.payment.create({ data:{ customerId, ... } })
app/api/payments/nagad/create/route.ts:124:   prisma.payment.create({ data:{ customerId, ... } })
app/api/payments/nagad/create/route.ts:147:   prisma.payment.create({ data:{ customerId, ... } })
app/api/admin/payments/route.ts:51:          prisma.payment.create({ data:{ ... } })      <- ADMIN
app/api/crm/pipeline/route.ts:219:           prisma.payment.create({ data:{ ... } })      <- ADMIN
```
**Finding:** Writes stamp `customerId` but NEVER `organizationId` (column doesn't exist yet). Next PR (d) must add `organizationId` to every `video`/`payment`/`voiceCall` create, sourced from `getCurrentOrg()`.

### 1.5 Existing auth / org-resolution pattern
```
lib/auth.ts:1:   import { getServerSession } from 'next-auth'
lib/auth.ts:77:  const session = await getServerSession(authOptions)
app/api/voice-token/route.ts:29:  const session = await getServerSession(authOptions)
app/api/subscription/route.ts:11: const session = await getServerSession(authOptions)
... (many routes call getServerSession)
```
**Finding:** `getServerSession` is used widely. **`getCurrentOrg` does NOT exist anywhere** (grep returned 0 hits in `lib/` and `app/api/`). There is NO `Membership` query in any route. Therefore today NO endpoint resolves tenant from the session — tenant isolation is entirely absent at the app layer; only `customerId` scoping exists, which is weaker than `organizationId` per Decision A. This is the core gap the next PR closes.

---

## TASK 2 — CORRECTED AUDIT TABLE (the real diff)

| Model | Current key | Has organizationId? | Needs organizationId? | Reason | Action |
|-------|-------------|---------------------|-----------------------|--------|--------|
| Video | customerId | no | **YES** | customer belongs to ≥1 org; needs org scoping for list/read/write. `customerId` alone leaks across a multi-org customer. | ADD `organizationId` + `@@index([organizationId])`; enforce `WHERE organizationId = getCurrentOrg()` on all reads/writes |
| Payment | customerId | no | **YES** | billing must be org-scoped; same multi-org risk as Video. | ADD `organizationId` + `@@index([organizationId])` |
| VoiceCall | userId (NOT customerId) | no | **YES** | `userId` → resolve to Customer → `Membership` → org; dashboard + post-call processor must be org-scoped. | ADD `organizationId`; derive via `userId`→`customer`→`Membership`. NOTE: `userId` is not `customerId`, so resolution needs a customer lookup. |
| Goal | none | no | **NO — EXCLUDED** | GLOBAL by Decision B; drives all tenants, not per-tenant. | EXCLUDE; add comment `/// @global - system automation, not tenant data` |
| AutonomousTask | none (owner string) | no | **NO — EXCLUDED** | GLOBAL workers, managed by GoalRunner. | EXCLUDE |
| TaskRunLog | taskId | no | **NO — EXCLUDED** | Logs for GLOBAL tasks. | EXCLUDE |
| Customer | none | no | **NO (already tenant-linked)** | Links to orgs ONLY via `Membership[]` (schema line 102). Has NO `organizationId` column and should NOT get one — `Membership` is the join table. | NO schema change. Document `getCurrentOrg()` resolves via `Membership`. |
| Membership | customerId + organizationId | yes | already | The tenant join; `role` owner/admin/member; unique `(customerId, organizationId)`. | NO change (BUT add `isDefault` — see GAP-1). Document `getCurrentOrg()`. |
| SamlConnection | organizationId | yes | already | Org-scoped SSO (procurement line 1, commit c01a42d). | NO change |
| Organization | id | n/a (root) | root | Tenant root. | NO change |

**Counts:** 3 ADD (Video, Payment, VoiceCall) · 3 EXCLUDE (Goal, AutonomousTask, TaskRunLog) · 4 unchanged (Customer, Membership, SamlConnection, Organization).

---

## TASK 3 — DECISION A SPEC (document, do NOT code)

`getCurrentOrg()` resolution (to be implemented in next PR, `lib/tenancy/context.ts`):

1. Read `session.customerId` from `getServerSession()` (or the `auth_token` JWT payload — see commit a2175e1; `signToken` can carry `organizationId`).
2. `Membership.findFirst({ where: { customerId, isDefault: true }, include: { organization: true } })`.
3. If not found, fallback: `Membership.findFirst({ where: { customerId }, orderBy: { createdAt: 'asc' } })`.
4. Cache result in the session/JWT: `session.user.organizationId = org.id`, `session.user.membershipId = membership.id`. Subsequent requests read from JWT, **no DB hit** per request.
5. Invalidate the cache when a `Membership` changes (create/delete/change default) — re-resolve on next request.
6. Expose `getTenantContext()` returning `{ orgId, customerId, role }` for use by `withTenant()` and all `app/api/*` handlers.

> **GAP-1 (must be fixed in PR d):** `Membership` has NO `isDefault` column today (schema lines 806-815). Step 2 references `isDefault: true` which will fail at runtime. PR d must EITHER (a) add `isDefault Boolean @default(false)` to `Membership` + a unique `(customerId, isDefault)` where true, OR (b) change the default rule to "first membership by `createdAt` asc" (the step-3 fallback) and drop `isDefault` entirely. Recommended: (b) is simpler and avoids a partial-unique-index edge case. Decision needed before coding PR d.

> **GAP-2 (cross-tenant by lookup, not by org):** Webhook/admin routes resolve `customer` by `email`/`phone`/`transactionId` (e.g. `app/api/payments/webhook/route.ts:176,228`, `app/api/payment/webhook/route.ts:26`). These will need an explicit org context from the inbound payload (e.g. SAML `ssoEnforcedTenant`, or a `tenant` claim) rather than `getCurrentOrg()`, because the caller is a 3rd party, not a logged-in user. Flagged for PR d design.

---

## TASK 4 — VERIFICATION (read-only)

1. `scripts/check-schema-drift.js` → `DRIFT_RC=0` "OK: no schema-drift violations" (proves this audit modified no schema). ✅
2. `git diff prisma/schema.prisma` → **empty** (no migration yet). ✅
3. `git diff --stat` → only `working/reports/isolation-audit-2026-07-12.md` added. ✅
4. `grep -E "EXCLUDED|GLOBAL|ADD organizationId"` on this file → shows **3 ADD** (Video, Payment, VoiceCall) and **3 EXCLUDE** (Goal, AutonomousTask, TaskRunLog). ✅

---

## Next step (PR d) — NOT started here
- Add `organizationId` to `Video`, `Payment`, `VoiceCall` (+ `@@index`).
- Resolve GAP-1 (Membership default selection).
- Implement `lib/tenancy/context.ts` (`getCurrentOrg`/`getTenantContext`) + `lib/tenancy/withTenant.ts` guard.
- Backfill `organizationId` from `customerId → Membership` (default org) for existing rows.
- Migrate webhook/admin lookups per GAP-2.
- Add RLS + leak tests (6/6) as specified in the original isolation prompt TASK 2.
- All gated by `ai-review.yml` (commit 5d5f827) — phantom/mis-scoped migrations blocked automatically.
