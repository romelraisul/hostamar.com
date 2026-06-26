# Cloudflared runbook and config notes

This document explains the recommended config, credential permissions, and recovery steps for the Cloudflare Tunnel used by hostamar.com.

Files and locations
- **Config template**: `ops/cloudflared/config.yml` (copy to `/etc/cloudflared/config.yml` or mount into container)
- **Credentials**: place the tunnel credentials JSON at `/home/romel/.cloudflared/tunnel-config/credentials.json` (or update `credentials-file` in config)

Permissions and ownership
- **systemd (recommended for production)**: run cloudflared as a dedicated `cloudflared` user.
  ```bash
  sudo chown root:cloudflared /home/romel/.cloudflared/tunnel-config/credentials.json
  sudo chmod 640 /home/romel/.cloudflared/tunnel-config/credentials.json
  ```
- **Docker container (current setup)**: the image runs as UID 65532 (`nobody`), so the credentials file must remain world-readable:
  ```bash
  sudo chown root:root /home/romel/.cloudflared/tunnel-config/credentials.json
  sudo chmod 644 /home/romel/.cloudflared/tunnel-config/credentials.json
  ```
  Do NOT use `640` with the container setup or the tunnel will fail with permission denied.

Ingress mapping
- The config routes both `hostamar.com` and `www.hostamar.com` to the internal service `http://hostamar-app:3000`.
- Confirm your compose/network exposes `hostamar-app` on the same Docker network used by cloudflared (e.g., `hostamar-network`).

Quick recovery steps (if tunnel shows Error 1033)
1. Check cloudflared logs:
   ```bash
   sudo journalctl -u cloudflared -n 200 --no-pager
   ```
2. Verify credentials file exists and permissions are correct.
3. Confirm `config.yml` ingress targets the correct service and port.
4. Restart cloudflared:
   ```bash
   sudo systemctl restart cloudflared
   sudo journalctl -u cloudflared -f --no-pager
   ```
5. If authentication errors persist, re-authenticate or rotate credentials (see ops/runbooks/cloudflared-rotate.md).

Testing and verification
- After restart, verify:
  ```bash
  curl -fsS https://hostamar.com/api/health | jq .
  curl -fsS https://www.hostamar.com/api/health | jq .
  cloudflared tunnel list
  cloudflared tunnel info <TUNNEL-UUID>
  ```

Security notes
- Never commit the credentials JSON to git. Keep backups encrypted and document rotation steps in a secure runbook.
- Prefer `chmod 640` and correct group ownership over `chmod 644`.
