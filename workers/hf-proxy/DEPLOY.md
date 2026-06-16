# HF Inference API Proxy - Deployment Guide

A Cloudflare Worker that proxies HuggingFace Inference API requests to bypass DNS blocking in Bangladesh.

## Files

```
workers/hf-proxy/
├── index.js        # Worker script
└── wrangler.toml   # Wrangler configuration
```

## Prerequisites

1. **Cloudflare Account** - Sign up at https://dash.cloudflare.com/
2. **Wrangler CLI** - Install via:
   ```bash
   npm install -g wrangler
   # or
   npx wrangler@latest
   ```
3. **HF Token** - Get from https://huggingface.co/settings/tokens

## Setup

### 1. Navigate to Worker Directory

```bash
cd workers/hf-proxy
```

### 2. Set Your Account ID

Edit `wrangler.toml` and set your Cloudflare account ID:
```toml
account_id = "YOUR_ACCOUNT_ID"
```

Find your Account ID at: https://dash.cloudflare.com/<your-email>/overview

### 3. Configure HF Token (Required)

Set the HF_TOKEN secret:
```bash
wrangler secret put HF_TOKEN
# Enter: hf_mieQbcNNPAvnKStppSCyWboZVRgJAOeSd
```

### 4. Optional: Configure Custom Route

If you have a domain connected to Cloudflare, uncomment and set the route in `wrangler.toml`:
```toml
routes = [
  { pattern = "hf-proxy.yourdomain.com", zone_name = "yourdomain.com" }
]
```

## Deployment

### Option A: Deploy via Wrangler CLI

```bash
cd workers/hf-proxy
wrangler deploy
```

### Option B: Deploy via Cloudflare REST API

```bash
# Get your Cloudflare API Token from:
# https://dash.cloudflare.com/profile/api-tokens

export CF_API_TOKEN="your_api_token"
export ACCOUNT_ID="your_account_id"
export WORKER_NAME="hf-proxy"

# Create worker script
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/javascript" \
  --data-binary @index.js

# Set secret
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}/secrets/HF_TOKEN" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"value": "hf_mieQbcNNPAvnKStppSCyWboZVRgJAOeSd"}'
```

## Usage

After deployment, use the worker URL:

| Endpoint | Worker URL |
|----------|------------|
| Inference API | `https://hf-proxy.<your-subdomain>.workers.dev` |

### Example: Query a Model

```bash
# Without client token (uses worker's HF_TOKEN)
curl -X POST "https://hf-proxy.<your-subdomain>.workers.dev/models/facebook/bart-large-mnli" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "I love pizza"}'

# With client token override
curl -X POST "https://hf-proxy.<your-subdomain>.workers.dev/models/facebook/bart-large-mnli" \
  -H "Authorization: Bearer hf_your_client_token" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "I love pizza"}'
```

### Update Existing Deploy

```bash
cd workers/hf-proxy
wrangler deploy
```

## Troubleshooting

### Check Deployment Status
```bash
wrangler whoami
wrangler deployments list --name hf-proxy
```

### View Logs
```bash
wrangler logs --name hf-proxy
```

### Test Locally
```bash
cd workers/hf-proxy
wrangler dev --local
# Then visit http://localhost:8787
```

## Notes

- The worker forwards all requests to `https://api-inference.huggingface.co`
- Client can pass their own HF token via `Authorization: Bearer hf_xxx` header
- If no client token provided, worker's `HF_TOKEN` is used
- Worker is deployed to Cloudflare's edge network (no region specification needed)