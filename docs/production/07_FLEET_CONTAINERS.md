# Hostamar.com — Fleet Containers

**Last verified:** 2026-11-04 Asia/Dhaka  
**Status:** 9 core containers + 10 systemd services running

## Podman Containers (WSL Local)

| Container | Port | Status | Notes |
|-----------|------|--------|-------|
| `hostamar-postgres` | 5432 | Up | Docker, host port 5432 |
| `redis-foundation` | 6379 | Up | Podman, Infisical's Redis |
| `infisical-wsl` | 8089 | Up | Podman, secret store (127.0.0.1:8089) |
| `forgejo` | 3000 | Up | Podman, git.hostamar.com (SQLite) |
| `teldrive` | 8091 | Up | Docker, file manager (fixed: DB connection retry on startup) |
| `hostamar-tv-rtmp` | 1935, 8080 | Up | Docker, nginx-rtmp + HLS |
| `hostamar-openwebui` | 3003 | Up | Docker, Ollama UI |
| `hostamar-code-server` | 8443 | Up | Docker, VS Code browser |
| `hostamar-uptime` | 3004 | Up | Docker, uptime-kuma |
| `hostamar-minio` | 9000-9001 | Up | Docker, S3-compatible |

## Systemd Services (WSL)

| Service | Port | Status | Description |
|---------|------|--------|-------------|
| `nvidia-guard` | 12436 | active | 6 live models, fallback chain |
| `hermes-gateway` | — | active | Hermes Agent Gateway |
| `tv-hls2` | 8090 | active | HLS static server (CORS) |
| `tv-ffmpeg` | — | active | FFmpeg loop (playlist → RTMP) |
| `tv-ffmpeg-vp9` | — | active | VP9/Opus HLS variant |
| `tv-tunnel` | — | active | Cloudflare tunnel (tv.hostamar.com) |
| `tv-viral` | — | active | Viral TV research (1h loop) |
| `tv-agent` | — | inactive | Polls hostamar.com commands |
| `cloudflared-hostamar-primary` | — | active | Tunnel `hostamar-primary` (2d67d851) |
| `infisical-boot-guard` | — | exited | Boot guard (heals :8089 bind race) |

## Infisical Database

| Instance | Port | Role | Tables |
|----------|------|------|--------|
| `postgres-infisical` (podman) | 15433 | Real data | 773 |
| `hostamar-postgres` (docker) | 5432 | Decoy (empty) | 0 |

## Tunnel Config

**hostamar-primary** (`/home/romel/.cloudflared/hostamar-primary-config.yml`):
```yaml
tunnel: 2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f
credentials-file: /home/romel/.cloudflared/2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f.json
origincert: /home/romel/.cloudflared/cert.pem
ingress:
  - hostname: hostamar.com
    service: http://localhost:3000
  - hostname: www.hostamar.com
    service: http://localhost:3000
  - service: http_status:404
```

**hostamar-api-primary** (`/home/romel/.cloudflared/hostamar-api-primary-config.yml`):
```yaml
tunnel: b9839ba7-bdab-4591-8eeb-d8de95a9ee80
credentials-file: /home/romel/.cloudflared/b9839ba7-bdab-4591-8eeb-d8de95a9ee80.json
origincert: /home/romel/.cloudflared/cert.pem
ingress:
  - hostname: api-primary.hostamar.com
    service: http://localhost:12436
  - service: http_status:404
```

**4 QUIC connections** (hostamar-primary) + **4 QUIC connections** (hostamar-api-primary) verified in logs.

## Verification Commands

```bash
# Podman fleet
podman ps --format "{{.Names}} {{.Status}} {{.Ports}}"

# Docker fleet
docker ps --format "{{.Names}} {{.Status}} {{.Ports}}"

# Systemd services
systemctl --user list-units --type=service --state=active | grep -E "tv|nvidia|hermes|infisical|cloudflared"

# nvidia-guard models
curl -s http://127.0.0.1:12436/v1/models | jq '.data | length'
# Expected: 6

# Infisical health
curl -s http://127.0.0.1:8089/api/status | jq '.message'
# Expected: "Ok"

# Tunnel connections (check logs)
journalctl --user -u cloudflared-hostamar-primary -f | grep -E "QUIC|connection"
```