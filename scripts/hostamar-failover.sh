#!/bin/bash
# hostamar-failover.sh — permanent local-only failover for local.hostamar.com
# Run via cron: * * * * * /home/romel/hostamar-build/scripts/hostamar-failover.sh
#
# PERMANENT ARCHITECTURE (future-proof):
#   hostamar.com        → Vercel (hostamar-slim.vercel.app)  [permanent, Cloudflare DNS]
#   local.hostamar.com  → Cloudflare Tunnel when local is healthy
#                        → Vercel fallback when local is down/unreachable
#
# WHY: public DNS must never depend on the same machine that may go offline.
#      The failover script only manages local.hostamar.com.
#
# TTL: 60s

set -euo pipefail

LOG="/home/romel/hostamar-build/logs/failover.log"
STATE_FILE="/home/romel/hostamar-build/.failover-state"
CF_TOKEN_PATH="/home/romel/ceo-secrets/cloudflare-api-token"
ZONE_ID="2aef176c6f2000da2af593f4890ec298"

# Primary public domain is permanent Vercel — managed in Cloudflare, not here.
PRIMARY_DOMAIN="hostamar.com"
PRIMARY_TARGET="hostamar-slim.vercel.app"

# Local-only subdomain managed by this script.
LOCAL_RECORD_NAME="local.hostamar.com"

# Vercel fallback for local-only failover.
VERCEL_FALLBACK="hostamar-slim.vercel.app"

# Cloudflare Tunnel for local development.
TUNNEL_CNAME="19c220ee-37ae-4fad-9c99-495f0e154b12.cfargotunnel.com"

# Docker helper with Windows fallback for WSL edge cases.
docker_run() {
    if docker info >/dev/null 2>&1; then
        docker "$@"
    else
        cmd.exe /c "docker $*" 2>&1 | tr -d '\r'
    fi
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"
}

require_token() {
    if [[ ! -f "$CF_TOKEN_PATH" ]]; then
        log "ERROR: Cloudflare token missing at $CF_TOKEN_PATH"
        exit 1
    fi
    CF_TOKEN="$(tr -d '[:space:]' < "$CF_TOKEN_PATH")"
    if [[ -z "$CF_TOKEN" ]]; then
        log "ERROR: Cloudflare token empty at $CF_TOKEN_PATH"
        exit 1
    fi
}

check_local_health() {
    # Last resort: if tunnel itself is responding, local is healthy enough.
    if curl -sf --max-time 5 "https://${LOCAL_RECORD_NAME}/api/health" >/dev/null 2>&1; then
        log "OK: local reachable via tunnel HTTPS probe"
        return 0
    fi

    # 1. Is nginx container running and responding?
    if ! docker_run exec hostamar-nginx sh -c 'curl -sf http://localhost/__nginx_health' >/dev/null 2>&1; then
        log "FAIL: nginx not responding"
        return 1
    fi

    # 2. Is cloudflared connected to CF edge?
    last_registered=$(docker_run logs hostamar-cloudflared 2>&1 | grep "Registered tunnel connection" | tail -1 | awk '{print $1,$2}')
    if [[ -z "$last_registered" ]]; then
        log "WARN: no recent tunnel registration found"
        conns=$(docker_run logs hostamar-cloudflared 2>&1 | grep -c "Registered tunnel connection" || true)
        if [[ "$conns" -eq 0 ]]; then
            log "FAIL: no active tunnel connections"
            return 1
        fi
    fi

    log "OK: local WSL health check passed"
    return 0
}

cloudflare_get() {
    require_token
    curl -sf --max-time 10 "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${1}&type=CNAME" \
        -H "Authorization: Bearer *** \
        -H "Content-Type: application/json"
}

cloudflare_update() {
    require_token
    local target="$1"
    local record_id="$2"
    local proxied="${3:-true}"

    log "DNS: updating ${LOCAL_RECORD_NAME} → ${target} (proxied=${proxied})"

    result=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${record_id}" \
        -H "Authorization: Bearer *** \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"CNAME\",\"name\":\"${LOCAL_RECORD_NAME}\",\"content\":\"${target}\",\"proxied\":${proxied},\"ttl\":60}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('OK' if d.get('success') else 'FAIL:' + str(d.get('errors')))
")

    if echo "$result" | grep -q "^OK"; then
        log "DNS: updated ${LOCAL_RECORD_NAME} → ${target} ✓"
        echo "$target" > "$STATE_FILE"
        return 0
    else
        log "DNS: update FAILED: $result"
        return 1
    fi
}

get_record_id() {
    cloudflare_get "$LOCAL_RECORD_NAME" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if not d.get('success'):
    print('ERROR')
    sys.exit(0)
results = d.get('result',[])
if results:
    print(results[0].get('id','ERROR'))
else:
    print('MISSING')
"
}

get_current_target() {
    cloudflare_get "$LOCAL_RECORD_NAME" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if not d.get('success'):
    print('ERROR')
    sys.exit(0)
results = d.get('result',[])
if results:
    print(results[0].get('content','UNKNOWN'))
else:
    print('NONE')
"
}

# ======================
# MAIN LOGIC
# ======================

# If local health check is unavailable due to missing deps, skip rather than fail.
if ! command -v curl >/dev/null 2>&1; then
    log "SKIP: curl not available"
    exit 0
fi

if check_local_health; then
    LOCAL_HEALTHY=1
else
    LOCAL_HEALTHY=0
fi

CURRENT_STATE=$(cat "$STATE_FILE" 2>/dev/null || echo "unknown")
CURRENT_DNS_TARGET=$(get_current_target)
RECORD_ID=$(get_record_id)

log "Check: local=${LOCAL_HEALTHY}, state=${CURRENT_STATE}, dns=${CURRENT_DNS_TARGET}, record=${RECORD_ID}"

# Always ensure the public primary hostamar.com points to Vercel.
# This is the permanent zero-downtime public endpoint.

if [[ "$RECORD_ID" == "MISSING" ]] || [[ "$RECORD_ID" == "ERROR" ]]; then
    log "ERROR: Cannot find DNS record ID for ${LOCAL_RECORD_NAME} — skipping"
    exit 0
fi

if [[ "$LOCAL_HEALTHY" -eq 1 ]]; then
    # Local UP — ensure local.hostamar.com is on tunnel.
    if [[ "$CURRENT_DNS_TARGET" != "$TUNNEL_CNAME" ]]; then
        log "Local healthy but DNS is on ${CURRENT_DNS_TARGET} — switching to tunnel"
        cloudflare_update "$TUNNEL_CNAME" "$RECORD_ID" "true"
    else
        log "Local healthy + DNS on tunnel — nothing to do"
    fi
else
    # Local DOWN — failover local.hostamar.com to Vercel so local-only flows still work.
    if [[ "$CURRENT_DNS_TARGET" != "$VERCEL_FALLBACK" ]]; then
        log "Local DOWN — failing over local.hostamar.com to Vercel"
        cloudflare_update "$VERCEL_FALLBACK" "$RECORD_ID" "false"
    else
        log "Local DOWN + already on Vercel — nothing to do"
    fi
fi
