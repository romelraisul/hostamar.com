# ACCESS — access map without secret values: where credentials live and what they allow.

**No secret values appear in this file or anywhere in docs/.** This is a map of WHERE
things live and WHAT they unlock.

## Secret store

- Self-hosted **Infisical** on `127.0.0.1:8089`; project id
  `10b51614-379b-48e6-b014-80f3517be157`.
- Env mirror: `/home/romel/automation/infisical.env` (**chmod 600**). Key names follow the
  `<SERVICE>_<PURPOSE>` pattern (e.g. `*_URL`, `*_TOKEN`, `*_KEY`); values are only in
  Infisical/the mirror — never echoed, never committed.

## Cloudflare

- API token: `cfut_`-prefixed value stored in Infisical. Scope set: **Workers Scripts:Edit
  + Email:Edit + DNS:Edit**. Zone Workers Routes:Edit is NOT granted (api.hostamar.com
  route managed in the dashboard); **regen with zone-routes scope is pending**.
- Worker secrets (PRIMARY_URL, FALLBACK_URL, B2 keys) set via `npx wrangler secret put`.
- `AAAA 100::` records on hostamar.com/www are Pages-managed — never delete.

## Git

- **Forgejo** (git.hostamar.com) — LIVE git host; admin panel at the Forgejo admin path
  on the instance; runs on SQLite; credentials in Infisical.
- **GitHub** — account suspended, **appeal #4892433**; push blocked. Do not retry pushes
  as a "test"; track the appeal.
- GitLab + Codeberg — mirror remotes.
- **Vercel** project **hostamar-build** deploys from GitHub — currently gated by the
  GitHub block.

## Local fleet

- **openclaw gateway** auth token: `~/.openclaw/openclaw.json` — file reference only.
- **postgres roles** (docker hostamar-postgres, host port 5432): `hostamar`, `teldrive`,
  `forgejo` — one role per DB (forgejo, medusa, coolify, infisical, teldrive).
- **podman** services (Infisical, postgres-15432, redis-infisical, forgejo, ...) — access
  via `podman` CLI as the local user; no exposed credentials in compose files.
- **nvidia guard** `127.0.0.1:12436/v1` — local only, no external exposure.

## B2

- Bucket `hostamar-prod` (PRIVATE). Application keys (key id + key) live in Infisical and
  as f005 worker secrets via `wrangler secret put`. Signed-URL issuance is the only read
  path; nobody needs bucket-public access — by policy that option does not exist.

## Rotation rules

- Rotate in this order: regen credential → update in Infisical → update the env mirror →
  re-run affected deploys → verify via TESTING.md probes.
- A credential seen in chat, logs, or a screenshot is burned: rotate it immediately,
  then document the rotation (names/scopes only) in CHANGELOG.md.
