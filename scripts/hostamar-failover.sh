#!/bin/bash
# hostamar-failover.sh — failover logic for hostamar.com / local.hostamar.com
set -euo pipefail

LOG="/home/romel/hostamar-build/logs/failover.log"
STATE_FILE="/home/romel/hostamar-build/.failover-state"
CF_TOKEN_PATH="/home/romel/ceo-secrets/cloudflare-api-token"
ZONE_ID="2aef176c6f2000da2af593f4890ec298"

# permanent public -> Vercel; local -> tunnel
PRIMARY_RECORD_NAME="hostamar.com"
PRIMARY_TARGET="hostamar-slim.vercel.app"
LOCAL_RECORD_NAME="local.hostamar.com"
TUNNEL_CNAME="19c220ee-37ae-4fad-9c99-495f0e154b12.cfargotunnel.com"
VERCEL_FALLBACK="hostamar-slim.vercel.app"

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
    if curl -sf --max-time 5 "https://${LOCAL_RECORD_NAME}/api/health" >/dev/null 2>&1; then
        log "Local reachable via tunnel HTTPS probe"
        return 0
    fi
    if ! docker_run exec hostamar-nginx sh -c 'curl -sf http://localhost/__nginx_health' >/dev/null 2>&1; then
        log "FAIL: nginx not responding"
        return 1
    fi
    last_registered=$(docker_run logs hostamar-cloudflared 2>&1 | grep "Registered tunnel connection" | tail -1 | awk '{print $1,$2}')
    if [[ -z "$last_registered" ]]; then
        log "WARN: no recent tunnel registration found"
        conns=$(docker_run logs hostamar-cloudflared 2>&1 | grep -c "Registered tunnel connection" || true)
        if [[ "$conns" -eq 0 ]]; then
            log "FAIL: no active tunnel connections"
            return 1
        fi
    fi
    return 0
}

cloudflare_get() {
    require_token
    curl -sf --max-time 10 "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${1}&type=CNAME" \
        -H "Authorization: Bearer $CF_TOKEN" \
        -H "Content-Type: application/json"
}

get_value() {
    printf '%s' "$1" | python3 -c "import json,sys; d=json.load(sys.stdin); r=d.get('result',[]); print(r[0].get('$2','') if r else '')"
}

cloudflare_update() {
    require_token
    local name="$1"
    local target="$2"
    local record_id="$3"
    local proxied="${4:-true}"
    local json_file
    json_file="$(mktemp)"
    cat > "$json_file" <<JSONEOF
{"type":"CNAME","name":"${name}","content":"${target}","proxied":${proxied},"ttl":60}
JSONEOF
    log "Updating $name -> $target proxied=$proxied"
    result=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${record_id}" \
        -H "Authorization: Bearer $CF_TOKEN" \
        -H "Content-Type: application/json" \
        -d "@${json_file}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('OK' if d.get('success') else 'FAIL:' + str(d.get('errors')))")
    rm -f "$json_file"
    if echo "$result" | grep -q "^OK"; then
        echo "$target" > "$STATE_FILE"
        return 0
    fi
    log "DNS update FAILED: $result"
    return 1
}

# ======================
# MAIN LOGIC
# ======================
if ! command -v curl >/dev/null 2>&1; then
    log "SKIP: curl not available"
    exit 0
fi

if check_local_health; then
    LOCAL_HEALTHY=1
else
    LOCAL_HEALTHY=0
fi

PRIMARY_DNS=$(get_value "$(cloudflare_get "$PRIMARY_RECORD_NAME")" "content")
if [[ "$PRIMARY_DNS" != "$PRIMARY_TARGET" ]]; then
    PRIMARY_RECORD_ID=$(get_value "$(cloudflare_get "$PRIMARY_RECORD_NAME")" "id")
    if [[ -n "$PRIMARY_RECORD_ID" ]]; then
        log "Switching $PRIMARY_RECORD_NAME -> $PRIMARY_TARGET"
        cloudflare_update "$PRIMARY_RECORD_NAME" "$PRIMARY_TARGET" "$PRIMARY_RECORD_ID" "true" || true
    else
        log "ERROR: missing primary record id for $PRIMARY_RECORD_NAME"
    fi
fi

CURRENT_LOCAL=$(get_value "$(cloudflare_get "$LOCAL_RECORD_NAME")" "content")
LOCAL_RECORD_ID=$(get_value "$(cloudflare_get "$LOCAL_RECORD_NAME")" "id")

if [[ "$LOCAL_HEALTHY" -eq 1 ]]; then
    if [[ "$CURRENT_LOCAL" != "$TUNNEL_CNAME" ]]; then
        log "Local healthy but local DNS is on $CURRENT_LOCAL — switching to tunnel"
        cloudflare_update "$LOCAL_RECORD_NAME" "$TUNNEL_CNAME" "$LOCAL_RECORD_ID" "true" || true
    fi
else
    if [[ "$CURRENT_LOCAL" != "$VERCEL_FALLBACK" ]]; then
        log "Local DOWN — failing over local.hostamar.com to Vercel"
        cloudflare_update "$LOCAL_RECORD_NAME" "$VERCEL_FALLBACK" "$LOCAL_RECORD_ID" "false" || true
    fi
fi
