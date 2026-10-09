#!/usr/bin/env bash
# Allow AppSumo's OpenGraph LTD scanner through Cloudflare.
#
# Why these ranges: AppSumo's message asks for 74.220.48.0/24 + 74.220.56.0/24.
# RDAP says that block (74.220.48.0-74.220.63.255, handle RS-1125) belongs to
# Render -- so their scanner is a DATACENTER client, which is exactly the class
# Cloudflare's bot pipeline (Bot Fight Mode) challenges.
#
# Why an IP Access Rule is the right instrument (and a WAF Skip rule is not):
# Cloudflare docs, bot-fight-mode -> Limitations -> Rules:
#   "Bot Fight Mode can still trigger if you have IP Access rules, but it will not
#    trigger if an IP Access rule matches the request first."
#   "You cannot bypass or skip Bot Fight Mode using WAF custom rules or Page Rules."
# So: IP Access rule (Allow) -> works. WAF/Security custom rule Skip -> does NOT
# touch plain BFM (it only skips Super Bot Fight Mode on paid plans).
#
# Token needs: Zone -> Firewall Services -> Edit
#         plus: Zone -> Zone Settings -> Edit  (only to read/toggle Bot Fight Mode)
# The token currently in $CLOUDFLARE_API_TOKEN is Zone:Read only -- verified denied
# (10000 / 9109) on bot_management, access_rules read AND write, rulesets, settings.
#
# Usage:  export CLOUDFLARE_API_TOKEN=<token with Firewall Services:Edit>
#         bash ops/appsumo-waf-allow.sh
set -uo pipefail

API=https://api.cloudflare.com/client/v4
TOKEN=${CLOUDFLARE_API_TOKEN:-}
ZONE=${ZONE_ID:-${CLOUDFLARE_ZONE_ID:-}}
RANGES=("74.220.48.0/24" "74.220.56.0/24")
NOTE="AppSumo OpenGraph LTD scanner (Render-hosted) - AppSumo launch"

die() { echo "FAIL: $*" >&2; exit 1; }
[ -n "$TOKEN" ] || die "no CLOUDFLARE_API_TOKEN in env"
if [ -z "$ZONE" ]; then
  ZONE=$(curl -sS -H "Authorization: Bearer $TOKEN" "$API/zones?name=hostamar.com" \
    | python3 -c "import sys,json;r=json.load(sys.stdin).get('result') or [];print(r[0]['id'] if r else '')")
fi
[ -n "$ZONE" ] || die "could not resolve zone id"

existing=$(curl -sS -H "Authorization: Bearer $TOKEN" "$API/zones/$ZONE/firewall/access_rules/rules?per_page=100")
echo "$existing" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('list access rules: OK' if d.get('success') else 'list DENIED -> '+json.dumps(d.get('errors'))[:150])
"

for r in "${RANGES[@]}"; do
  if echo "$existing" | grep -q "\"$r\""; then echo "already allowed: $r"; continue; fi
  curl -sS -X POST "$API/zones/$ZONE/firewall/access_rules/rules" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "{\"mode\":\"whitelist\",\"configuration\":{\"target\":\"ip_range\",\"value\":\"$r\"},\"notes\":\"$NOTE\"}" \
    | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(('allowed  ' if d.get('success') else 'DENIED   ')+'$r',(d.get('result') or {}).get('id',''),json.dumps(d.get('errors'))[:110])
"
done

echo "--- read-back (the check) ---"
curl -sS -H "Authorization: Bearer $TOKEN" "$API/zones/$ZONE/firewall/access_rules/rules?per_page=100" \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
if not d.get('success'): print('cannot verify:',json.dumps(d.get('errors'))[:130]); raise SystemExit(1)
hit=[r for r in (d.get('result') or []) if '74.220' in str(r.get('configuration',{}).get('value'))]
print('74.220* rules on zone:',len(hit))
for r in hit:
    c=r['configuration']; print(' ',r.get('mode'),c.get('target'),c.get('value'),'|',(r.get('notes') or '')[:55])
raise SystemExit(0 if len(hit)>=2 else 2)
"
