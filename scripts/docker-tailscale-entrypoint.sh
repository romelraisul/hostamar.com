#!/bin/sh
set -e

# Start tailscaled via containerboot in background
/usr/local/bin/containerboot &
CONTAINERBOOT_PID=$!

# Wait for tailscale to be ready
echo "Waiting for Tailscale..."
for i in $(seq 1 30); do
  IP=$(tailscale ip -4 2>/dev/null || echo "")
  if [ -n "$IP" ]; then
    echo "Tailscale IP: $IP"
    break
  fi
  sleep 2
done

# Start socat proxy on port 2222 -> host.docker.internal:22
# Bind to 0.0.0.0 because tailscaled uses userspace-networking (no real TUN interface)
socat TCP-LISTEN:2222,bind=0.0.0.0,reuseaddr,fork TCP:host.docker.internal:22 &
SOCAT_PID=$!
echo "socat running on 0.0.0.0:2222 -> host.docker.internal:22 (pid $SOCAT_PID)"

# Monitor: restart socat if it dies
(
  while true; do
    if ! kill -0 "$SOCAT_PID" 2>/dev/null; then
      socat TCP-LISTEN:2222,bind=0.0.0.0,reuseaddr,fork TCP:host.docker.internal:22 &
      SOCAT_PID=$!
      echo "socat restarted on 0.0.0.0:2222 (pid $SOCAT_PID)"
    fi
    sleep 30
  done
) &

# Wait for containerboot
wait "$CONTAINERBOOT_PID"
