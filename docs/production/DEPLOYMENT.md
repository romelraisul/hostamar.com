# DEPLOYMENT — deploy paths: Vercel via git push, Workers via wrangler, tunnel topology, git remotes and the GitHub block.

## Deploy surfaces

| Surface | Deploy path | Config |
|---------|-------------|--------|
| Next.js app (primary product origin) | push to `main` → Vercel project **hostamar-build** | `vercel.json` (build + cache headers) |
| Next.js on Cloudflare Workers (OpenNext path) | `npm run worker:build` → `npx wrangler deploy -c wrangler-pages.toml` | `wrangler-pages.toml`, `open-next.config.ts` |
| api-router (api.hostamar.com) | `npx wrangler deploy -c wrangler.toml` | `wrangler.toml`, `workers/api-router.js` |
| f005 CDN worker (B2 edge cache) | build + deploy from `workers/f005-cdn` | `workers/f005-cdn/wrangler.toml` |

## Vercel (push to main)

- `git push` to `main` triggers the Vercel build for project hostamar-build. That is the
  whole deploy pipeline — no manual `vercel --prod` needed in the normal loop
  (`npm run vercel-deploy` exists for manual pushes).
- `prepush` hook runs `bash scripts/check-vercel-quota.sh && npm run build` — respect the
  free-tier daily deployment cap; check quota before stacking deploys.
- `vercel.json` sets short cache headers on `/api/tv` (10s + SWR 30) and `/api/tv/live`
  (5s) so manifests stay fresh without burning function invocations.
- **Gating fact:** Vercel hostamar-build builds from GitHub. GitHub push is currently
  BLOCKED — account suspended, appeal #4892433. Until the appeal lands, pushes to main do
  NOT reach Vercel. Do not claim GitHub CI is active anywhere.

## Cloudflare Workers (wrangler)

- `wrangler-pages.toml` carries the workerd externals from the P4 fix:
  `external = ["node:sqlite", "@libsql/isomorphic-ws"]`; the build chain is
  `worker:build` → opennextjs-cloudflare build → `scripts/patch_handler_sqlite.mjs`
  (stubs `require("node:sqlite")` in handler.mjs) → `scripts/sync-manifest-to-b2.mjs`
  (uploads models.json v40 + regenerates tv.json from the live DB count).
- `worker:deploy` populates B2 then runs wrangler with the CI token; the token has
  Workers Scripts:Edit but NOT Zone Workers Routes:Edit, so the api.hostamar.com route is
  managed in the dashboard and intentionally not declared in the toml.
- Worker secrets (PRIMARY_URL, FALLBACK_URL, B2 keys) are set with
  `npx wrangler secret put ...` — never committed.

## Tunnel topology

```
api.hostamar.com (Cloudflare Worker api-router)
   ├── PRIMARY   omni :20128  via Cloudflare tunnel "hostamar-primary"  (PC/WSL)
   └── FALLBACK  hostamar.alwaysdata.net (alwaysdata lite API)
```

- The worker is a thin proxy: 2s primary timeout, circuit breaker (2 consecutive primary
  failures → skip primary for 60s), so callers get the alwaysdata 202 "PC offline,
  your request is queued" instead of a 502 when the host is down — the host is not
  always-on by policy.
- Repoint origins without redeploy: `wrangler secret put PRIMARY_URL` / `FALLBACK_URL`.

## Git remotes

| Remote | Status |
|--------|--------|
| Forgejo — git.hostamar.com | **LIVE**, the working git host for daily pushes |
| GitHub | push BLOCKED (account suspended, appeal #4892433) — also gates Vercel hostamar-build |
| GitLab mirror | push target, secondary |
| Codeberg mirror | push target, secondary |

- Treat Forgejo as the source of truth for day-to-day work; mirror to GitLab/Codeberg for
  redundancy. Never write docs that assume GitHub Actions CI is running.
- Deploy verification after ANY deploy: run the 4x200 probe (`/tv`, `/api/tv`,
  `/api/tv/live`, `/models.json` all HTTP 200) plus the count assertions in TESTING.md
  (models.json 152, /api/tv 362, source b2-cache, b2_only true).
