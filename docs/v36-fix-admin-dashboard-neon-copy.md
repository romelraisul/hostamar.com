# V36 — Admin goes to customer dashboard: root cause + fix

**Date:** 2026-09-20 · **Status:** SHIPPED

## Symptom

Admin email login lands on `/dashboard` (customer, 459 lines) instead of `/admin` (1156 lines).

## Root causes (2, both real)

1. **Turso `Customer.role = 'customer'`** for `romelraisul@gmail.com`. Neon data was never copied — but crucially **Neon is DEAD**: `Your account or project has exceeded the quota` on connect. Full Neon→Turso copy is impossible; nothing left to copy from. Turso already held the 2 Customer rows (created via earlier signups), only the role column was wrong.
2. **`app/login/page.tsx:58` hardcoded `router.push('/dashboard')`** for every successful login — role ignored. The API returns `user.role` but the client never read it.

## Fixes

1. Direct DB fix (Neon unreachable, so no copy script — the data already exists):
   ```sql
   UPDATE Customer SET role='admin' WHERE email='romelraisul@gmail.com'
   -- verified: romelraisul@gmail.com | admin ; romelraisul@outlook.com | customer
   ```
2. `app/login/page.tsx`: `router.push(data.user?.role === 'admin' || data.user?.role === 'superadmin' ? '/admin' : '/dashboard')`

## What was already correct (no changes needed)

- `middleware.ts:234` already blocks non-admin from `/admin` (redirects to /dashboard) — the guard existed; the DB row just never said admin.
- SSO callback (`app/api/auth/sso/callback/route.ts:113`) already routes admin → `/admin`.
- Login API already returns `role` in JSON.

## Skipped

- Full Neon→Turso data copy script — Neon quota-dead, and Turso already has the rows that matter. If Neon ever revives, `scripts/apply-turso-ddl.js` pattern + a `pg` reader would do it.
- `ADMIN_EMAILS` env var — role lives in DB, middleware reads DB-backed JWT role. A second source of truth would drift.

## Verify after deploy

Login with romelraisul@gmail.com → should land on `/admin`. `romelraisul@outlook.com` (customer) → `/dashboard`.
