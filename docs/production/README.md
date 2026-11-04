# Production docs index — hostamar.com; 15 docs, one line of purpose each.

## The 15 docs (2026-11-04 verified)

| # | Doc | Purpose |
|---|-----|---------|
| 0 | [00_OVERVIEW.md](00_OVERVIEW.md) | Project goal, 4x200 + 13/13 green, 374 videos, 152 models, brand colors, stack summary. |
| 1 | [01_ARCHITECTURE.md](01_ARCHITECTURE.md) | Full stack map: OpenNext edge, Turso libSQL, B2 private, f005 worker, WSL fleet, runtime split. |
| 2 | [02_INFRASTRUCTURE_B2_CLOUDFLARE.md](02_INFRASTRUCTURE_B2_CLOUDFLARE.md) | 7 B2 buckets, private policy, Bandwidth Alliance, f005 worker SigV4, Cloudflare DNS/routes, limits. |
| 3 | [03_TV_PIPELINE.md](03_TV_PIPELINE.md) | 374 videos, build-time keys → runtime signing via f005, player retry logic, 403 loop fix. |
| 4 | [04_AUTH_LOGIN.md](04_AUTH_LOGIN.md) | Custom JWT, NextAuth disabled (501), `sso_callback_failed` amber notice, HttpOnly cookie. |
| 5 | [05_MODELS_API.md](05_MODELS_API.md) | models.json v40 (152 models), nvidia-guard 6 models, fallback chain, P4 404 root cause. |
| 6 | [06_WORKERS_AND_ROUTES.md](06_WORKERS_AND_ROUTES.md) | hostamar-pages + f005-cdn configs, explicit routes (no wildcard), secrets via wrangler. |
| 7 | [07_FLEET_CONTAINERS.md](07_FLEET_CONTAINERS.md) | 9 podman + 10 systemd services, ports, Infisical DB (15433 real, 5432 decoy), tunnel 2d67d851. |
| 8 | [08_GUARDS.md](08_GUARDS.md) | 7 guards (AlwaysData, Cloudflare, B2, WSL, UA, TV, nvidia), fallback chain, file limit/state.db fixes. |
| 9 | [09_DEPLOYMENT.md](09_DEPLOYMENT.md) | Mask-safe Python, persistent paths, build→deploy→verify, Git push to Forgejo (live). |
| 10 | [10_BRAND_UI.md](10_BRAND_UI.md) | Verified palette, Bengali-first copy, 1cr=1 taka, bKash 01822417463, component styles. |
| 11 | [11_GIT_BACKUP.md](11_GIT_BACKUP.md) | Forgejo live, GitLab mirror, GitHub suspended (#4892433), Codeberg quota-blocked, 2024 commits. |
| 12 | [12_SECURITY_SECRETS.md](12_SECURITY_SECRETS.md) | Infisical restored (171 secrets), OpenClaw gateway, leaked tokens rotated, rotation protocol. |
| 13 | [13_TESTING_PROBES.md](13_TESTING_PROBES.md) | 4x200 + 13/13 probes, signed-URL test, guard health, container checks, 53 vitest PASS. |
| 14 | [14_RUNBOOK.md](14_RUNBOOK.md) | 15 common fixes: browser tool limit, file limit, state.db, TV 403, login SSO, AlwaysData, Codeberg, full deploy. |

## Verified live facts these docs are grounded on

- `/models.json` v40: models.total 152, categories 10, edge_tools 53, renders 168.
- `/api/tv`: count 362, source b2-cache, b2_only true; `/tv /api/tv /api/tv/live /models.json` all HTTP 200.
- B2 bucket `hostamar-prod` PRIVATE, signed URLs via Cloudflare Worker + Bandwidth Alliance.
- `api.hostamar.com` = api-router worker (tunnel primary omni :20128, alwaysdata fallback).
- Turso primary, 6h mirror chain Turso→Supabase→Neon; WAF 100 req/10s.
- GitHub push BLOCKED (appeal #4892433) — Forgejo `git.hostamar.com` is the live git host.
- nvidia-guard :12436: 6 live models, concurrency 6, fallback chain verified.
- TV pipeline: 374 videos, runtime-signed URLs, player retry-once-then-advance.

## Legacy docs still present (untouched)

`AGENTS.md, AGENT_SYSTEM.md, AUTH_SECURITY.md, DATABASE.md, DEBUGGING.md,
FEATURE_DEVELOPMENT.md, INTEGRATIONS.md, MCP_CONNECTION.md, P4_VERIFICATION.md, PLAN.md,
SETUP.md, TESTING_QA.md, ACCESS.md, API.md, API_SPEC.md, ARCHITECTURE.md, BRAND_GUIDELINES.md,
BUSINESS_MODEL.md, CHANGELOG.md, COSTS.md, DATA.md, DESIGN.md, DEPLOYMENT.md, INCIDENTS.md,
OPERATIONS.md, ROADMAP.md, RUNBOOK.md, SECURITY.md, TV_PIPELINE.md` remain from earlier work — consult them for agent roster / auth / DB-schema detail; the 00-14 kit above is the operational source of truth.

## Verification commands

```bash
# Count docs
ls -1 /home/romel/hostamar.com/docs/production/0*.md | wc -l
# Expected: 15

# 4x200 probe
for p in /tv /api/tv /api/tv/live /models.json; do
  echo -n "$p "; curl -s -o /dev/null -w "%{http_code}\n" "https://hostamar.com$p"
done

# 13/13 endpoints
for u in https://hostamar.com/ https://hostamar.com/login https://hostamar.com/pricing \
  https://hostamar.com/api/v1/models https://hostamar.com/api/store/products \
  https://hostamar.com/tv https://hostamar.com/tv/manifest.json \
  https://hostamar.com/api/tv https://hostamar.com/api/tv/playlist \
  https://hostamar.com/api/tv/stable-channels https://hostamar.com/api/tv/status \
  https://hostamar.com/api/tv/heartbeat https://hostamar.com/admin \
  https://hostamar.com/api/admin/stats https://hostamar.com/models.json; do
  echo -n "$u: "; curl -s -o /dev/null -w "%{http_code}\n" -m 10 "$u"
done

# Signed video playback
curl -I "$(curl -s https://hostamar.com/api/tv/playlist?format=json | python3 -c "import json,sys; print(json.load(sys.stdin)['videos'][0]['url'])")" 2>&1 | grep -E "HTTP|content-type|cf-cache|x-source"

# Tests
cd /home/romel/hostamar.com && pnpm test
# Expected: 53 tests pass
```