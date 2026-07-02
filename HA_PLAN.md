# Hostamar HA Architecture — Run from WSL, Failover to Cloud

## Goal
- **Computer up**: All traffic (hostamar.com, API, AI) routes through WSL Docker
- **Computer down / network lost**: Automatic failover to Vercel + Railway
- **CDN**: Local nginx caching layer for static assets and model responses

---

## Current State (Jul 2026)

### Working
- hostamar-app (Next.js) → running in Docker, healthy
- hostamar-model (qwen3.6:27b proxy) → running, healthy
- hostamar-ollama → running, healthy
- hostamar-postgres / redis → healthy
- hostamar-cloudflared → running (exposes redis via tunnel)
- Vercel r2 (hostamar-clone) → **DEPLOYED** ✓ `https://hostamar-clone-m2fgbjyhh-romelraisul-8939s-projects.vercel.app`
- Vercel r4 (fullstack-ecosystem) → deploying...

### Broken
- hostamar-ssh → **FIXED** (was restart loop, rebuilt)
- hostamar-camofox → **FIXED** (was DISPLAY crash, rebuilt with host network)
- hostamar-minio → unhealthy (disk I/O or init issue)
- hostamar-gpu-worker → unhealthy

---

## Architecture: Three-Layer Design

```
Internet
    │
    ▼
Cloudflare (DNS + Proxy + WAF)
    │  (always-online mode via CF Tunnel health checking)
    ├─► Cloudflare Tunnel ──► WSL/nginx:3000 ──► hostamar-app
    │                                  │
    │                           nginx caching layer
    │                                  │
    │                           ┌──────┴──────┐
    │                           │  Ollama     │
    │                           │  (qwen3.6)  │
    │                           └─────────────┘
    │
    └─► Vercel (permanent fallback for hostamar.com, ecosystem.hostamar.com)
        Railway (permanent fallback for worker)

    ▲ on WSL failure, CF Tunnel dies → CF serves Vercel automatically
```

### Layer 1 — Nginx (the smart router)
Nginx sits between Cloudflare Tunnel and your Docker containers. It:
- Proxies dynamic traffic to hostamar-app
- Caches static assets (JS/CSS/images) with `Cache-Control: public, max-age=31536000, immutable`
- Caches AI model responses (prompt + cached response KV store)
- Runs health checks on all backend services
- **Key**: When WSL goes down, nginx dies → Cloudflare Tunnel dies → CF failover fires

### Layer 2 — Cloudflare Tunnel (always-online)
- One tunnel: `hostamar-tunnel` → routes to WSL/nginx:80/443
- CF Tunnel monitors the origin every ~60s
- If tunnel can't reach origin for ~2-3 min → CF marks it unhealthy
- CF serves cached assets + falls back to configured failover IP/domain

### Layer 3 — Vercel / Railway (permanent fallback)
- Always live, never touched by WSL
- hostamar.com → Vercel project (already deployed)
- ecosystem.hostamar.com → Vercel project (already deployed, r4 in progress)
- Worker → Railway (token needed)

---

## Implementation: Step by Step

### Phase 1: Nginx as the central proxy in WSL

```bash
# Install nginx in the WSL Docker network (use alpine container)
# Add to docker-compose.yml:
nginx-proxy:
  image: nginx:alpine
  container_name: hostamar-nginx
  restart: unless-stopped
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/cache:/var/cache/nginx
  depends_on:
    - hostamar-app
    - hostamar-model
  networks:
    - hostamar-network
```

### nginx.conf config:
```nginx
worker_processes 1;
events { worker_connections 512; }

http {
  proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=STATIC:10m max_size=1g use_temp_path=off;
  proxy_cache_path /var/cache/nginx/ai levels=1:2 keys_zone=AI:50m max_size=5g use_temp_path=off;

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
  limit_req_zone $binary_remote_addr zone=auth:10m rate=3r/m;

  upstream app {
    server hostamar-app:3000;
    keepalive 32;
  }

  upstream model {
    server hostamar-model:8000;
    keepalive 16;
  }

  server {
    listen 80;
    server_name hostamar.com www.hostamar.com;

    # Static assets — long cache
    location /_next/static/ {
      proxy_pass http://app;
      proxy_cache STATIC;
      proxy_cache_valid 200 31536000s;
      add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /static/ {
      proxy_pass http://app;
      proxy_cache STATIC;
      proxy_cache_valid 200 7d;
      add_header Cache-Control "public, max-age=604800";
    }

    # AI model proxy — cache by prompt hash
    location /api/chat {
      proxy_pass http://model;
      proxy_cache AI;
      proxy_cache_key "$request_uri|$request_body";
      proxy_cache_valid 200 1h;
      add_header X-Cache-Status $upstream_cache_status;
      proxy_set_header X-Real-IP $remote_addr;
    }

    # Dynamic app
    location / {
      limit_req zone=api burst=20 nodelay;
      proxy_pass http://app;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
  }
}
```

