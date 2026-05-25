#!/bin/bash
# Hostamar Multi-Machine Health Check
# Checks all services on both machines
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; }

echo ""
echo "═══════════════════════════════════════════"
echo "  Hostamar Health Check — $(date)"
echo "═══════════════════════════════════════════"

# ─── Local Services (WSL) ───
echo ""
echo "━━━ Local (WSL 192.168.1.4) ━━━"

if curl -s --max-time 3 http://localhost:3000/ >/dev/null 2>&1; then
    log "Next.js dev server on :3000"
else
    fail "Next.js dev server on :3000"
fi

if curl -s --max-time 3 http://localhost:11435/api/tags >/dev/null 2>&1; then
    log "Ollama tunnel on :11435 (→ remote)"
else
    fail "Ollama tunnel on :11435"
fi

# ─── Remote Services (192.168.1.2) ───
echo ""
echo "━━━ Remote (Windows 192.168.1.2) ━━━"

if ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=accept-new romel@192.168.1.2 'exit' 2>/dev/null; then
    log "SSH reachable"
else
    fail "SSH reachable"
fi

# Mailpit
if curl -s --max-time 3 http://192.168.1.2:8025/ >/dev/null 2>&1; then
    log "Mailpit Web UI on :8025"
else
    fail "Mailpit Web UI on :8025"
fi

if nc -z 192.168.1.2 1025 2>/dev/null; then
    log "Mailpit SMTP on :1025"
else
    fail "Mailpit SMTP on :1025"
fi

# MinIO
if curl -s --max-time 3 http://192.168.1.2:9000/minio/health/live >/dev/null 2>&1; then
    log "MinIO S3 API on :9000"
else
    fail "MinIO S3 API on :9000"
fi

if curl -s --max-time 3 http://192.168.1.2:9001/login >/dev/null 2>&1; then
    log "MinIO Console on :9001"
else
    fail "MinIO Console on :9001"
fi

# Ollama (via tunnel)
if curl -s --max-time 4 http://localhost:11435/api/tags 2>/dev/null | grep -q "models"; then
    log "Ollama (remote) responding via tunnel"
else
    fail "Ollama (remote) responding via tunnel"
fi

# ─── Cron Jobs ───
echo ""
echo "━━━ Cron Jobs ━━━"
# Count active crons (heuristic: check cronjob tool output)
CRON_COUNT=$(hermes cron list 2>/dev/null | grep -c "enabled: true" || echo 0)
log "Active cron jobs: $CRON_COUNT"

# ─── Conclusion ───
echo ""
echo "═══════════════════════════════════════════"
echo "  Health check complete"
echo "═══════════════════════════════════════════"
