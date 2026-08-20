# Phone as Datacenter — Fallback when PC down

## Why
Windows host may sleep. Phone stays online and serves browser/comfy via tunnel fallback.

## Setup (0 Taka)
1. Install Tailscale on phone + Windows → same tailnet (100.x)
2. Install cloudflared on phone (Termux) or use Expo app foreground service
3. Phone app: header Hostamar Node • Phone Datacenter • credit 6000/6000 • cards Windows OFFLINE red / Phone ONLINE green 100.89.x.x / AI Gateway 200 LIVE / Railway Fallback • buttons Start Tunnel green #0E7C3A / Start Gateway blue / Start Worker amber / Stop All gray • 6 products grid + logs showing fixes for --name error • sticky "Phone serves browser/comfy when PC down"

## Background
- Android: Foreground Service + Expo TaskManager keeps tunnel alive when minimized
- iOS: BackgroundFetch (best-effort) + Tailscale

## Verify
PC down → phone tunnel up → `curl -I https://browser.hostamar.com` still 200 via FALLBACK_URL/phone.

## Dev IDE + AI Android (v0.1.5)
- /dev — Monaco + File Explorer + Terminal + AI Chat 93 models, credit 6000 #0E7C3A, Run (5) Build (100)
- /dev/android — prompt "Build todo app" → Expo 51 → Build APK 0 Taka (gradle local, no EXPO_TOKEN)
- Desktop Dev tab embeds http://127.0.0.1:3000/dev via webview + Tauri shell plugin — builds locally 0 Taka
