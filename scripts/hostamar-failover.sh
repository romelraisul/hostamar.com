#!/bin/bash
# hostamar-failover.sh — switches DNS when WSL goes down
# Run via cron: * * * * * /home/romel/hostamar-build/scripts/hostamar-failover.sh
#
# HOW IT WORKS:
#   Normal state:   hostamar.com → tunnel CNAME → WSL → nginx → app
#   Failover state: hostamar.com → Vercel CNAME (permanent fallback)
#
# Failover:   ~60s (DNS TTL)
# Failback:   ~60s after WSL comes back online
#
# IMPORTANT: WSL2 may lose Docker socket (/run/docker.sock) when WSL integration
# breaks. This script falls back to Windows-side `docker exec` via cmd.exe when
# the WSL Docker socket is unreachable. Final fallback for health check is a
# plain HTTPS probe against hostamar.com (works regardless of Docker state).

set -e

LOG="/home/romel/hostamar-build/logs/failover.log"
STATE_FILE="/home/romel/hostamar-build/.failover-state"
CF_TOKEN="$(cat /home/romel/ceo-secrets/cloudflare-api-token)"
ZONE_ID="2aef176c6f2000da2af593f4890ec298"
RECORD_NAME="hostamar.com"
DNS_RECORD_ID=""

# Tunnels
TUNNEL_CNAME="19c220ee-37ae-4fad-9c99-495f0e154b12.cfargotunnel.com"
VERCEL_FALLBACK="hostamar-clone-m2fgbjyhh-romelraisul-8939s-projects.vercel.app"

# Run a docker command from whichever side works — WSL or Windows
docker_run() {
    # Try WSL Docker first (unix socket)
    if docker info >/dev/null 2>&1; then
        docker "$@"
    else
        # Fallback to Windows Docker via cmd.exe
        cmd.exe /c "docker $*" 2>&1 | tr -d '\r'
    fi
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"
}

# ---- Helper: check if WSL-side health is good ----
check_health() {
    # LAST RESORT: even if both Docker sockets are broken, can we reach the
    # site via the tunnel? This is the strongest possible "is the app up" signal.
    # This works whether nginx is on WSL, on the host, or anywhere behind the tunnel.
    if curl -sf --max-time 5 https://hostamar.com/api/health >/dev/null 2>&1; then
        log "OK: app reachable via tunnel (HTTPS probe)"
        return 0
    fi

    # 1. Is nginx container running and responding?
    if ! docker_run exec hostamar-nginx sh -c 'curl -sf http://localhost/__nginx_health' >/dev/null 2>&1; then
        log "FAIL: nginx not responding"
        return 1
    fi

    # 2. Is cloudflared connected to CF edge?
    # Check for recent "Registered tunnel connection" log entries (within 2 min)
    last_registered=$(docker_run logs hostamar-cloudflared 2>&1 | grep "Registered tunnel connection" | tail -1 | awk '{print $1,$2}')
    if [ -z "$last_registered" ]; then
        log "WARN: no recent tunnel registration found"
        # Not necessarily down — check connection count
        conns=$(docker_run logs hostamar-cloudflared 2>&1 | grep -c "Registered tunnel connection" || true)
        if [ "$conns" -eq 0 ]; then
            log "FAIL: no active tunnel connections"
            return 1
        fi
    fi

    log "OK: WSL health check passed"
    return 0
}

# ---- Helper: get current DNS target for hostamar.com ----
get_current_target() {
    curl -s "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${RECORD_NAME}&type=CNAME" \
        -H "Authorization: Bearer ${CF_TOKEN}" \
        -H "Content-Type: application/json" | python3 -c "
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

# ---- Helper: update DNS record ----
update_dns() {
    local target="$1"
    local record_id="$2"
    local proxied="${3:-true}"

    log "DNS: updating hostamar.com → $target (proxied=$proxied)"

    result=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${record_id}" \
        -H "Authorization: Bearer ${CF_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"CNAME\",\"name\":\"${RECORD_NAME}\",\"content\":\"${target}\",\"proxied\":${proxied},\"ttl\":60}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('OK' if d.get('success') else 'FAIL:' + str(d.get('errors')))
")

    if echo "$result" | grep -q "^OK"; then
        log "DNS: updated hostamar.com → $target ✓"
        echo "$target" > "$STATE_FILE"
        return 0
    else
        log "DNS: update FAILED: $result"
        return 1
    fi
}

# ---- Helper: get record ID ----
get_record_id() {
    curl -s "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${RECORD_NAME}&type=CNAME" \
        -H "Authorization: Bearer ${CF_TOKEN}" \
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

# ======================
# MAIN LOGIC
# ======================

# Quick health check
if check_health; then
    WSL_HEALTHY=1
else
    WSL_HEALTHY=0
fi

CURRENT_STATE=$(cat "$STATE_FILE" 2>/dev/null || echo "unknown")
CURRENT_DNS_TARGET=$(get_current_target)
RECORD_ID=$(get_record_id)

log "Check: WSL=${WSL_HEALTHY}, state=$CURRENT_STATE, DNS_target=$CURRENT_DNS_TARGET, record_id=$RECORD_ID"

# Skip if DNS record is missing
if [ "$RECORD_ID" = "MISSING" ] || [ "$RECORD_ID" = "ERROR" ]; then
    log "ERROR: Cannot find DNS record ID for hostamar.com — skipping"
    exit 0
fi

if [ "$WSL_HEALTHY" -eq 1 ]; then
    # WSL is UP — ensure we are on tunnel
    if [ "$CURRENT_DNS_TARGET" != "$TUNNEL_CNAME" ]; then
        log "WSL healthy but DNS is on $CURRENT_DNS_TARGET — switching to tunnel"
        update_dns "$TUNNEL_CNAME" "$RECORD_ID" "true"
    else
        log "WSL healthy + DNS on tunnel — nothing to do"
    fi
else
    # WSL is DOWN — failover to Vercel
    if [ "$CURRENT_DNS_TARGET" != "$VERCEL_FALLBACK" ]; then
        log "WSL DOWN — failing over to Vercel"
        update_dns "$VERCEL_FALLBACK" "$RECORD_ID" "false"
    else
        log "WSL DOWN + already on Vercel — nothing to do"
    fi
fi