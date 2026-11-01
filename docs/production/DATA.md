# DATA — data stores: Turso primary + mirror chain, B2 object storage, forgejo sqlite, local postgres fleet.

## Primary: Turso (libsql)

- Production DB is **Turso** (libsql protocol) — the AI-video product database ("neondb")
  is accessed through the serverless driver over **port 443**: raw Postgres 5432 egress is
  DPI-blocked, so no direct TCP database connections from here. Prisma uses
  `@prisma/adapter-libsql` over `@libsql/client` (WASM engine + `@libsql/client/web`
  fetch adapter on Workers — no fs, no native deps).
- Schema: `prisma/schema.prisma` (libsql provider, driverAdapters). DDL applies via
  `turso db shell` / `scripts/apply-turso-ddl.js`, not `prisma migrate dev`.

## Mirror chain (6h)

- **Turso → Supabase → Neon**, mirrored on a 6-hour schedule via a GitHub Actions
  workflow. Caveat: GitHub push is currently blocked (account suspended, appeal
  #4892433) — treat GitHub-hosted automation as at-risk; verify during shifts that the
  mirror actually ran (row counts roughly converge, modulo the 6h window).
- Mirrors are read-path insurance; Turso stays the source of truth. Never write product
  data directly to Supabase/Neon.

## Backblaze B2 (object storage)

- Bucket **hostamar-prod** (PRIVATE) on the f005/us-east-005 region; media CDN host
  `f005.backblazeb2.com/file/hostamar-prod`.
- Contents: **317+ TV mp4s** plus manifests (models.json, tv.json, live.json) — uploads
  done with **rclone** and **SHA1-verified** after transfer (a mismatch = re-upload, never
  ignore).
- Access: S3-compatible API (endpoint s3.us-east-005.backblazeb2.com) via AWS SDK for
  signed URLs from the Cloudflare Worker; delivery over the Bandwidth Alliance (zero
  egress fee). The bucket is never public — see SECURITY.md.

## Forgejo (git)

- git.hostamar.com runs on **SQLite** (self-contained; backed up with the forgejo
  container volume). It is the LIVE git host — GitHub push is blocked (appeal #4892433),
  GitLab/Codeberg are mirrors.

## Local postgres fleet (docker hostamar-postgres, host port 5432)

- One docker container owns host port **5432**: **hostamar-postgres**, hosting databases
  **forgejo, medusa, coolify, infisical, teldrive**.
- Postgres **roles**: `hostamar`, `teldrive`, `forgejo` — map each DB to its role; new
  services reuse this instance + redis-foundation instead of new servers.
- Note the boundary: docker hostamar-postgres holds 5432; the podman **postgres-15432**
  container (host port **15432**) is the Infisical backend DB. They are different
  instances — confusing them is exactly how the Infisical outage of 2026-11-01/02
  happened (INCIDENTS.md).

## Data handling rules

- Never commit DB dumps or env files; Infisical is the only secret store.
- Manifest sync (`scripts/sync-manifest-to-b2.mjs`) counts published rows from the live DB
  and writes tv.json to B2 — keep DB counts and B2 manifests convergent.
- The old hardcoded 353 fallback is gone; data truth flows DB → tv.json → edge cache.
