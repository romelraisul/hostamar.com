# Hostamar.com — Workers & Routes

**Last verified:** 2026-11-04 Asia/Dhaka  
**Status:** hostamar-pages + hostamar-f005-cdn deployed, routes active

## hostamar-pages (OpenNext)

**Config:** `wrangler-pages.toml`

**Critical Rules:**
- Top-level keys ONLY — no keys after `[[rules]]` (they parse as rule members)
- `compatibility_flags = ["nodejs_compat"]`
- `external = ["node:sqlite", "@libsql/isomorphic-ws"]`
- `workers_dev = true` (dev subdomain works)
- `account_id = "e00717304c1139751214b8cda5078a8d"`

**Routes (managed in Cloudflare Dashboard, NOT in TOML):**
- `hostamar.com/*` → Custom domain attached via dash
- `www.hostamar.com/*` → Custom domain attached via dash

**KV Namespace:** `HOSTAMAR_CATALOG` (id: `7ce14c69f70d48449dd50edd4be3dca3`)

**Build:** `npm run worker:build` → `opennextjs-cloudflare build` → patches 11 `require("node:sqlite")` occurrences

## hostamar-f005-cdn (Video CDN)

**Config:** `workers/f005-cdn/wrangler.toml`

**Routes (explicit, NO wildcard `api/tv*` intercept):**
| Pattern | Zone | Purpose |
|---------|------|---------|
| `hostamar.com/models.json` | hostamar.com | Models manifest |
| `hostamar.com/tv` | hostamar.com | TV page proxy |
| `hostamar.com/tv/*` | hostamar.com | Signed video URLs |
| `hostamar.com/api/tv` | hostamar.com | TV API (playlist, manifest) |
| `hostamar.com/api/tv/manifest` | hostamar.com | TV manifest |
| `hostamar.com/api/tv/live` | hostamar.com | HLS live |
| `f005.hostamar.com/*` | hostamar.com | Worker custom domain |

**Secrets (MUST be set via `wrangler secret put`, NOT in `[vars]`):**
```bash
npx wrangler secret put B2_APPLICATION_KEY_ID
npx wrangler secret put B2_APPLICATION_KEY
```

**Build:** `esbuild` with `--external:@libsql/isomorphic-ws --external:node:sqlite`

## Why No Wildcard `api/tv*`

The f005 worker handles `/api/tv` and `/api/tv/manifest` explicitly. The Next.js app handles `/api/tv/playlist`, `/api/tv/stable-channels`, `/api/tv/status`, `/api/tv/heartbeat` via the hostamar-pages worker. Wildcard routes would intercept and break the Next.js API routes.

## Route Verification

```bash
# Check f005 worker routes
curl -sI https://hostamar.com/models.json | grep -E "X-f005|X-Source"
# Expected: X-f005-Worker: true, X-Source: b2-live-private

curl -sI https://hostamar.com/tv/hydrogen-economy-narrated.mp4 | grep -E "X-f005|X-Source"
# Expected: X-f005-Worker: true, X-Source: b2-live

# Check hostamar-pages worker (Next.js app)
curl -sI https://hostamar.com/api/tv/playlist?format=json | grep -E "X-Source"
# Expected: X-Source: b2-live-private-signed
```