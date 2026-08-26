# PRODUCTION PODMAN RUNBOOK — Hostamar

Podman-native production stack. No docker anywhere.

## Architecture

```
Vercel (Next.js, hostamar.com)
   │  enqueues HostingRequest (202 queued) — no docker on Vercel
   ▼
Neon Postgres ── HostingRequest table (status: queued→provisioning→running/failed)
   ▲
   │ polls every 10s
Local PC / Hetzner VPS — rootless podman
   ├─ hostamar-provisioner  (quadlet, node worker.mjs)
   ├─ openwebui :3000       (podman-compose / quadlet)
   ├─ code-server :8443
   └─ uptime-kuma :3002
```

## One-time setup (VPS or local)

```bash
# podman + compose + systemd user services
sudo apt install podman podman-docker
sudo loginctl enable-linger $USER          # keep user services after logout

# network
podman network create hostamar-net

# socket for the provisioner container to talk to host podman (VPS only;
# on the local PC the worker runs as a plain quadlet with direct podman access)
systemctl --user start podman.socket        # -> /run/user/$UID/podman/podman.sock
```

## Deploy the stack

```bash
cd ~/hostamar-build
podman-compose -f podman-compose.yml up -d
```

Or the preferred prod form — systemd quadlets:

```bash
mkdir -p ~/.config/containers/systemd
cp deploy/quadlets/*.container ~/.config/containers/systemd/
cp deploy/quadlets/hostamar-pod.pod ~/.config/containers/systemd/
systemctl --user daemon-reload
systemctl --user start hostamar-provisioner
journalctl --user -u hostamar-provisioner -f
```

Quadlet files already written:
- `~/.config/containers/systemd/hostamar-pod.pod` (hostamar-net pod)
- `~/.config/containers/systemd/hosstamar-provisioner.container` → note correct name below
- `hostamar-provisioner.container` — polls Neon queue, provisions via podman

## The provisioning flow (why 503 is gone)

1. Customer POSTs /api/hosting/servers on Vercel.
2. Credit gate (402 if insufficient) → deduction in $transaction →
   `prisma.hostingRequest.create({ status: 'queued' })` → **202 {status:'provisioning', id}**.
3. Provisioner worker (local PC or VPS) claims the row, `podman run`s the customer
   container with cpu/ram limits, sets status=running + port.
4. Dashboard can later poll a GET endpoint for status.

## Pricing (lib/pricing.ts — single source)

| Plan | CPU | RAM | Storage | Monthly | Hourly |
|---|---|---|---|---|---|
| Starter | 1 | 1GB | 25GB | 599 Taka | 1 Taka/hr |
| Basic | 2 | 2GB | 50GB | 1199 Taka | 2 Taka/hr |
| Pro | 2 | 4GB | 80GB | 2499 Taka | 4 Taka/hr |
| Premium | 4 | 8GB | 160GB | 4999 Taka | 8 Taka/hr |

Chat: 0.1 T/1k (Llama small) · 0.5 T/1k (mini/haiku/deepseek/kimi) ·
3 T/1k (GPT-4o/Sonnet) · 10 T/1k (Opus/o1). Video: 150 T per 5s. Browser: 1 T/10 pages.

## Chat + native credit spend

`app/dashboard/chat` — Hostamar-branded native chat (no OpenWebUI iframe).
Model picker shows live Taka cost per model. On each message the `/api/chat`
route calls OpenRouter, counts tokens, and deducts credits via `lib/credits.ts`
(shared by `/api/credits/deduct` — imported directly, not HTTP-called).

Live proof (2026-08-26): signup → 6000 Taka, gpt-4o-mini "hi" → 0.06 deducted →
5999.94 remaining (verified in DB + balance endpoint).

## Market auto-sync

Weekly Vercel Cron (Monday 06:00 UTC): `/api/cron/market-sync`
- Pulls OpenRouter catalog size + candidate models to add
- Compares hosting anchors (Hetzner CX22 ≈ €4.51, DO $12, Vultr $10) against
  starter plan; >10% drift reported
- Phase 3 TODO: auto-adjust HOSTING_PLANS + email admin instead of report-only

## Secrets handling

- Worker reads DATABASE_URL from `apps/provisioner/.env` (chmod 600), never logged.
- OpenRouter key reaches openwebui via podman-compose `${OPENROUTER_API_KEY}`
  from the shell env or an `.env` next to podman-compose.yml.

## Verify

```
curl https://hostamar.com/api/cron/market-sync -H "x-vercel-cron: 1"
psql $DATABASE_URL -c 'SELECT id,status,name FROM "HostingRequest" ORDER BY "createdAt" DESC LIMIT 5;'
podman ps --format '{{.Names}} {{.Status}}'
```
