# LOCAL VPS — Hostamar on your computer

Run Hostamar's backend on your own computer as a VPS. No Hetzner, no money.
Cloudflare Tunnel gives you free public URLs.

## Architecture

```
Vercel (Next.js, hostamar.com)
   │  enqueues HostingRequest (202) + serves chat, pricing, dashboard
   ▼
Neon Postgres (HostingRequest, CreditAccount, CreditTransaction, MarketTrend)
   ▲
   │ polls every 10s
Your computer (WSL/Linux/Mac/Windows)
   ├─ hostamar-openwebui :3003   (podman)
   ├─ hostamar-code-server :8443 (podman)
   ├─ hostamar-provisioner       (podman, polls Neon)
   ├─ hostamar-uptime :3002      (podman)
   └─ cloudflared tunnel         (free public URLs)
```

## Public URLs (via Cloudflare Tunnel)

| Service | URL | Local port |
|---|---|---|
| OpenWebUI | https://openwebui.hostamar.com | 3003 |
| IDE (code-server) | https://ide.hostamar.com | 8443 |
| Uptime Kuma | https://uptime.hostamar.com | 3002 |
| Camofox browser | https://camofox.hostamar.com | 9377 |
| ComfyUI | https://comfy.hostamar.com | 8188 |
| API (litellm) | https://hostamar.com/v1/* | 4000 |

## Setup (one-time)

### 1. Podman + compose

```bash
# Linux
sudo apt install podman podman-compose

# Mac
brew install podman && podman machine init && podman machine start

# Windows
winget install RedHat.Podman
```

### 2. Start the stack

```bash
cd ~/hostamar-build
podman-compose -f podman-compose.yml up -d
```

### 3. Cloudflare Tunnel (free public URLs)

```bash
# Install cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# Login + create tunnel
cloudflared tunnel login
cloudflared tunnel create hostamar-local

# Route DNS (one-time per hostname)
cloudflared tunnel route dns hostamar-local openwebui.hostamar.com
cloudflared tunnel route dns hostamar-local ide.hostamar.com
cloudflared tunnel route dns hostamar-local uptime.hostamar.com

# Run tunnel
cloudflared tunnel run
```

Config at `~/.cloudflared/config.yml` already has all hostnames.

### 4. Auto-start on boot

```bash
# Enable lingering (keep user services after logout)
sudo loginctl enable-linger $USER

# Start + enable
systemctl --user daemon-reload
systemctl --user enable --now hostamar-vps
systemctl --user enable --now hostamar-tunnel
```

## Verify

```bash
# Local containers
podman ps --format '{{.Names}} {{.Status}}'

# Tunnel endpoints
curl https://openwebui.hostamar.com -> 200
curl https://ide.hostamar.com -> 302 (login redirect)
curl https://uptime.hostamar.com -> 302 (login redirect)

# Vercel frontend
curl https://hostamar.com/dashboard/chat -> 200 (logged in)
```

## Provisioning on your computer

When a customer orders Starter 599 Taka:

1. POST /api/hosting/servers on Vercel → 202 queued (credit deducted)
2. Local provisioner (podman on your computer) picks the HostingRequest
3. `podman pod create --name customer-<id> -p <randomPort>:80`
4. `podman run -d --pod customer-<id> --cpus 1 --memory 1g nginx`
5. HostingRequest status → running, host = your-tunnel-url:randomPort

The customer's site is live on your computer, exposed via Cloudflare Tunnel.

## Updating

```bash
cd ~/hostamar-build && git pull
podman-compose -f podman-compose.yml up -d --build
```

## Troubleshooting

- `podman ps` shows containers down → `systemctl --user restart hostamar-vps`
- Tunnel 530 → `systemctl --user restart hostamar-tunnel`
- Port conflict (3000) → openwebui moved to 3003 (Next.js uses 3000 locally)
- DNS not propagating → wait 5 min, check `cloudflared tunnel list`
