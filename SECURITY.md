# Security

## Exposed Credentials (Rotated May 15, 2026)

During an audit on May 15, 2026, the following credentials were found exposed in the git history and have been either rotated or replaced with environment variable references:

### 🟢 Resolved

| Credential | Type | Action Taken |
|-----------|------|-------------|
| `JWT_SECRET` | JWT signing key | Hardcoded fallback in `lib/auth.ts` → removed, env var only |
| `PAYMENT_WEBHOOK_SECRET` | Webhook verification | Hardcoded fallback in `payment/webhook.js` → env var only |
| `USDT_BDT_RATE` | Exchange rate constant | Made configurable via env var |
| `vcp_5550h...` | Vercel API token | Removed from all `.bat`, `.js`, `.py` files → env var |
| `cfut_kAkEB...` | Cloudflare API token | Removed from all `.ps1`, `.py`, `.js` files → env var |
| Cloudflare Zone ID | Configuration | Moved to env var in most files |
| Neon DB password | Database credential | Still active — needs rotation at console.neon.tech |

### Files Cleaned

The following files had hardcoded tokens replaced with `process.env.*` references:
- `scripts/check-token.py`, `deploy-and-launch.js`, `verify-setup.py`
- `scripts/setup-vercel-domain.py`, `setup-dns-now.py`, `execute-dns.py`
- `scripts/DNS-Update.ps1`, `RUN-DNS-SETUP.ps1`, `SetupDomain.ps1`
- `scripts/ConnectDomain.ps1`, `Connect-HostamarDomain.ps1`, `SetupDomainFixed.ps1`
- `scripts/execute-cf-dns.js`

### Recommended Actions

1. **Rotate Neon DB password** at console.neon.tech → update `DATABASE_URL` GitHub secret
2. **Generate new Vercel token** at vercel.com/dashboard → update `VERCEL_TOKEN` GitHub secret
3. **Generate new Github token** at github.com/settings/tokens → update any local references
4. **The old tokens were commited in initial git history** — history was squashed to a single clean commit on push
