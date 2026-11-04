# Hostamar.com — Models API (models.json v40)

**Last verified:** 2026-11-04 Asia/Dhaka  
**Status:** 200 OK, 4491B, cf-ray HIT, x-f005-worker true

## Live Response

```json
{
  "version": 40,
  "models": {
    "total": 152,
    "categories": 10,
    "worker": "nvidia/nemotron-3-ultra-550b-a55b",
    "ground": "llama-3.2-11b-vision-instruct",
    "edge_tools": 53,
    "renders": 168,
    "b2_buckets": ["hostamar-prod"]
  }
}
```

Headers: `Content-Type: application/json`, `Cache-Control: public, max-age=300`, `X-Source: b2-live-private`, `X-f005-Worker: true`

## Root Cause of 404 (Fixed P4)

**Error:** `Could not resolve @libsql/isomorphic-ws in hrana-client`

**Cause:** `@libsql/isomorphic-ws` is a Node.js-only module (uses `ws` for WebSocket). It cannot run in workerd (Cloudflare Workers runtime). The OpenNext build was bundling it, causing the worker to fail at startup with module resolution error.

**Fix applied (2026-11-01):**
1. `pnpm store patch` — created local patch for `@libsql/isomorphic-ws` to mark as external
2. `wrangler-pages.toml`: `external = ["node:sqlite", "@libsql/isomorphic-ws"]`
3. `open-next.config.ts`: `useWorkerdCondition: true` — ensures workerd-compatible imports
4. Lazy import pattern in `lib/hrana-client.ts`:
   ```typescript
   // Only loads in Node.js context (admin routes), never in edge
   const { createClient } = await import('@libsql/client/web')
   ```

## nvidia-guard Model Gateway

**Endpoint:** `http://127.0.0.1:12436/v1/models` (systemd service `nvidia-guard.service`)

**6 Live Models (Concurrency: 6):**
| Model | Status | Provider |
|-------|--------|----------|
| `z-ai/glm-5.3-flash` | default | nvidia |
| `deepseek-ai/deepseek-v4.1-flash` | active | nvidia |
| `minimaxai/minimax-m3.1-flash` | active | nvidia |
| `stepfun-ai/step-5-preview` | active | nvidia |
| `nvidia/nemotron-3-ultra-550b-a55b` | active | nvidia |
| `nvidia/nemotron-ultra` | active | nvidia |

**Fallback Chain:**
```
freellmapi/auto:fast (nvidia-guard :12436)
    ↓ 429 / insufficient balance
Zhipu fallback (GLM-5.3)
    ↓ fail
hostamar-own-fast :4000 (local ComfyUI RTX 5060 via Gateway 11442)
    ↓ fail
Cloudflare Workers AI (fallback)
```

**Compression:** `kilo-auto/free` @ `api.kilo.ai` (auto-negotiated)

## Verification Commands

```bash
# models.json via f005 worker
curl -s https://hostamar.com/models.json | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f\"version={d['version']}\")
print(f\"total={d['models']['total']}\")
print(f\"categories={len(d['models']['categories'])}\")
print(f\"edge_tools={d['models']['edge_tools']}\")
print(f\"renders={d['models']['renders']}\")
"

# Verify headers
curl -sI https://hostamar.com/models.json | grep -E "HTTP|cf-ray|X-Source|X-f005"

# nvidia-guard local
curl -s http://127.0.0.1:12436/v1/models | jq '.data | length'
# Expected: 6
```