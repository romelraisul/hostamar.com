#!/usr/bin/env bash
# Ship hostamar.com → Cloudflare Worker "hostamar-pages".
# Recipe (proven 2026-10-09): build ONCE, then retry the deploy up to 6x —
# CF API uploads from this WSL host run 0.3-0.6 MB/s and roughly half the
# attempts die "fetch failed" AFTER the assets upload. That is a network
# pathology, not a bundle bug: the same failure hits a 12 MB probe.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
# Linux node must win over the Windows .cmd shims on PATH
export PATH="$(echo "$PATH" | tr ':' '\n' | grep -v '^/mnt/' | paste -sd:)"
unset CLOUDFLARE_API_TOKEN

echo "== build $(date +%H:%M:%S)"
npm run build || exit 1
npx opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion || exit 1

# Cloudflare Workers: a single asset must stay under 25 MiB
find .open-next/assets -type f -size +25M -printf '%s %p\n' | sort -nr

for i in 1 2 3 4 5 6; do
  echo "== deploy attempt $i $(date +%H:%M:%S)"
  if npx wrangler deploy -c wrangler-pages.toml 2>&1 | tee /tmp/ship-pages-$i.log | tail -5; then
    grep -qE 'Uploaded|Deployed|Version ID' /tmp/ship-pages-$i.log && { echo "== deployed on attempt $i"; break; }
  fi
  sleep 5
done
grep -hE 'Version ID|Current Version' /tmp/ship-pages-*.log | tail -3
