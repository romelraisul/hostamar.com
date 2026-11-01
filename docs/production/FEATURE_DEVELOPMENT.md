# FEATURE_DEVELOPMENT — hostamar.com

## Context

Feature development follows a 6-doc check before coding: PRD, DESIGN, ARCHITECTURE, DATABASE, API, DEBUGGING must all be reviewed before any new feature branch.

**P4 Status: CLOSED** — `/models.json` 404 fixed (was @libsql/isomorphic-ws esbuild bug).
**P5 Status: IN PROGRESS** — f005 CDN Worker (B2 version) deployed, routes pending Zone permission.

## Task

Document branch strategy, PR template, 6-doc check, and review checklist.

## Includes

### Branch Strategy

- `main` — production, auto-deploys via Cloudflare Pages (push to main triggers deploy)
- `develop` — integration branch, merged to main when ready
- `feature/<name>` — feature branches from `develop`
- `fix/<name>` — bug fixes from `develop` or `main`
- `hotfix/<name>` — emergency production fixes from `main`

### PR Template (`.github/pull_request_template.md`)

```
## Summary
What does this PR change?

## 6-Doc Check
- [ ] PRD.md reviewed
- [ ] DESIGN.md reviewed
- [ ] ARCHITECTURE.md reviewed
- [ ] DATABASE.md reviewed
- [ ] API.md reviewed
- [ ] DEBUGGING.md reviewed

## Tests
- [ ] `npm run worker:build` passes
- [ ] P4 probe: 4x200 on https://hostamar.com/{tv,api/tv,api/tv/live,models.json}
- [ ] P5 probe: `curl -s https://hostamar.com/api/tv | jq '.count, .source'` returns live count, "b2-live"
- [ ] vitest suite passes

## Screenshots
(if UI changes)
```

### 6-Doc Check Before Coding

1. **PRD.md** — feature is in scope, monetization defined, B2/Infisical rules followed
2. **DESIGN.md** — `#0E7C3A` brand, Hind Siliguri + Inter, 10px radius, dark mode
3. **ARCHITECTURE.md** — workerd externals respected, no native deps on Workers, B2 not R2
4. **DATABASE.md** — Prisma schema updated if new tables, migration tested, libsql vs Postgres
5. **API.md** — endpoint documented, auth/validation/pagination defined, 353 removed
6. **DEBUGGING.md** — common errors and runbooks reviewed, P4/P5 root causes understood

### Review Checklist

- [ ] No `!important` in CSS
- [ ] All interactive elements ≥44×44px
- [ ] Bangla text uses Hind Siliguri font
- [ ] No new dependencies unless stdlib/native insufficient
- [ ] `cf-ray` present, no `x-vercel` on production
- [ ] AAAA `100::` records untouched
- [ ] P4 probe passes (4x200)
- [ ] P5 probe passes (`/api/tv` returns `source: "b2-live"`, live count > 353)
- [ ] `npm run worker:build` succeeds (11 node:sqlite patches)
- [ ] Secrets not committed (Infisical/env only, [REDACTED] in docs)
- [ ] `grep -r "353" app/api/tv/` returns 0 matches
- [ ] `grep -r "R2_BUCKET" workers/` returns 0 matches

## Output

This document. Referenced in every PR template.