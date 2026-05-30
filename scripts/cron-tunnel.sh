#!/bin/bash
# Hostamar Ollama Tunnel Keepalive — script mode
# Dynamically resolves DESKTOP-9KA03CQ via LLMNR so DHCP IP changes don't break it.
# Uses Windows SSH client to tunnel remote Ollama (:11434) to localhost:11435.

SSH="/mnt/c/Windows/System32/OpenSSH/ssh.exe"
SSH_KEY="C:\\Users\\romel\\.ssh\\id_ed25519_wsl"
REMOTE_HOST="DESKTOP-9KA03CQ"
TUNNEL_PORT=11435
REMOTE_PORT=11434

# --- Resolve remote IP dynamically ---
RESOLVE_SCRIPT="/home/romelraisul/hostamar-local/scripts/resolve-remote.sh"
REMOTE_IP=""
if [ -x "$RESOLVE_SCRIPT" ]; then
    REMOTE_IP=$("$RESOLVE_SCRIPT" 2>/dev/null)
fi
if [ -z "$REMOTE_IP" ] || [ "$REMOTE_IP" = "RESOLVE_FAILED" ]; then
    # Fallback: try PowerShell directly
    REMOTE_IP=$('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe' -NoProfile -Command "
        try {
            \$ip = [System.Net.Dns]::GetHostEntry('$REMOTE_HOST').AddressList |
                  Where-Object { \$_ -match '^\d+\.\d+\.\d+\.\d+' } |
                  Select-Object -First 1
            if (\$ip) { Write-Output \$ip.IPAddressToString }
        } catch {}
    " 2>/dev/null | tr -d '\r')
fi
if [ -z "$REMOTE_IP" ]; then
    echo "Cannot resolve $REMOTE_HOST — network may be down"
    exit 0
fi
REMOTE="romel@${REMOTE_IP}"

# 1. Check if tunnel is already alive
curl -sf --max-time 5 "http://127.0.0.1:${TUNNEL_PORT}/api/tags" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Ollama tunnel ($TUNNEL_PORT → $REMOTE_HOST/$REMOTE_IP:$REMOTE_PORT): UP"
    exit 0
fi

# 2. Tunnel is down — attempt restart
echo "Ollama tunnel: DOWN — attempting restart to $REMOTE_HOST ($REMOTE_IP)"

# Kill stale SSH processes (Windows-style)
/mnt/c/Windows/System32/taskkill.exe /f /im ssh.exe 2>/dev/null || true
sleep 2

# 3. Verify remote machine is reachable via SSH
$SSH -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_KEY" "$REMOTE" \
    "curl -s http://localhost:${REMOTE_PORT}/api/tags" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "Remote Ollama ($REMOTE_HOST/$REMOTE_IP:$REMOTE_PORT): UNREACHABLE"
    exit 0
fi

# 4. Start tunnel in background
nohup $SSH \
    -o ConnectTimeout=10 \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -i "$SSH_KEY" \
    -L ${TUNNEL_PORT}:127.0.0.1:${REMOTE_PORT} \
    "$REMOTE" \
    "sleep 99999" > /dev/null 2>&1 &

sleep 5

# Verify
curl -sf --max-time 5 "http://127.0.0.1:${TUNNEL_PORT}/api/tags" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Tunnel restarted successfully — Ollama reachable at localhost:${TUNNEL_PORT}"
else
    echo "Tunnel restart FAILED — check SSH connectivity"
fi
