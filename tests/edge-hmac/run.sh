#!/usr/bin/env bash
# Workerd proof that the node:crypto HS256 path behaves in the real runtime.
# Compiles the REAL lib/auth-utils.ts (throwaway secret inlined via --define,
# because local wrangler does not map [vars] onto process.env), mints
# jsonwebtoken@9 fixtures, boots workerd locally (nodejs_compat @ 2024-11-01 =
# the deployed worker's compat date), and asserts the same results Node gave.
set -u
cd "$(dirname "$0")/../.."
export PATH=$(echo "$PATH" | tr ':' '\n' | grep -v '^/mnt/c' | paste -sd:)

SECRET='test-secret-abc123'
node_modules/.bin/esbuild lib/auth-utils.ts --format=esm --outfile=tests/edge-hmac/auth-utils.mjs \
  --define:process.env.JWT_SECRET="\"$SECRET\"" --define:process.env.NODE_ENV="\"production\"" --log-level=error || exit 1
node tests/edge-hmac/gen.mjs || exit 1

printf 'name = "edge-hmac-test"\nmain = "index.mjs"\ncompatibility_date = "2024-11-01"\ncompatibility_flags = ["nodejs_compat"]\n' \
  > tests/edge-hmac/wrangler.toml

env -u CLOUDFLARE_API_TOKEN npx wrangler dev -c tests/edge-hmac/wrangler.toml --port 8788 --ip 127.0.0.1 >/tmp/edge-hmac-dev.log 2>&1 &
DEV=$!
for _ in $(seq 1 45); do
  sleep 2
  curl -sf -m 5 http://127.0.0.1:8788/ >/dev/null 2>&1 && break
done
echo "--- workerd result:"
curl -s -m 30 http://127.0.0.1:8788/ | tee /tmp/edge-hmac-result.json
echo
kill "$DEV" 2>/dev/null; wait "$DEV" 2>/dev/null
echo "--- dev log tail:"
tail -3 /tmp/edge-hmac-dev.log
