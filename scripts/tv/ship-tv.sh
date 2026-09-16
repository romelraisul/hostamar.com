#!/usr/bin/env bash
set -euo pipefail
# ship-tv.sh — build the tv/edge map (scripts/tv/edge-map.mjs), regenerate
# entries in public/sitemap.xml for existing /tv/watch/<slug> pages, then
# stage and push. Run from the hostamar-build repo.
REPO=/home/romel/hostamar-build
cd "$REPO"

trap 'echo "FAILED at line $LINENO"' ERR

echo "== edge map =="
node scripts/tv/edge-map.mjs || echo "no edge-map.mjs, continuing"

echo "== seeding sitemap from existing /tv/watch pages =="
python3 scripts/tv/seo_generate.py || echo "seo_generate failed, continuing"

echo "== staging tv work =="
git add public/tv scripts/tv public/og/tv public/sitemap.xml app/tv 2>/dev/null || true
git add -u public/sitemap.xml 2>/dev/null || true

if git diff --cached --quiet; then
  echo "nothing staged"
  exit 0
fi

git diff --cached --stat
echo "== pushing =="
git push origin main