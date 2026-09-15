#!/usr/bin/env bash
# FORGE probe: full prod E2E checkout against real route path. Internal email, never-delete order.
set -e
PK=$(docker exec hostamar-postgres psql -U hostamar -d medusa -tAc "select token from api_key limit 1" | tr -d '\r')
curl -s -m 20 -H "x-publishable-api-key: $PK" 'http://localhost:9002/store/products?limit=1&region_id=reg_01M27QBX4C3XKZFWCQD47CM2EJ&fields=id,title,variants.id' -o /tmp/forge-pk.json
VAR=$(python3 -c "import json;d=json.load(open('/tmp/forge-pk.json'));print(d['products'][0]['variants'][0]['id'])")
echo "variant=$VAR"
curl -s -m 60 -X POST https://hostamar.com/api/store/checkout -H 'content-type: application/json' \
  -d "{\"variant_id\":\"$VAR\",\"email\":\"forge-probe-0915c@hostamar.com\",\"name\":\"Forge Probe\",\"address1\":\"Probe House 1\",\"city\":\"Dhaka\",\"phone\":\"01711000001\"}" \
  -o /tmp/forge-order.json -w "checkout %{http_code} %{time_total}s\n"
head -c 300 /tmp/forge-order.json; echo; date +%T
