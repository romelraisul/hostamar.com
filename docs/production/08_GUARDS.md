# Hostamar.com — Guards & Fallback Chain

**Last verified:** 2026-11-04 Asia/Dhaka  
**Status:** All guards active, fallback chain verified

## Guard Inventory

| Guard | Scope | Limit | Action on Exhaust |
|-------|-------|-------|-------------------|
| **AlwaysData** | `hostamar.alwaysdata.net` fallback | 1GB forever free, personal use | Suspend risk if commercial/heavy traffic |
| **Cloudflare Free** | Pages, Workers, KV, R2 | Pages: unlimited, Workers: 100k/day, KV: 1GB, R2: 10GB | nvidia-guard fallback chain |
| **B2 Guard** | `hostamar-prod` bucket | 10GB | Alert at 8GB, 1-day lifecycle |
| **WSL Guard** | WSL2 disk | `.wslconfig` 50GB limit | `~/compact_vhdx.ps1` reclaim |
| **UA Guard** | Cloudflare WAF | 100 req/10s, cap 10s | Custom UA rules, curl UA blocked |
| **TV Guards** | TV pipeline | `tv-agent` secret, HLS health | Auto-restart via systemd |
| **nvidia-guard** | LLM gateway | 6 models, concurrency 6 | Fallback chain (see below) |

## nvidia-guard Fallback Chain (Live)

```
1. freellmapi/auto:fast → NVIDIA Guard :12436
   - 6 models: glm-5.3-flash, deepseek-v4.1-flash, minimax-m3.1-flash,
     step-5-preview, nemotron-3.5-bolt, nemotron-ultra
   - Concurrency: 6
   - On 429 / insufficient balance →

2. Zhipu fallback (GLM-5.3)
   - On fail →

3. hostamar-own-fast :4000
   - Local ComfyUI RTX 5060 via Gateway 11442
   - On fail →

4. Cloudflare Workers AI
   - Final fallback
```

**Compression:** `kilo-auto/free` @ `api.kilo.ai`

## Known Issues & Fixes

### File Limit 1024 (blocks python_execution)
**Symptom:** `.krabby/tool_results` > 1024 files → python_execution blocked
**Fix:** 
```bash
rm -rf /home/romel/.hermes/tool_results/*.json
```

### state.db 4.6GB → 3.17GB (VACUUM)
**Fix:**
```bash
sqlite3 /home/romel/.hermes/state.db "VACUUM;"
```

### Browser Tool 147 URLs Limit
**Symptom:** `BAD_REQUEST user_provided_urls must contain at most 100`
**Fix:** Clear tool_results and restart session

### /tmp Self-Deletes (`hermes-completion-*`)
**Fix:** Use `/home/romel/` persistent paths, NOT `/tmp`

### reconcile.py Overwrites Fallback
**Issue:** Fallback pinned to dead `omniroute` instead of `hostamar-own-fast :4000`
**Fix:** Pin fallback to `hostamar-own-fast :4000`

### Dead Models (410 Gone)
**Models EOL Oct 28:** `z-ai/glm-5.3`, `kimi-k3` — 502 All 8 routed attempts failed
**Fix:** Update nvidia-guard model list, remove dead models

### 137+112 Sessions Pinned
**Issue:** Sessions stuck on dead models
**Fix:** Reconcile fallback, rotate keys

### browser-rs MCP 9322 Reconnect Loop
**Fix:** Restart browser-rs MCP server

### Telegram setWebhook Conflict
**Fix:** Clear stale locks, reset webhook

### OpenClaw Gateway Wedge
**Issue:** IPv6 `::1` vs `127.0.0.1` token leaked, rotated to 64-hex
**Fix:** QR regenerate with Windows LAN IP `192.168.10.70`, firewall rule needed

### Leaked Tokens (Rotated)
- Vercel token `vca_...` → rotated
- Cloudflare token `cfut_...` → rotated
- JWT: Custom (not NextAuth)

## Verification Commands

```bash
# All guards check
curl -s http://127.0.0.1:12436/v1/models | jq '.data | length'  # nvidia-guard: 6
curl -s http://127.0.0.1:8089/api/status | jq '.message'        # Infisical: Ok
curl -sI https://hostamar.com/models.json | grep cf-ray         # Cloudflare: HIT

# Fallback chain test (force guard failure)
# Temporarily stop nvidia-guard, verify Zhipu serves
systemctl --user stop nvidia-guard
curl -s https://hostamar.com/api/v1/models | jq '.provider'
systemctl --user start nvidia-guard
```