CF_TOKEN=*** /home/romel/ceo-secrets/cloudflare-api-token)"
ZONE_ID="2aef176c6f2000da2af593f4890ec298"
VERCEL_FALLBACK="hostamar-clone-m2fgbjyhh-romelraisul-8939s-projects.vercel.app"

# ---- Helper: get record ID ----
get_record_id() {
    curl -s "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${RECORD_NAME}&type=CNAME" \
        -H "Authorization: Bearer *** \
        -H "Content-Type: application/json" | python3 -c "
import json,sys
d=json.load(sys.stdin)
results = d.get('result',[])
if results:
    print(results[0].get('id','ERROR'))
else:
    print('MISSING')
"
}

# ---- Helper: get current DNS target for hostamar.com ----
get_current_target() {
    curl -s "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${RECORD_NAME}&type=CNAME" \
        -H "Authorization: Bearer *** \
        -H "Content-Type: application/json" | python3 -c "
import json,sys
d=json.load(sys.stdin)
results = d.get('result',[])
if results:
    print(results[0].get('content','UNKNOWN'))
else:
    print('NONE')
"
}

# ---- Helper: update DNS record ----
update_dns() {
    local target="$1"
    local record_id="$2"
    local proxied="${3:-true}"

    result=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${record_id}" \
        -H "Authorization: Bearer *** \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"CNAME\",\"name\":\"${RECORD_NAME}\",\"content\":\"${target}\",\"proxied\":${proxied},\"ttl\":60}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('OK' if d.get('success') else 'FAIL')
")

    if echo "$result" | grep -q "^OK"; then
        echo "$target" > "$STATE_FILE"
        return 0
    fi
    return 1
}

# ---- Helper: check if WSL-side health is good ----
check_health() {
    if ! docker exec hostamar-nginx sh -c 'curl -sf http://localhost/__nginx_health' >/dev/null 2>&1; then
        return 1
    fi
    return 0
}