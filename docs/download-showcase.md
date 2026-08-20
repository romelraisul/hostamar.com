# Download — Hostamar Node 0 Taka Datacenter

## Installers (v0.1.3-node)

| OS | Installer | URL | Size | Build |
|---|---|---|---|---|
| Windows | Hostamar-Node_x64_en-US.msi | https://github.com/romelraisul/hostamar.com/releases/download/v0.1.3/Hostamar-Node_x64_en-US.msi | 3.3 MB | windows-latest |
| Windows | Hostamar-Node_x64-setup.exe (NSIS) | https://github.com/romelraisul/hostamar.com/releases/download/v0.1.3/Hostamar-Node_x64-setup.exe | same |
| Linux | Hostamar-Node_1.0.0_amd64.deb | https://github.com/romelraisul/hostamar.com/releases/download/v0.1.3/Hostamar-Node_1.0.0_amd64.deb | 5.1 MB | ubuntu-latest |
| Linux | Hostamar-Node_1.0.0_amd64.AppImage | https://github.com/romelraisul/hostamar.com/releases/download/v0.1.3/Hostamar-Node_1.0.0_amd64.AppImage | 87 MB | same |
| Mac | Hostamar-Node_aarch64.dmg | https://github.com/romelraisul/hostamar.com/releases/download/v0.1.3/Hostamar-Node_aarch64.dmg | 3.7 MB | macos-latest |
| Android | Hostamar-Node.apk | https://github.com/romelraisul/hostamar.com/releases/tag/v0.1.3 | pending — EAS build next |
| iOS | TestFlight | https://testflight.apple.com/join/hostamar | `eas build --platform ios` |

Fallback: Cloudflare R2 hostamar-downloads bucket mirrors above.

## Correct commands
```bat
cloudflared tunnel list
cloudflared tunnel run hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b)
python C:\hostamar\gateway.py
```
Task Scheduler: Hostamar Node at logon → cloudflared + gateway.

## How it works
Phone + Windows/Linux/Mac → Cloudflare Tunnel `hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b)` → Edge 6815:210e → hostamar.com + browser/comfy/ai 200 + 93 models + 6000 credit.
Worker `api-router.js`: try `api-primary.hostamar.com` 2s → on 530 → `FALLBACK_URL` Railway/phone → never 530.
JumpServer? No. Use Tailscale 100.x mesh (free 100 devices).
