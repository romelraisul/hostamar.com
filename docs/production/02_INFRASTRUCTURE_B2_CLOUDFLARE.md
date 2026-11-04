# Hostamar.com — Infrastructure: B2 & Cloudflare

**Last verified:** 2026-11-04 13:25 Asia/Dhaka

## Backblaze B2 Buckets (7 Total)

| Bucket | Purpose | Size | Access | Lifecycle |
|--------|---------|------|--------|-----------|
| `hostamar-prod` | Main CDN (videos, models.json, incremental cache) | 1.7GB / 10GB | **Private** | 1 day |
| `hostamar-manifests` | Manifest JSONs (tv/manifest.json, tv.json) | ~few MB | Private | 1 day |
| `hostamar-b2-forgejo` | Forgejo backups | ~ | Private | 30 days |
| `hostamar-b2-webcmd` | Webcmd memory persistence | ~ | Private | 30 days |
| `hostamar-b2-kv-migration` | KV migration data | ~ | Private | - |
| `hostamar-b2-indexnow-cache` | IndexNow cache | ~ | Private | - |
| `hostamar-tv` / `hostamar-videos` | Video source files | ~ | Private | 1 day |

**Critical:** All buckets stay **Private**. Public buckets incur per-GB egress fees. Bandwidth Alliance gives free B2→Cloudflare egress only for private buckets with signed URLs.

## B2 Credentials (Worker Secrets — NOT in vars)

```bash
# Set via wrangler (never in wrangler.toml [vars])
npx wrangler secret put B2_APPLICATION_KEY_ID    # = B2 Key ID (e.g., 005B2_KEY_ID_PLACEHOLDER0000000001)
npx wrangler secret put B2_APPLICATION_KEY       # = B2 Application Key
```

Worker reads from `env.B2_APPLICATION_KEY_ID` / `env.B2_APPLICATION_KEY`.

## Cloudflare Workers

### hostamar-pages (OpenNext)
- **Config:** `wrangler-pages.toml`
- **Account:** `e00717304c1139751214b8cda5078a8d`
- **Custom domains:** `hostamar.com`, `www.hostamar.com` (attached via dash)
- **Routes (dash, not TOML):** `hostamar.com/*`, `www.hostamar.com/*`
- **KV namespace:** `HOSTAMAR_CATALOG` (id: `7ce14c69f70d48449dd50edd4be3dca3`)
- **B2 Incremental Cache:** `hostamar-prod` via S3 API (`s3.us-east-005.backblazeb2.com`)
- **External modules:** `node:sqlite`, `@libsql/isomorphic-ws`
- **Build command:** `npm run worker:build`

### hostamar-f005-cdn (Video CDN)
- **Config:** `workers/f005-cdn/wrangler.toml`
- **Routes (explicit, no wildcard intercept):**
  - `hostamar.com/models.json`
  - `hostamar.com/tv`
  - `hostamar.com/tv/*`
  - `hostamar.com/api/tv`
  - `hostamar.com/api/tv/manifest`
  - `hostamar.com/api/tv/live`
  - `f005.hostamar.com/*`
- **Build:** `esbuild` bundling, `nodejs_compat`
- **Secrets:** `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY` (via wrangler secret put)

## Cloudflare DNS

| Record | Type | Target | Proxy | Notes |
|--------|------|--------|-------|-------|
| `hostamar.com` | AAAA | `100::` | Proxied | **Pages-managed — DO NOT DELETE** |
| `www.hostamar.com` | CNAME | `hostamar-pages.*.workers.dev` | Proxied | Custom domain attached |
| `f005.hostamar.com` | CNAME | `hostamar-f005-cdn.*.workers.dev` | Proxied | Worker custom domain |
| `api.hostamar.com` | CNAME | `api-primary.hostamar.com` | Proxied | Tunnel `hostamar-primary` |
| `tv.hostamar.com` | CNAME | `hostamar.com` | Proxied | HLS endpoint |

**AAAA `100::` is correct** — Cloudflare Pages manages this for apex domain. Deleting breaks custom domain attachment.

## Bandwidth Alliance Verification

```bash
# Signed URL from f005 worker returns 200 video/mp4 with cf-cache-status: HIT
curl -I "https://hostamar.com/tv/$(curl -s https://hostamar.com/api/tv/playlist?format=json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['videos'][0]['url'].split('/')[-1])")" 2>&1 | grep -E "HTTP|content-type|cf-cache"
# Expected: HTTP/2 200, content-type: video/mp4, cf-cache-status: HIT
```

## Worker Deploy Commands

```bash
# hostamar-pages
export CLOUDFLARE_API_TOKEN=$(python3 -c "import re; t=open('/home/romel/automation/infisical.env').read(); m=re.search(r'CLOUDFLARE_API_TOKEN=([A-Za-z0-9_\-]+)', t); print(m.group(1))")
cd /home/romel/hostamar.com && npm run worker:build && npx wrangler deploy -c wrangler-pages.toml

# f005-cdn
cd /home/romel/hostamar.com/workers/f005-cdn && npx wrangler deploy

# Verify secrets
npx wrangler secret list  # Should show B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY
```

## Limits & Guards

| Resource | Limit | Guard Action |
|----------|-------|--------------|
| B2 `hostamar-prod` | 10GB | Alert at 8GB, auto-expire 1 day lifecycle |
| Cloudflare Workers | 100k req/day free | nvidia-guard fallback chain |
| Cloudflare KV | 1GB free | B2 incremental cache offload |
| Cloudflare Pages | Unlimited | Primary deployment target |
| AlwaysData fallback | 1GB forever free | Monitor for suspend risk |

## Verification Commands

```bash
# Check B2 bucket (if b2 CLI configured)
b2 list_file_names hostamar-prod | head -20

# Verify worker routes
curl -s https://hostamar.com/models.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"version={d.get('version')} total={d.get('models',{}).get('total')}\")"
curl -s https://hostamar.com/tv/manifest.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"count={d.get('count')}\")"

# Check f005 worker signed video
curl -I "https://hostamar.com/tv/hydrogen-economy-narrated.mp4" 2>&1 | grep -E "HTTP|content-type|cf-cache-status|x-source"