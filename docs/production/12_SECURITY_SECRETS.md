# Hostamar.com — Security & Secrets

**Last verified:** 2026-11-04 Asia/Dhaka  
**Status:** Infisical restored, 171 secrets, all tokens rotated

## Infisical Secret Store

**Instance:** Self-hosted `infisical-wsl` on podman, `127.0.0.1:8089`
- **Project:** `10b51614-379b-48e6-b014-80f3517be157` (hostamar-foundation, env prod)
- **DB:** `postgres-infisical` (podman, port 15433) — 773 tables, REAL data
- **Decoy DB:** `hostamar-postgres` (docker, port 5432) — EMPTY infisical schema
- **Redis:** `redis-foundation` (podman, port 6379)
- **Health:** `curl -s http://127.0.0.1:8089/api/status` → `{"message":"Ok"}`

**Env Mirror:** `/home/romel/automation/infisical.env` (chmod 600)
- 171 secrets imported (2026-11-02 v0.167 recovery)
- Key names: `*_URL`, `*_TOKEN`, `*_KEY`, `*_SECRET`
- **Never committed** — only in Infisical and local mirror

## Critical Secrets (Names Only)

| Secret | Scope | Rotation |
|--------|-------|----------|
| `CLOUDFLARE_API_TOKEN` | Workers/Pages deploy, DNS | On leak or 90d |
| `B2_APPLICATION_KEY_ID` + `B2_APPLICATION_KEY` | f005 worker, sync script | On leak |
| `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` | Edge DB (libsql/client/web) | On leak |
| `ENCRYPTION_KEY` + `JWT_AUTH_SECRET` | Infisical, custom JWT | On leak (rebuild Infisical) |
| `TV_AGENT_SECRET` | TV agent command polling | On leak |
| `NEXTAUTH_SECRET` | Legacy (NextAuth disabled) | N/A |
| `TELEGRAM_BOT_TOKEN` | Bot notifications | On leak |
| `OPENROUTER_API_KEY` | LLM fallback | On leak |

## OpenClaw Gateway

**Gateway:** `openclaw-gateway.service` (systemd)
- **Auth token:** `~/.openclaw/openclaw.json` (reference only, never print)
- **Port:** 18789 (LAN) — Windows portproxy from WSL
- **Windows LAN IP:** `192.168.10.70` (NOT localhost, NOT WSL IP)
- **Firewall rule:** Required for LAN access
- **Token rotation:** 64-hex, QR regenerated at `/home/romel/openclaw_qr_correct.png` (591B)
- **Phone:** OPPO A38 paired `33dc265e..d67f863`

## Leaked & Rotated Tokens (2026-11-04)

| Token | Prefix | Status | Action |
|-------|--------|--------|--------|
| Vercel | `vca_...` | Rotated | New token in Infisical |
| Cloudflare | `cfut_...` | Rotated | New token in Infisical (has Workers Scripts:Edit, Workers Routes:Edit, Zone:Edit, DNS:Edit, Cache Purge) |
| GitHub | `ghp_...` | N/A | Account suspended, appeal #4892433 |
| JWT | Custom HS256 | Active | `lib/auth-utils.ts` signToken/verifyToken |

## Security Policies

1. **Private buckets only** — `hostamar-prod` never public; signed URLs via f005 worker
2. **Bandwidth Alliance** — B2 → Cloudflare free egress for private buckets
3. **WAF** — 100 req/10s, cap 10s; custom UA rules block curl/default agents
4. **No card on file** — Free tiers only (Cloudflare, Vercel, Neon, Turso, B2)
5. **Infisical SSOT** — All secrets in `/home/romel/automation/infisical.env`, never committed
6. **Custom JWT** — NextAuth disabled (501 stub), HttpOnly cookie, `lib/auth-utils.ts` ultra-defensive

## Rotation Protocol

```bash
# 1. Regenerate credential
# 2. Update in Infisical UI
# 3. Update local mirror
cp /home/romel/automation/infisical.env /home/romel/automation/infisical.env.bak-$(date +%Y%m%d)
# 4. Re-run affected deploys
#    - wrangler secret put for worker secrets
#    - Restart services using env vars
# 5. Verify via TESTING.md probes
# 6. Document in CHANGELOG.md (names/scopes only, no values)
```

## Verification Commands

```bash
# Infisical health
curl -s http://127.0.0.1:8089/api/status | jq '.message'
# Expected: "Ok"

# Secret count (via mirror)
grep -c '^[A-Z_]*_KEY\|^[A-Z_]*_TOKEN\|^[A-Z_]*_SECRET' /home/romel/automation/infisical.env
# Expected: ~171

# Worker secrets
cd /home/romel/hostamar.com/workers/f005-cdn && npx wrangler secret list
# Expected: B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY

# OpenClaw gateway
curl -s http://127.0.0.1:18789/health
# Expected: 200
```