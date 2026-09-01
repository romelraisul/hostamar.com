#!/usr/bin/env bash
# V23 — Prebuilt deploy: build locally, upload the output, 0 Vercel Build Time.
# Usage: VERCEL_TOKEN=<token> bash scripts/vercel-prebuilt-deploy.sh
# Pro-plan guard: with 92h/100h build time burned, every remote build (~5-6 min)
# costs real quota. This path makes Vercel only UPLOAD .vercel/output.
set -e
if [ -z "$VERCEL_TOKEN" ]; then
  echo "ERROR: set VERCEL_TOKEN env (new scoped token — never the old vcp_)."
  exit 1
fi
echo "[1/3] Local build (your CPU, free)..."
npm run build
echo "[2/3] vercel build (packages .vercel/output)..."
npx vercel build --prod --token="$VERCEL_TOKEN"
echo "[3/3] Deploy prebuilt..."
npx vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"
echo "✓ Deployed with 0 Vercel build time. Future: prefer this over git-push builds."
