# Production docs index — hostamar.com; 15 docs, one line of purpose each.

## The 15 docs

| # | Doc | Purpose |
|---|-----|---------|
| 1 | [PRD.md](PRD.md) | What hostamar.com is: 3 strategic products, users, shipped vs pending (bKash payments pending). |
| 2 | [DESIGN.md](DESIGN.md) | Frontend design system: existing pages, tokens, Bangla+English conventions. |
| 3 | [ARCHITECTURE.md](ARCHITECTURE.md) | Full stack map: Vercel Next.js, Cloudflare Workers, B2 signed delivery, Turso mirror chain, WSL fleet. |
| 4 | [API.md](API.md) | Public endpoints: /models.json v40, /api/tv family, signed-URL flow, /v1 gateway, WAF. |
| 5 | [DEPLOYMENT.md](DEPLOYMENT.md) | Deploy paths: Vercel push-to-main, wrangler Workers, tunnels, git remotes + GitHub block. |
| 6 | [OPERATIONS.md](OPERATIONS.md) | Daily ops loop: shift health checks, QUILL reports, heartbeat, VM keepalive trap, QR gateway. |
| 7 | [SECURITY.md](SECURITY.md) | Infisical secret store, WAF, private-bucket-only policy, token hygiene, no-money constraints. |
| 8 | [TESTING.md](TESTING.md) | Verification loops: 4x200 probe, count assertions, container/guard health, signed-URL test. |
| 9 | [DATA.md](DATA.md) | Data stores: Turso primary + mirrors, B2 objects, forgejo sqlite, local postgres fleet. |
| 10 | [ROADMAP.md](ROADMAP.md) | Ordered milestones: launch completion → Agent Cloud → Video OS scale → EU-BD GPU market. |
| 11 | [CHANGELOG.md](CHANGELOG.md) | Release log; 2026-11-01/02 MASTER CLOSE entry (VM loop, Infisical, QR gateway, P5, teldrive, guard). |
| 12 | [INCIDENTS.md](INCIDENTS.md) | Postmortems: VM restart loop, Infisical outage, teldrive crash loop, Win→WSL TCP block. |
| 13 | [RUNBOOK.md](RUNBOOK.md) | Recovery procedures: Infisical, teldrive, VM loop, gateway restart, guard health. |
| 14 | [COSTS.md](COSTS.md) | Free-tier map + zero paid services policy (no card on file). |
| 15 | [ACCESS.md](ACCESS.md) | Access map WITHOUT secret values: store locations, scopes, remotes, roles. |

## Verified live facts these docs are grounded on

- `/models.json` v40: models.total 152, categories 10, edge_tools 53, renders 168.
- `/api/tv`: count 362, source b2-cache, b2_only true; `/tv /api/tv /api/tv/live
  /models.json` all HTTP 200.
- B2 bucket hostamar-prod PRIVATE, signed URLs via Cloudflare Worker + Bandwidth Alliance.
- api.hostamar.com = api-router worker (tunnel primary omni :20128, alwaysdata fallback).
- Turso primary, 6h mirror chain Turso→Supabase→Neon; WAF 100 req/10s.
- GitHub push BLOCKED (appeal #4892433) — Forgejo git.hostamar.com is the live git host.

## Legacy docs still present (untouched)

`AGENTS.md, AGENT_SYSTEM.md, AUTH_SECURITY.md, DATABASE.md, DEBUGGING.md,
FEATURE_DEVELOPMENT.md, INTEGRATIONS.md, MCP_CONNECTION.md, P4_VERIFICATION.md, PLAN.md,
SETUP.md, TESTING_QA.md` remain from earlier work — consult them for agent roster /
auth / DB-schema detail; this kit is the operational source of truth.

## Verification commands

```bash
ls -1 docs/production | wc -l
for p in /tv /api/tv /api/tv/live /models.json; do
  echo -n "$p "; curl -s -o /dev/null -w "%{http_code}\n" "https://hostamar.com$p"
done
curl -s https://hostamar.com/api/tv | jq '{count, source, b2_only}'
```
