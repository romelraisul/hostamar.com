#!/bin/bash
# Phase 3.1 — zone protection for api.hostamar.com. Idempotent (merges, never wipes
# existing rules). Requires an API token with Zone.WAF Edit + Rate Limiting Edit —
# wrangler OAuth does NOT have them (rulesets API returns code 10000).
#   Usage: CLOUDFLARE_API_TOKEN=<token> bash scripts/add-api-waf-rules.sh
# Rule 1 (rate limiting): api.hostamar.com/* — 100 req / 10s per IP, block 60s.
#   Free plan allows exactly ONE rate-limiting rule; it covers the >50 curl-flood
#   case without a second rule slot.
# Rule 2 (custom rules): block `curl` UA on api.hostamar.com /v1/* only — billing
#   and webhook paths (/api/*) are left UA-agnostic so payment callbacks never break.
set -euo pipefail
ZONE=2aef176c6f2000da2af593f4890ec298
: "${CLOUDFLARE_API_TOKEN:?export CLOUDFLARE_API_TOKEN=<token with Zone.WAF Edit + Rate Limiting Edit>}"
API=https://api.cloudflare.com/client/v4

echo "== rate limiting phase =="
curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  "$API/zones/$ZONE/rulesets/phases/http_ratelimit/entrypoint" > /tmp/rl-get.json
RL_BODY=$(python3 - <<'PY'
import json
d = json.load(open('/tmp/rl-get.json'))
if not d.get('success'):
    raise SystemExit(json.dumps({"error": d.get('errors')}))
keep = [r for r in d['result'].get('rules', []) if 'api.hostamar.com' not in r.get('expression', '')]
rule = {
    "expression": '(http.host eq "api.hostamar.com")',
    "action": "block",
    "ratelimit": {"characteristics": ["ip.src"], "period": 10, "requests_per_period": 100, "mitigation_timeout": 60},
    "description": "api.hostamar.com 100req/10s per IP, block 60s",
    "enabled": True,
}
print(json.dumps({"rules": keep + [rule]}))
PY
) || true
echo "$RL_BODY" | grep -q '"error"' && { echo "read failed: $RL_BODY"; exit 1; }
curl -sS -X PUT -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  --data "$RL_BODY" "$API/zones/$ZONE/rulesets/phases/http_ratelimit/entrypoint" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print('ratelimit PUT:', 'OK' if d.get('success') else d.get('errors'))"

echo "== custom rules phase =="
curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  "$API/zones/$ZONE/rulesets/phases/http_request_firewall_custom/entrypoint" > /tmp/cr-get.json
CR_BODY=$(python3 - <<'PY'
import json
d = json.load(open('/tmp/cr-get.json'))
if not d.get('success'):
    raise SystemExit(json.dumps({"error": d.get('errors')}))
keep = [r for r in d['result'].get('rules', []) if 'api-curl-block' not in r.get('description', '')]
rule = {
    "expression": '(http.host eq "api.hostamar.com" and starts_with(http.request.uri.path, "/v1") and http.user_agent contains "curl")',
    "action": "block",
    "description": "api-curl-block",
    "enabled": True,
}
print(json.dumps({"rules": keep + [rule]}))
PY
) || true
echo "$CR_BODY" | grep -q '"error"' && { echo "read failed: $CR_BODY"; exit 1; }
curl -sS -X PUT -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  --data "$CR_BODY" "$API/zones/$ZONE/rulesets/phases/http_request_firewall_custom/entrypoint" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print('custom rules PUT:', 'OK' if d.get('success') else d.get('errors'))"

echo "== routes (must stay: 1 api-router) =="
curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API/zones/$ZONE/workers/routes" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print([(r['pattern'],r['script']) for r in d.get('result',[])] if d.get('success') else d.get('errors'))"
