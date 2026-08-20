# Outage 20 Aug 2026 — Subdomains 530 vs Main LIVE

## Diagnosis (09:45 BST)

| Domain | DNS (getent) | HTTP | Root Cause |
|---|---|---|---|
| hostamar.com | 2606:4700:3036::6815:210e (Cloudflare) — Vercel alias hostamar.com -> Vercel project hostamar-build | 200 114p Ready | LIVE |
| ai.hostamar.com | 2606:4700:3036::6815:210e — Cloudflare Worker route (wrangler.toml: ai.hostamar.com tunnel gateway) | 200 `{"status":"ok","service":"hostamar-ai-gateway"}` + 501 without Bearer (expected) | LIVE — gateway OK, needs API key |
| browser.hostamar.com | 2606:4700:3036::6815:210e | 530 error 1033 Argo tunnel | Tunnel origin DOWN — needs Windows host running cloudflared tunnel (primary) or Worker fallback |
| comfy.hostamar.com | 2606:4700:3036::6815:210e | 530 error 1033 | Same tunnel DOWN |
| api.hostamar.com | 2606:4700:3036::6815:210e — Worker api-router.js | 530 (primary https://api-primary.hostamar.com tunnel DOWN, fallback FALLBACK_URL not set / Railway paused) | Worker circuit open, both origins unreachable |

DNS is FINE (all 4 resolve to Cloudflare edge). Deploys dpl_J9... did NOT delete DNS or Vercel aliases. Main hostamar.com still 114p aliased. Subdomains are tunnel-backed (not Vercel projects): browser/comfy/api via api-primary.hostamar.com Cloudflare Tunnel -> Windows hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b):3000. Tunnel is DOWN (Windows not running).

## What Happened
- Vercel: only hostamar.com + www.hostamar.com aliased to hostamar-build project — browser/comfy/ai NOT separate Vercel projects, never were.
- Cloudflare: nameservers maeve/rodney (Cloudflare), expected Vercel ns1/ns2 mismatch warning is cosmetic (DNS stays Cloudflare, Vercel verifies via A record 76.76.21.21 / CNAME). Not cause.
- Worker wrangler.toml: only api.hostamar.com/* route, falls back to https://web-production-1234d.up.railway.app when primary tunnel fails. Primary is https://api-primary.hostamar.com (tunnel) — DOWN.

## Recovery
1. Start Windows host: cloudflared tunnel run --name hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b) (or restart Windows host where gateway.py runs). Tunnel exposes api-primary + comfy + browser origins.
2. If Windows host stays off: set Worker env FALLBACK_URL to live Railway deployment URL (redeploy Railway if paused) so api.hostamar.com falls back without 530.
3. For production-grade per spec:
   - browser.hostamar.com: Opera Aria FREE spec — URL bar + iframe sandbox + /api/browser/summarize (already built in app/browser with fallback)
   - comfy.hostamar.com: InVideo spec — promptBn+style+9:16+BGM+avatarUrl -> /v1/generate + history 6000 credit per account (credits field @default(0), seed via lib ensures 6000 on signup)
   - ai.hostamar.com: Replit/Cursor spec — Monaco + WebContainers + 93 models selector (lib/replicate + ai gateway) + credit meter 6000

## Verify After Tunnel Up
curl -I https://browser.hostamar.com -> 200
curl -I https://comfy.hostamar.com -> 200
curl -I https://ai.hostamar.com -> 200 {"status":"ok"} + Bearer /v1/models returns 93 models
curl -I https://api.hostamar.com/api/health -> 200 via primary or fallback
npm run build -> 114 pages 0 errors, shared 87.6kB

## Prevent
- Add tunnel keepalive: Windows Task Scheduler start gateway + cloudflared on boot
- Set Worker FALLBACK_URL secret in Cloudflare Workers dashboard so 530 never surfaces
- Add *.hostamar.com wildcard DNS Proxied ON + wildcard fallback if needed (Vercel wildcard not needed — subdomains are tunnel)

## ⛑️ FIX (Windows — 0 Taka, no JumpServer)

**You typed wrong — correct is:**
```bat
cloudflared tunnel list
cloudflared tunnel run hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b)
```
NOT `cloudflared tunnel run --name hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b)` (flag `--name` does not exist)

```bat
dir C:\hostamar\gateway.py
python C:\hostamar\gateway.py
```
NOT `python gateway.py` from `C:\Users\User\` (file is in `C:\hostamar\`)

**Auto-start on boot (Task Scheduler):**
1. Win+R → `taskschd.msc`
2. Create Task → Name `Hostamar Node`
3. Trigger: At log on → Action: Start program `C:\Program Files\cloudflared\cloudflared.exe` Args `tunnel run hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b)`
4. Second task: Program `python` Args `C:\hostamar\gateway.py` Start in `C:\hostamar`
5. Check "Run whether user is logged on or not" → OK

Verify: `curl -I https://browser.hostamar.com` → 200, `curl -I https://comfy.hostamar.com` → 200, `curl https://ai.hostamar.com` → {"status":"ok"}


Correct: `cloudflared tunnel run hostamar-prod-new` (positional, NOT --name). Real ingress: browser→9377, comfy→8190, ai→11442, api/hostamar→3000.