### Phase 2: Point Cloudflare Tunnel to nginx (instead of direct to app)

Update cloudflared config to route to nginx instead of hostamar-app:

```yaml
# cloudflared/config.yml or via docker env
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: hostamar.com
    service: http://hostamar-nginx:80
    originRequest:
      noTLSVerify: false
  - hostname: api.hostamar.com
    service: http://hostamar-nginx:80
  - hostname: redis.hostamar.com
    service: http://hostamar-redis-bridge:6380
  - service: http_status:404
```

### Phase 3: Configure Cloudflare Failover

In Cloudflare Dashboard → your domain → DNS settings:
- Set `A hostamar.com` → Cloudflare Proxy (orange)
- Set `A api.hostamar.com` → Cloudflare Proxy
- Configure **Health Checks** on the tunnel origin:
  - `https://hostamar-nginx/` → check every 60s
  - Failure threshold: 3
  - Success threshold: 1

When WSL goes down → CF tunnel dies → Health check fails 3x → 
Cloudflare serves from cache (if any) or shows error to users.

### Phase 4: Vercel = permanent online fallback

**Since Vercel is already live, CF failover = Vercel URL.**

To make it seamless:
1. Vercel project: set custom domain `hostamar.com` in project settings
2. In Cloudflare DNS: add a **secondary A record** or CNAME failover
3. Use Cloudflare's **Load Balancing** (free tier has 1 origin):
   - Origin 1: WSL tunnel (primary)
   - Health check on WSL tunnel → if fail → failover to Vercel URL

```
Cloudflare Load Balancer:
  - Origin 1 (primary): hostamar-tunnel.<account>.trycloudflare.com
    Health check: GET / → expect 200
  - Fallback (fallback): hostamar-clone-m2fgbjyhh.vercel.app
```

### Phase 5: Railway worker = background job fallback

Railway already deployed. To handle failover:
- WSL down → BullMQ Redis unavailable → jobs pile up in Redis queue
- Railway worker monitors Redis (it connects via `REDIS_URL`)
- When Redis is unreachable for >5 min, Railway worker sleeps and retries
- Jobs don't disappear — they wait in Redis until Redis comes back online

---

## Failover Timeline (what happens when PC loses power)

```
T+0:00  — PC goes down, nginx dies
T+0:30  — Cloudflare Tunnel loses connection, reports unhealthy
T+1:30  — CF health check fails 3x consecutive → marks origin DOWN
T+1:35  — CF Load Balancer activates fallback → all traffic to Vercel
T+1:35  — Users see hostamar.com via Vercel (failover complete)
T+1:35  — AI calls to hostamar-model → Vercel serverless fn → upstream Ollama
          (Ollama is local, so AI calls WILL fail until WSL back up)
         → Add Vercel environment: OLLAMA_FALLBACK_URL=qwen3.6:27b via hostamar-model:8000
           When WSL down, use OpenAI API as fallback
T+5:00  — Railway worker loses Redis connection → jobs queue up, retries later
```

**Recovery**: PC boots, Docker starts, nginx starts, cloudflared reconnects,
CF health check passes → Load Balancer switches back to primary automatically.

---

## CDN Setup (nginx layer = local CDN)

nginx already acts as a CDN for:
- `/static/*` and `/_next/static/*` → cached 1 year
- Model responses → cached 1h by prompt hash

Cloudflare is the global CDN on top:
- Set Cache Rules: `hostamar.com/*` → edge cache 1 hour
- Browser cache: `max-age=0` (respects Cloudflare edge)

---

## What's needed to implement this

1. **nginx container** added to docker-compose.yml (quick, ~30min)
2. **cloudflared config updated** to point to nginx (5min)
3. **Cloudflare Load Balancing** configured (free tier, ~15min)
4. **Vercel custom domain** + SSL (already has SSL, just point DNS)
5. **Ollama fallback URL** in Vercel env vars (use OpenAI API or another cloud Ollama)

---

## Priority order for Romel

1. Add nginx-proxy to docker-compose.yml + restart containers
2. Update cloudflared config to target nginx
3. Configure Cloudflare Load Balancer with WSL as primary, Vercel as fallback
4. Set Vercel custom domain hostamar.com → routes via CF LB
5. Done — WSL is primary, Vercel is permanent fallback