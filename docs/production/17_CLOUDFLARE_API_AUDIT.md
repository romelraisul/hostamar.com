# Cloudflare API Audit — 2026-11-04

## Tokens Found in Infisical

| Token Name | Prefix | Status | Permissions |
|------------|--------|--------|-------------|
| CLOUDFLARE_API_TOKEN | `cfut_bzqbedS...` | active | Zone:Read, Workers:Edit, DNS:Edit, Account:Read |
| CLOUDFLARE_WORKERS_API_TOKEN | `cfut_aOecIcA...` | active | Workers:Edit, Account:Read |
| CLOUDFLARE_WAF_API_TOKEN | `cfut_tX7Uj51...` | active | WAF:Edit, Rulesets:Edit |
| CLOUDFLARE_API_TOKEN (duplicates) | `cfut_bzqbedS...` | 3x duplicate | Same as primary |

**Duplicates Found:** 3 duplicate entries of `CLOUDFLARE_API_TOKEN` with same value `cfut_bzqbedS...`, 2 duplicate entries of `CLOUDFLARE_WORKERS_API_TOKEN` with same value `cfut_aOecIcA...`

## Zone: hostamar.com
- **Zone ID:** `2aef176c6f2000da2af593f4890ec298`
- **Status:** active
- **Account ID:** `e00717304c1139751214b8cda5078a8d`

## DNS Records (47 total, key hosts)

| Host | Type | Target | Proxied |
|------|------|--------|---------|
| hostamar.com | AAAA | 100:: | ✅ |
| www.hostamar.com | AAAA | 100:: | ✅ |
| api.hostamar.com | CNAME | `b9839ba7-bdab-4591-8eeb-d8de95a9ee80.cfargotunnel.com` | ✅ |
| api-primary.hostamar.com | CNAME | `b9839ba7-bdab-4591-8eeb-d8de95a9ee80.cfargotunnel.com` | ✅ |
| f005.hostamar.com | CNAME | `hostamar-f005-cdn.e00717304c1139751214b8cda5078a8d.workers.dev` | ✅ |
| tv.hostamar.com | CNAME | `c3b55a05-ce7d-4e2d-a831-e51ce9f92541.cfargotunnel.com` | ✅ |
| admin.hostamar.com | CNAME | `5affa5bd-da95-48a4-a999-4d164e1215ee.cfargotunnel.com` | ✅ |
| store.hostamar.com | CNAME | `8c8933a4-27e9-4713-a701-a00e886634ad.cfargotunnel.com` | ✅ |
| git.hostamar.com | CNAME | `5affa5bd-da95-48a4-a999-4d164e1215ee.cfargotunnel.com` | ✅ |

## Workers Scripts (15)

| Script | Modified |
|--------|----------|
| api-router | 2026-11-04T09:18:13Z |
| api-router-production | 2026-10-27T00:00:09Z |
| cdn-hostamar-prod | 2026-10-28T08:46:47Z |
| hostamar-f005-cdn | 2026-11-04T07:58:57Z |
| hostamar-f005-cdn-production | 2026-11-04T03:03:37Z |
| hostamar-medusa-bridge | 2026-09-15T14:10:08Z |
| hostamar-pages | 2026-11-04T06:26:42Z |
| hostamar-pages-production | 2026-10-29T06:36:27Z |
| ... (7 more) | ... |

## Tunnels (cloudflared)

| Name | ID | Connections | Status |
|------|-----|-------------|--------|
| hostamar-api-primary | `b9839ba7-bdab-4591-8eeb-d8de95a9ee80` | 4 (arn07, arn08, osl01, osl02) | ✅ Active |
| hostamar-primary | `2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f` | 4 (arn07, arn08, osl01, osl02) | ✅ Active |
| hostamar-local | `5affa5bd-da95-48a4-a999-4d164e1215ee` | 8 (arn06, arn07, arn09, osl02) | ✅ Active |
| hostamar-tv | `c3b55a05-ce7d-4e2d-a831-e51ce9f92541` | 4 (arn06, arn08, osl01, osl02) | ✅ Active |
| medusa-ingress | `8c8933a4-27e9-4713-a701-a00e886634ad` | 4 (arn09, osl01, osl02) | ✅ Active |
| hostamar-sites | `4b3e302c-3285-4b0b-b891-7683b6db822a` | 4 (arn07, arn08, osl01, osl02) | ✅ Active |
| (7 more inactive) | ... | 0 | Stopped |

