#!/bin/bash
# Run this on your home server to enable SSH + Tailscale

set -e

# 1. Install SSH if not present
if ! command -v sshd &>/dev/null; then
  apt-get update
  apt-get install -y openssh-server
  echo "SSH installed"
fi

# 2. Install Tailscale if not present
if ! command -v tailscale &>/dev/null; then
  curl -fsSL https://tailscale.com/install.sh | sh
  echo "Tailscale installed"
fi

# 3. Start SSH
systemctl enable --now ssh || service ssh start || echo "SSH start failed - may need manual start"

# 4. Connect Tailscale (get auth key from https://login.tailscale.com/admin/settings/keys)
echo "Run: tailscale up --authkey tskey-YOUR-KEY-HERE"
echo "Or run: tailscale up (if already logged in)"

# 5. Show Tailscale IP
tailscale ip -4 2>/dev/null || echo "Run tailscale up first"

# 6. Add SSH to cloudflared tunnel (if exists)
CF_CONF="/etc/cloudflared/config.yml"
if [ -f "$CF_CONF" ]; then
  if ! grep -q "ssh.ai.hostamar.com" "$CF_CONF"; then
    tee -a "$CF_CONF" <<'EOF'

  - hostname: ssh.ai.hostamar.com
    service: ssh://localhost:22
EOF
    systemctl restart cloudflared || echo "Manual restart: docker restart hostamar-cloudflared"
  fi
fi

echo "Done. Add your SSH public key to ~/.ssh/authorized_keys"