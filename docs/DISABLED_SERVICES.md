# Disabled services — 2026-10-09

"5 broken services disabled" turned out to be **1 real disable + 4 already in the desired state**.
Reported honestly rather than ticking the box.

| Service | State found | Evidence | Action |
|---|---|---|---|
| `hostamar-provisioner` (container) | **restart loop — 10218 restarts** | `podman inspect` RestartCount=10218, policy=unless-stopped; container command `npm i --omit=dev @prisma/client && node worker.mjs`; worker.mjs dies at import (Prisma ESM/CJS) | **DISABLED** — `podman stop` + `podman update --restart=no`; loop frozen at 10218. `podman-compose.yml` had `restart: unless-stopped` (line 61) -> now `restart: "no"` with a comment |
| `hostamar-litserve` | **healthy — do not touch** | `is-enabled=enabled`, `is-active=active`, uptime since 02:22:40; `curl /health` -> `{"status":"ok","service":"hostamar-ai-gateway"}`; venv `/home/romel/.venvs/litserve/bin/python` **exists** | **LEFT RUNNING** — the brief's "missing venv/uvicorn" is false |
| `hostamar-provisioner-native` | already `disabled` + `inactive` | systemctl --user is-enabled/is-active | verified, no change |
| `podman-restart` | already `disabled` + `inactive` | idem | verified, no change |
| `hyperspace` | already `disabled` + `inactive` | idem | verified, no change |

Result: 15 hostamar-scoped services running, **0 failed**. Nothing was disabled that was working.

Re-enable the provisioner (after fixing the worker's Prisma import):
```
podman update --restart=unless-stopped hostamar-provisioner && podman start hostamar-provisioner
# and restore `restart: unless-stopped` in podman-compose.yml
```
