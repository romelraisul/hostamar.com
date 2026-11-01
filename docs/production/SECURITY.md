# SECURITY — secret store, WAF, private-bucket policy, token hygiene, no-money constraints.

## Secret store: self-hosted Infisical

- Infisical runs self-hosted on **:8089** (podman) with redis-infisical + postgres-15432
  as its dependencies; project id `10b51614-379b-48e6-b014-80f3517be157`.
- Env mirror: `/home/romel/automation/infisical.env`, **chmod 600**. It is a mirror, not
  the source of truth — Infisical is. NEVER commit either anywhere.
- All services read secrets from Infisical (or the env mirror); no secret lives in git,
  in wrangler.toml, or in a Dockerfile. Worker secrets go through
  `npx wrangler secret put ...` at deploy time.
- If Infisical is down: restore per RUNBOOK.md (redis-infisical → postgres-15432 →
  infisical; health on 127.0.0.1:8089). Known failure mode: docker hostamar-postgres
  stealing port 5432 (INCIDENTS.md).

## WAF rules

- Rate limit: **100 requests / 10 seconds per IP** on the zone.
- API WAF additions are scripted (`scripts/add-api-waf-rules.sh`) — apply rule changes via
  script, not by hand, so they are reproducible.
- When debugging "mysterious" 429/403 from serverless self-probes, check WAF/bot rules
  before touching code.

## Private-bucket-only policy (permanent)

- B2 bucket `hostamar-prod` is PRIVATE. Video delivery is exclusively signed URLs issued
  by a Cloudflare Worker (AWS SDK S3Client getSignedUrl) with Bandwidth Alliance egress.
- **Making the bucket public is permanently rejected** — do not revisit, do not "temporarily"
  flip it for debugging. If an object 403s, fix the signing flow, not the bucket policy.

## Token hygiene

- Cloudflare API token: `cfut_`-prefixed value lives ONLY in Infisical. Current scope set:
  **Workers Scripts:Edit + Email:Edit + DNS:Edit**; Zone Workers Routes:Edit is NOT
  included — that is why api.hostamar.com routes are managed in the dashboard and the
  toml does not declare routes. **Token regen with zone-routes scope is pending.**
- Rotate a token by: regen → update in Infisical → update the env mirror → re-run the
  affected deploys. Never paste token values into chat, logs, or docs (docs reference
  names and scopes only).
- The 6-hour Turso→Supabase→Neon mirror runs via GitHub Actions — with the GitHub account
  suspended (appeal #4892433), verify the mirror actually fired during shifts; do not
  claim GitHub CI is active.

## DNS guard

- The `AAAA 100::` records for hostamar.com / www.hostamar.com are Cloudflare Pages-managed
  proxies. **They must never be deleted** — deleting them breaks the Pages routing model.
  DNS edits happen via script with review, not ad-hoc dashboard clicks.

## Money constraints

- **No money, no card on file, anywhere.** Zero paid services; every component must run on
  a free tier. Any feature that requires a paid plan or a card is a design rejection, not
  a TODO.
- bKash tokenized checkout is PENDING: until it lands there is no payment path in
  production, and no test charges are allowed.

## Secrets-in-code discipline

- New code must not add fallback secret literals (no `process.env.X || 'literal'` on auth
  paths) — fail closed instead.
- Displayed outputs sometimes redact secret-looking strings; verify on-disk bytes with
  `od -c`/`grep -c` before "fixing" a secret that looks mangled in tool output.
