#!/bin/bash
# Hostamar Health Check — script mode
# Reports system health status (port 3001, tunnel on 11434)

cd /home/romelraisul/hostamar-local || exit 1

echo "=== HOSTAMAR HEALTH CHECK ==="
echo "Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"

# Main service (port 3001)
MAIN=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null)
if [ "$MAIN" = "200" ]; then
    echo "Main service: UP (:3001)"
else
    echo "Main service: DOWN (was: ${MAIN:-timeout})"
fi

# API health (try common endpoints)
API=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null)
if [ "$API" = "200" ]; then
    echo "API health: UP"
else
    echo "API health: ${API:-no /api/health endpoint}"
fi

# Ollama tunnel (port 11434 via Windows SSH tunnel → remote 192.168.1.3)
TUNNEL=$(curl -sf --max-time 5 http://127.0.0.1:11435/api/tags > /dev/null 2>&1; echo $?)
if [ "$TUNNEL" -eq 0 ]; then
    echo "Ollama tunnel: UP (:11435 → remote)"
else
    echo "Ollama tunnel: DOWN"
fi

# Remote services — verified via tunnel (Ollama) or SSH health summary
# (Direct SSH checks to remote are skipped here — tunnel script handles keepalive)
if [ "$TUNNEL" -eq 0 ]; then
    OLLAMA_MODELS=$(curl -sf --max-time 5 http://127.0.0.1:11435/api/tags 2>/dev/null | \
        python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"models\"])} models: ' + ', '.join([m['name'].replace(':latest','') for m in d['models']]))" 2>/dev/null)
    echo "Ollama (tunnel :11435): $OLLAMA_MODELS"
fi

# Note: MinIO (:9000) and Mailpit (:8025) run on remote DESKTOP-9KA03CQ only
# They are not tunneled; access via hostname from LAN machines (DHCP-safe)
echo "MinIO (remote DESKTOP-9KA03CQ:9000): assume UP (no tunnel)"
echo "Mailpit (remote DESKTOP-9KA03CQ:8025): assume UP (no tunnel)"

# System resources
echo "--- System ---"
df -h /home/romelraisul/ | tail -1 | awk '{print "Disk: " $4 " free / " $2 " total (" $5 " used)"}'
free -h | grep Mem | awk '{print "Memory: " $3 " used / " $2 " total"}'
echo "Uptime: $(uptime -p)"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
