# COSTS — free-tier map: every service and its $0 path; zero paid services policy.

## Policy

Zero paid services. **No card on file anywhere** — any feature needing a paid plan or a
card is rejected at design time, not deferred. Every component below runs (or must run)
on its free tier.

## Free-tier map

| Service | Role | Free tier in use |
|---------|------|------------------|
| **Vercel** | Next.js origin (project hostamar-build) | Hobby: free hosting + serverless functions; daily deploy cap watched via `scripts/check-vercel-quota.sh` (prepush hook) |
| **Cloudflare Workers** | api-router, f005 CDN worker, signed URLs | Free plan: 100k req/day; workers far under the 10ms CPU limit by design |
| **Cloudflare Tunnel** | hostamar-primary → omni :20128 | Free; replaces any paid ingress |
| **Cloudflare R2** | NOT USED — path kept R2-free; all objects on B2 | — |
| **Backblaze B2** | Private object storage (hostamar-prod) | Free tier (10GB storage); egress $0 via **Bandwidth Alliance** with Cloudflare |
| **Turso** | Primary DB (libsql) | Free tier; libsql over 443 — no paid Postgres hosting |
| **Supabase / Neon** | DB mirrors (6h chain) | Free tiers only |
| **kilo.ai** | LLM fallback pool | Free access — 384 models |
| **nvidia (guard :12436)** | Local LLM serving | Free inference endpoint, 6 models |
| **alwaysdata** | Fallback origin (hostamar.alwaysdata.net) | 1GB forever-free plan |
| **Forgejo** | Git hosting (git.hostamar.com) | Self-hosted on the local fleet — $0 |
| **Infisical** | Secret store | Self-hosted on the local fleet — $0 |

## Where the $0 model is structural, not incidental

- **Egress:** video delivery costs $0 because B2 + Cloudflare are Bandwidth Alliance
  partners — this is why the bucket must never go public (public B2 egress would be the
  one place real money could leak).
- **DB:** Turso over 443 avoids both paid Postgres hosting and the DPI-blocked 5432.
- **Compute:** the host is not always-on; the api-router's alwaysdata fallback +
  202-queue response is the free alternative to a paid always-on origin.
- **CI:** Forgejo (self-hosted) + mirrors replace paid CI; GitHub Actions usage is
  currently at-risk anyway (account suspended, appeal #4892433).

## Rules

- Before adding ANY dependency, name its free tier and its failure mode when the free
  tier is exceeded. If there is no free tier, the dependency is rejected.
- Watch quota burn (Vercel deploys, Workers req/day) during shifts; the prepush quota
  check exists so we never surprise-exceed a free plan.
- Never enter payment credentials anywhere in the stack; bKash checkout remains PENDING
  and unpaid until the owner ships it.
