#!/bin/bash
# Hostamar — Add hostamar.com as a custom domain in Vercel
# Requires VERCEL_TOKEN environment variable
# Get one at: https://vercel.com/account/tokens

set -e

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ VERCEL_TOKEN not set"
  echo "   Get a token: https://vercel.com/account/tokens"
  echo "   Then run: VERCEL_TOKEN=your_token $0"
  exit 1
fi

PROJECT_ID="prj_DHjSYgYzwWeS0XY5iZzm0HQ6sIui"
ORG_ID="team_2joO6ASiPDBFcNKkoFf0pwLg"
BASE="https://api.vercel.com/v9/projects/$PROJECT_ID/domains"

echo "=== Current domains ==="
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "$BASE?teamId=$ORG_ID" | python3 -m json.tool

echo ""
echo "=== Adding hostamar.com ==="
curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "$BASE?teamId=$ORG_ID" \
  -d '{"name":"hostamar.com"}' | python3 -m json.tool

echo ""
echo "=== Adding www.hostamar.com ==="
curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "$BASE?teamId=$ORG_ID" \
  -d '{"name":"www.hostamar.com"}' | python3 -m json.tool

echo ""
echo "=== Verify ==="
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "$BASE/hostamar.com?teamId=$ORG_ID" | python3 -m json.tool

echo ""
echo "✅ Done! DNS already points to cname.vercel-dns.com"
echo "   Once Vercel verifies the domain (may take a few mins),"
echo "   hostamar.com will start serving the app."
