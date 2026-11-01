# Architecture — @libsql/hrana-client WebSocket Patch

## Problem
During OpenNext/Cloudflare Workers build, `esbuild` fails with:
```
Could not resolve "node:sqlite" from @libsql/hrana-client/lib-esm/index.js
```
This is because the hrana-client package has a top-level `export { WebSocket } from "@libsql/isomorphic-ws"` which esbuild tries to resolve at bundle time. In Cloudflare Workers (workerd), `node:sqlite` does not exist.

## Root Cause
The `@libsql/hrana-client` package version 0.7.0 and 0.4.4 include a top-level WebSocket export from the optional `@libsql/isomorphic-ws` module. During esbuild bundling, this import is resolved, but `node:sqlite` is a Node.js built-in that doesn't exist in the workerd runtime.

## Fix Applied
Two changes were made:

### 1. Node_modules patches (already in place)
Patched hrana-client in the pnpm store and project nested copies to lazy-load `@libsql/isomorphic-ws`:
- **Version 0.7.0**: `node_modules/.pnpm/@libsql+hrana-client@0.7.0_.../node_modules/@libsql/hrana-client/lib-esm/index.js`
  - Replaced top-level `export { WebSocket } from "@libsql/isomorphic-ws"` with lazy inside `openWs()`
  - Made `openWs()` async with `WebSocket = (await import("@libsql/isomorphic-ws")).WebSocket`
- **Version 0.4.4**: `node_modules/.pnpm/@libsql+hrana-client@0.4.4_.../node_modules/@libsql/hrana-client/lib-esm/index.js`
  - Same lazy-loading pattern
- **Project nested**: `node_modules/@libsql/client/node_modules/@libsql/hrana-client/lib-esm/index.js`
  - Same lazy-loading pattern

### 2. Build-time patch for OpenNext handler.mjs
Added `scripts/patch_handler_sqlite.mjs` to `worker:build` script in `package.json`:
```
"worker:build": "mkdir -p node_modules/@libsql/client/node_modules/@libsql && cp -rn node_modules/@libsql/isomorphic-ws node_modules/@libsql/client/node_modules/@libsql/ && opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion && node scripts/patch_handler_sqlite.mjs"
```
This patch replaces all `require("node:sqlite")` occurrences in the generated `handler.mjs` with `({})`, preventing esbuild bundle-time failures.

## Persistence
- Node_modules patches survive `pnpm install` when using the patched pnpm store copies
- The `worker:build` script patch ensures handler.mjs is patched after every OpenNext build
- Recommend adding `pnpm.patchedDependencies` entry for `@libsql/hrana-client` if starting fresh

## Verification
After build + deploy, verify:
- `curl -sI https://hostamar.com/models.json | grep -E "cf-ray|HTTP"` → HTTP/2 200 + cf-ray
- `curl -s https://hostamar.com/models.json | wc -c` → 4491
- `curl -s https://hostamar.com/api/tv | jq '.count'` → not 301
- 4x200 probe: /tv /api/tv /api/tv/live /models.json all return 200
