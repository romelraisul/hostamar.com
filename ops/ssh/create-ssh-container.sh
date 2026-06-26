#!/usr/bin/env bash
set -euo pipefail

# Stop and remove existing SSH container if present
if docker ps -a --format '{{.Names}}' | grep -q '^hostamar-ssh$'; then
  echo "Removing existing hostamar-ssh container..."
  docker rm -f hostamar-ssh
fi

# Create fresh SSH container with key-based auth
echo "Starting SSH container on port 2222..."
docker run -d \
  --name hostamar-ssh \
  --restart unless-stopped \
  -p 2222:22 \
  alpine:latest \
  /bin/sh -c "
    apk add --no-cache openssh-server &&
    ssh-keygen -A &&
    adduser -D -h /home/romel -s /bin/ash romel &&
    echo 'romel:Hostamar2026!' | chpasswd &&
    mkdir -p /home/romel/.ssh /run/sshd &&
    echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7...' > /home/romel/.ssh/authorized_keys &&
    chmod 700 /home/romel/.ssh /home/romel/.ssh/authorized_keys &&
    chown -R romel:romel /home/romel/.ssh &&
    echo 'HostKey /etc/ssh/ssh_host_ed25519_key' > /etc/ssh/sshd_config.d/99-hostamar.conf &&
    echo 'PermitRootLogin no' >> /etc/ssh/sshd_config.d/99-hostamar.conf &&
    echo 'PasswordAuthentication no' >> /etc/ssh/sshd_config.d/99-hostamar.conf &&
    echo 'PubkeyAuthentication yes' >> /etc/ssh/sshd_config.d/99-hostamar.conf &&
    /usr/sbin/sshd -D -e
  "

# Wait for SSH to be ready
echo "Waiting for SSH..."
for i in {1..30}; do
  if ssh -i /tmp/ssh-test-key -p 2222 -o StrictHostKeyChecking=no -o ConnectTimeout=2 romel@localhost exit 2>/dev/null; then
    echo "SSH ready after ${i}0s"
    break
  fi
  sleep 1
done

echo "SSH container started. Connect with:"
echo "  ssh -i /tmp/ssh-test-key -p 2222 romel@localhost"
