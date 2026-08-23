# FIX 3 GATEWAYS — browser / ai / v1 recovery runbook (2026-08-23)

Post power-cut report said browser.hostamar.com 502, ai.hostamar.com 530, hostamar.com/v1 fails.
**Diagnosis found 2 of 3 were actually UP** — the report was stale. Only the browser AUTOMATION
backend was truly broken. This doc records the real topology + fixes so the next power cut is a
2-minute recovery.

## REAL TOPOLOGY (verified live)

| Public host | Served by | Backend | Status |
|---|---|---|---|
| hostamar.com | Vercel (hostamar-build) | Next.js | 200 |
| hostamar.com/v1/* | Vercel rewrite → ai.hostamar.com | Windows gateway :11442 | 200 (needs Bearer key) |
| ai.hostamar.com | Windows tunnel `hostamar-prod-new` (7a08ec13) | gateway.py :11442 (Windows) | 200 |
| browser.hostamar.com | Windows tunnel `hostamar-prod-new` | Windows :3000 (Next.js /browser page) | 200 (product page, NOT automation) |
| camofox.hostamar.com | WSL tunnel `hostamar-camofox` (394c7d28) | Camoufox server WSL :9377 | 200 ← the REAL browser automation |
| tv.hostamar.com / vp9 | WSL tunnel `hostamar-tv` (c3b55a05) | nginx :8080 / vp9 :8090 | 200 |
| comfy.hostamar.com | Windows tunnel | ComfyUI :8188 | 502 (container exited; GPU video gen, not needed for TV) |

Key insight: **browser.hostamar.com is the marketing/product page.** The actual Playwright/Camoufox
automation API lives at **camofox.hostamar.com** (WSL :9377). Scripts must use camofox.

## WHAT BROKE + FIX (2026-08-23)

Root cause: `camofox.hostamar.com` DNS CNAME pointed at tunnel `19c220ee-...` which had been
DELETED from the Cloudflare account → error 1033 (Argo Tunnel not found). The WSL camofox server
was also not running after the power cut.

Fix applied:
1. `camofox.service` (systemd --user) — starts Camoufox server on WSL :9377
   (`/home/romel/.hermes/node/bin/node server.js` in /home/romel/camofox-browser). Enabled.
2. Created new tunnel `hostamar-camofox` (394c7d28-4986-4297-8a3b-c4cce537f99d),
   config `/home/romel/camofox-tunnel.yml` (ONLY camofox ingress — do NOT add other hostnames,
   they belong to the Windows tunnel and would be shadowed).
3. `camofox-tunnel.service` (systemd --user) runs that tunnel. Enabled.
4. Repointed DNS via Cloudflare API: camofox CNAME → `394c7d28-....cfargotunnel.com` (proxied).

## RECOVERY AFTER NEXT POWER CUT (2 minutes)

```bash
# 1. TV stack (usually auto via Startup\Hostamar.bat → wsl)
systemctl --user list-units 'tv-*' --no-legend | awk '{print $1,$4}'
# 2. browser automation
systemctl --user is-active camofox camofox-tunnel   # both should be active (auto-start)
curl -s https://camofox.hostamar.com/health          # {"ok":true,...}
# if camofox-tunnel shows 1033: journalctl --user -u camofox-tunnel -n 20 (check tunnel registered)
# 3. ai + v1 (Windows side — survive if Windows is on)
curl -s https://ai.hostamar.com/health               # 200
curl -s https://hostamar.com/v1/models -H "Authorization: Bearer $KEY"   # 200 catalog
# if ai 530: Windows cloudflared/gateway died → on Windows run start-gateway.ps1
#   (see skill hostamar-gateway-recovery; gateway = C:\Users\User\hostamar-ai-gateway\gateway.py :11442)
```

## Camoufox API (for hunters/scrapers)

- Health: `GET https://camofox.hostamar.com/health`
- Open tab: `POST /tabs` body `{"userId":"tv-hunter","sessionKey":"k1","url":"https://..."}` → `{tabId}`
- Links: `GET /tabs/{tabId}/links?userId=tv-hunter`
- Snapshot (a11y tree): `GET /tabs/{tabId}/snapshot?userId=tv-hunter`
- Navigate/click/type/evaluate/screenshot: `POST /tabs/{tabId}/...` (see openapi.json in camofox-browser)
- Auth: loopback/dev mode = no key needed; set CAMOFOX_API_KEY to require Bearer.
- YouTube CC search: `https://www.youtube.com/results?search_query=<q>&sp=EgIwAQ%253D%253D`
  then verify license with `yt-dlp --dump-json` (field `license` must contain "Creative Commons").

## Pitfalls learned
- `cloudflared tunnel info <uuid>` "found 0 tunnels" = tunnel deleted from account → DNS CNAME is
  orphaned → 1033. Fix = new tunnel + Cloudflare API PATCH of the CNAME record.
- `cloudflared tunnel route dns` fails 1003 if an A/AAAA/CNAME already exists → PATCH via API instead.
- WSL systemd units: node lives at /home/romel/.hermes/node/bin/node, NOT /usr/bin/node.
- Windows↔WSL: from WSL use 172.17.112.1 to reach Windows services (gateway :11442);
  from Windows, WSL localhost-forwarding works for :9377.
- yt-dlp: PEP 668 blocks pip → use standalone binary ~/.local/bin/yt-dlp.
