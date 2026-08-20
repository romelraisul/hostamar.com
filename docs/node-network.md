# Hostamar Node Network — 0 Taka Datacenter

```
Windows ──┐
Linux   ──┼── cloudflared tunnel run hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b) ──┐
Mac     ──┤                                          ├──▶ Cloudflare Edge 6815:210e
Phone   ──┘  (Tailscale 100.x mesh, no JumpServer)   │     ├─ hostamar.com
                                                      │     ├─ ai.hostamar.com (93 models, 6000 credit)
                                                      │     ├─ browser.hostamar.com (iframe)
                                                      │     └─ comfy.hostamar.com (ComfyUI)
                                                      │
                                                      └─▶ Worker api-router.js
                                                           try api-primary.hostamar.com (2s)
                                                           catch 530 → FALLBACK_URL Railway / phone tunnel
                                                           ⇒ never 530 to user
```

## Correct commands
- `cloudflared tunnel list` — shows hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b) UUID
- `cloudflared tunnel run hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b)` — NOT --name
- `python C:\hostamar\gateway.py` — file in C:\hostamar\, not C:\Users\User\
- Gateway health: `GET /healthz` → {status:"ok", service:"hostamar-ai-gateway", credits:6000, models:93}

## Credit per use (6000 pool)
Video 100 • Chat 1 • Browser 5 • IDE 10 • Game 20 • Hosting 0 — logged to CreditTransaction.

## Tailscale (no JumpServer)
Install Tailscale on Windows + Phone + Linux → 100.89.x.x mesh. Worker can fallback to phone tunnel URL.
