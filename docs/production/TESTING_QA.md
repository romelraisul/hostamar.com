# TESTING_QA — hostamar.com

## Context

Testing stack: vitest 4.1.10 (unit), Playwright (E2E), k6 (load). CI in `.github/workflows/`. P4 verification: 4x200 probe on production endpoints.

**P4 Status: CLOSED** — `/models.json` 404 fixed (was @libsql/isomorphic-ws esbuild bug).
**P5 Status: IN PROGRESS** — f005 CDN Worker (B2 version) deployed, routes pending Zone permission.

## Task

Document test types, locations, CI config, and QA procedures.

## Includes

### Test Stack

| Tool | Version | Purpose | Location |
|------|---------|---------|----------|
| vitest | 4.1.10 | Unit tests | `__tests__/` |
| Playwright | E2E | Browser automation | `tests/e2e/` |
| k6 | Load testing | Load/stress | `tests/load/` |

### Unit Tests (vitest)

- Location: `__tests__/` directory
- Run: `pnpm test` or `npx vitest run`
- Coverage: lib functions, validators, API route logic

### E2E Tests (Playwright)

- Location: `tests/e2e/`
- Browser: Chromium (headless in CI, headed locally)
- Coverage: `/tv`, `/api/tv`, `/models.json`, `/dashboard` flows

### Load Tests (k6)

- Location: `tests/load/`
- Target: `https://hostamar.com/models.json` and `/api/tv`
- Threshold: p95 < 200ms, error rate < 1%

### CI (`.github/workflows/`)

- `.github/workflows/ci.yml` — vitest + build on push/PR
- `.github/workflows/deploy.yml` — wrangler deploy on main push
- Mirror sync: 6h GH Actions mirror Turso → Supabase → Neon

### P4 Verification (Production Probe)

```bash
curl -sI https://hostamar.com/models.json | grep -E "HTTP/2|cf-ray|x-vercel"
curl -s https://hostamar.com/models.json | wc -c   # 4491
curl -s -o /dev/null -w "%{http_code}" https://hostamar.com/tv        # 200
curl -s -o /dev/null -w "%{http_code}" https://hostamar.com/api/tv    # 200
curl -s -o /dev/null -w "%{http_code}" https://hostamar.com/api/tv/live  # 200
# All 4 must return 200, cf-ray present, no x-vercel
```

### P5 Verification (f005 CDN Worker)

```bash
# After f005 worker routes active
curl -s https://hostamar.com/api/tv | jq '.count, .source'  # expect live count > 353, "b2-live"
curl -sI https://hostamar.com/models.json | grep -E "cf-ray|cache"  # B2 edge cache hit
curl -s https://hostamar.com/api/tv/live | head -5  # HLS manifest
curl -s https://hostamar.com/models.json | jq '.version, .models | length'  # v40, 152

# Build verification
npm run worker:build  # must pass with 11 node:sqlite patches
grep -r "353" app/api/tv/  # must return 0 matches
grep -r "R2_BUCKET" workers/  # must return 0 matches
```

### QA Checklist

- [ ] `npm run worker:build` succeeds
- [ ] P4 probe passes (4x200)
- [ ] P5 probe passes (`/api/tv` returns `source: "b2-live"`, live count > 353)
- [ ] vitest suite passes
- [ ] No `x-vercel` on production responses
- [ ] AAAA `100::` records untouched
- [ ] Secrets not committed
- [ ] `grep -r "353" app/api/tv/` returns 0 matches
- [ ] `grep -r "R2_BUCKET" workers/` returns 0 matches
- [ ] Cloudflare Purge Everything + Custom Purge done after deploy

## Output

This document. Run before every production deploy.