#!/bin/sh

# Start containerboot in background (handles tailscaled)
/usr/local/bin/containerboot-orig &
sleep 5

# Start SSH server
/usr/sbin/sshd -E /var/log/sshd.log

echo "SSH server started on port 22"
echo "SSH log: /var/log/sshd.log"

# Wait for any process
wait
