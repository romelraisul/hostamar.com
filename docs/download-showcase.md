# Download — Hostamar Node 0 Taka Datacenter

## Installers (v0.1.0-node)

| OS | Installer | URL | Build |
|---|---|---|---|
| Windows | Hostamar-Node_x64_en-US.msi | https://github.com/romelraisul/hostamar.com/releases/download/v0.1.0/Hostamar-Node_x64_en-US.msi | `cd apps/desktop && npm run tauri build` on windows-latest |
| Windows | Hostamar-Node_x64-setup.exe (NSIS) | https://github.com/romelraisul/hostamar.com/releases/download/v0.1.0/Hostamar-Node_x64-setup.exe | same |
| Linux | Hostamar-Node_1.0.0_amd64.deb | https://github.com/romelraisul/hostamar.com/releases/download/v0.1.0/Hostamar-Node_1.0.0_amd64.deb | ubuntu-latest |
| Linux | Hostamar-Node_1.0.0_amd64.AppImage | https://github.com/romelraisul/hostamar.com/releases/download/v0.1.0/Hostamar-Node_1.0.0_amd64.AppImage | same |
| Mac | Hostamar-Node_x64.dmg | https://github.com/romelraisul/hostamar.com/releases/download/v0.1.0/Hostamar-Node_x64.dmg | macos-latest |
| Android | Hostamar-Node.apk | https://github.com/romelraisul/hostamar.com/releases/download/v0.1.0/Hostamar-Node.apk | `cd apps/mobile && eas build --platform android --local` |
| iOS | TestFlight | https://testflight.apple.com/join/hostamar | `eas build --platform ios` |

Fallback: Cloudflare R2 hostamar-downloads bucket mirrors above.

## Correct commands
```bat
cloudflared tunnel list
cloudflared tunnel run hostamar-app
python C:\hostamar\gateway.py
```
Task Scheduler: Hostamar Node at logon → cloudflared + gateway.

## How it works
Phone + Windows/Linux/Mac → Cloudflare Tunnel `hostamar-app` → Edge 6815:210e → hostamar.com + browser/comfy/ai 200 + 93 models + 6000 credit.
Worker `api-router.js`: try `api-primary.hostamar.com` 2s → on 530 → `FALLBACK_URL` Railway/phone → never 530.
JumpServer? No. Use Tailscale 100.x mesh (free 100 devices).
