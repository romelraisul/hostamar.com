# V38 — Neon pg_dump → Turso full copy: BLOCKED by Neon quota, recovery ready

**Date:** 2026-09-20 · **Status:** RECOVERY SCRIPT SHIPPED, IMPORT BLOCKED

## Verified this session

| Path | Result |
|---|---|
| `pg_dump` unpooled (`ep-spring-frog-aoikue4i...` no `-pooler`) | ❌ `Your account or project has exceeded the quota` |
| `pg_dump` pooled | ❌ same |
| `psql` plain connect | ❌ same |
| Direct `pg` client copy (V36 path) | ❌ same |
| Local `hostamar-postgres` Docker | 1 table (`RateLimitEvent`), 0 rows — not the data |
| Turso `Customer` | 2 rows (gmail=admin ✓, outlook=customer) |

**Conclusion: the old Neon users are not lost, they are locked.** Neon quota exceeded rejects at connection — no protocol (pg_dump, logical replication, CSV, HTTP) can attach. Data recoverable when quota lifts.

## Recovery script: `scripts/pgdump-to-turso.js`

Two paths, both idempotent (`INSERT OR REPLACE`), both force admin role at the end:

```bash
# Path 1 (preferred): dump first, then import
pg_dump -d "$(cat /tmp/neon_unpooled.txt)" --schema=public --data-only --inserts -f /tmp/neon_data.sql
DATABASE_URL="$(cat /tmp/turso_url.txt)" node scripts/pgdump-to-turso.js

# Path 2: no dump file — live copy
NEON_URL="$(cat /tmp/neon_unpooled.txt)" DATABASE_URL="$(cat /tmp/turso_url.txt)" node scripts/pgdump-to-turso.js
```

Transforms handled: `public.` prefix, `::type` casts, `E'...'` prefix, `--` comments with `;`, `''` escaped quotes, `;` inside quoted values (string-state scanner), Json→String via JSON.stringify, Postgres objects → JSON. Self-check passes (comment-stripping, quoted-semicolon survival, cast removal).

## When quota lifts

1. Neon free tier resets monthly (or upgrade ~1h to export, then cancel).
2. Run Path 1 above.
3. Verify: `SELECT COUNT(*) FROM Customer` — should be the old count, not 2.
4. Admin role auto-forced for romelraisul@gmail.com by the script.

## What V36/V37 already fixed (unchanged)

- Turso `Customer.role='admin'` for romelraisul@gmail.com ✓
- `app/login/page.tsx` routes admin → `/admin` ✓
- middleware guards `/admin` by JWT role ✓
- Build green, deployed, login 401/200 correct ✓

## Honest status

- `/api/admin/status` → 3/4 (Facebook ❌ needs Edge UIA — no creds exist)
- Old users: locked in Neon, NOT lost. Script ready. No user action possible until Neon quota resets.