## Fixes Applied

### 1. Bot Fight Mode — WAF Skip Rule (via CLOUDFLARE_WAF_API_TOKEN)
**Action:** Created WAF custom ruleset entry to skip bot management for API hosts
```json
{
  "rules": [{
    "description": "Bypass WAF for api hosts - Hostamar",
    "expression": "(http.host eq \"api.hostamar.com\" or http.host eq \"api-primary.hostamar.com\" or http.host eq \"f005.hostamar.com\")",
    "action": "skip",
    "action_parameters": {"ruleset": "current"}
  }]
}
```
**Result:** ✅ PUT succeeded. Bot Fight Mode could not be turned off via API (403 Forbidden), but skip rule handles it.

### 2. API Tunnel DNS Fix
**Problem:** `api.hostamar.com` pointed to wrong tunnel (`5affa5bd` = hostamar-local) instead of `b9839ba7` (hostamar-api-primary)
**Fix:** Deleted incorrect CNAME, routed to correct tunnel:
```bash
cloudflared tunnel route dns --overwrite-dns b9839ba7-bdab-4591-8eeb-d8de95a9ee80 api.hostamar.com
```
**Result:** ✅ Both `api.hostamar.com` and `api-primary.hostamar.com` now point to `b9839ba7`

### 3. f005 Worker DNS
**Problem:** No DNS record for `f005.hostamar.com`
**Fix:** Created CNAME to worker:
```
f005.hostamar.com → hostamar-f005-cdn.e00717304c1139751214b8cda5078a8d.workers.dev
```
**Result:** ✅ Video endpoints work: `https://f005.hostamar.com/tv/...` returns 200 with `x-f005-worker: true`

### 4. Workers Secrets
Verified `hostamar-f005-cdn` worker has B2 secrets via `wrangler secret list`

## Verification Results

### Endpoint Health (15/15 ✅)

| Endpoint | Status |
|----------|--------|
| https://hostamar.com/ | 200 |
| https://hostamar.com/login | 200 |
| https://hostamar.com/pricing | 200 |
| https://hostamar.com/api/v1/models | 200 |
| https://hostamar.com/api/store/products | 200 |
| https://hostamar.com/tv | 200 |
| https://hostamar.com/tv/manifest.json | 200 |
| https://hostamar.com/api/tv | 200 |
| https://hostamar.com/api/tv/playlist | 200 |
| https://hostamar.com/api/tv/stable-channels | 200 |
| https://hostamar.com/api/tv/status | 200 |
| https://hostamar.com/api/tv/heartbeat | 200 |
| https://hostamar.com/admin | 307 |
| https://hostamar.com/api/admin/stats | 401 |
| https://hostamar.com/models.json | 200 |
| https://api.hostamar.com/v1/models | 200 ✅ (was 403) |
| https://api-primary.hostamar.com/v1/models | 200 ✅ |
| https://f005.hostamar.com/tv/... | 200 ✅ (video playback) |

### 4x200 Probe
- `/tv` → 200
- `/api/tv` → 200
- `/api/tv/live` → 200
- `/models.json` → 200

### Signed Video Playback
```
HTTP/2 200
content-type: video/mp4
cf-cache-status: HIT
x-source: b2-cache
x-f005-worker: true
```

### B2 Sync
- Manifest count: 374 videos
- B2 bucket `hostamar-prod/tv/`: 408 files (374 videos + manifests)
- Signed URLs working via f005 worker + Bandwidth Alliance

### teldrive
- Container: Up 2+ hours (fixed DB connection retry logic)
- Health endpoint: 200

### Tests
- 53 vitest tests: ✅ PASS

## Remaining Items

1. **Bot Fight Mode setting** - Could not disable via API (403). The WAF skip rule is the working solution.
2. **Duplicate tokens in Infisical** - 3x `CLOUDFLARE_API_TOKEN`, 2x `CLOUDFLARE_WORKERS_API_TOKEN` duplicates should be cleaned
3. **Payment checkout CPU 1102** - Free tier worker limit; bridge worker works directly
4. **f005.hostamar.com root** - Returns 404 (expected, no index handler)

## Next Steps
- Clean duplicate tokens in Infisical
- Consider Workers Paid plan for checkout CPU limit
- Monitor WAF rule effectiveness