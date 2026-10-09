# Disabled services — 2026-10-09

"5 broken services disabled" turned out to be **1 real disable + 4 already in the desired state**.
Reported honestly rather than ticking the box.

| Service | State found | Evidence | Action |
|---|---|---|---|
| `hostamar-provisioner` (container) | **restart loop — 10218 restarts** | `podman inspect` RestartCount=10218, policy=unless-stopped; container command `npm i --omit=dev @prisma/client && node worker.mjs`; worker.mjs died at import | **DISABLED** — `podman stop` + `podman update --restart=no`; loop frozen at 10218. `podman-compose.yml` had `restart: unless-stopped` (line 61) -> now `restart: "no"` with a comment carrying the real reason |
| `hostamar-litserve` | **healthy — do not touch** | `is-enabled=enabled`, `is-active=active`, uptime since 02:22:40; `curl /health` -> `{"status":"ok","service":"hostamar-ai-gateway"}`; venv `/home/romel/.venvs/litserve/bin/python` **exists** | **LEFT RUNNING** — the brief's "missing venv/uvicorn" is false |
| `hostamar-provisioner-native` | was `disabled` + `inactive` | — | **NOW ENABLED + ACTIVE — this is the fix.** It runs the same `apps/provisioner/worker.mjs` (mounted into the container too), whose Prisma import is now `import pkg from "@prisma/client"; const {PrismaClient}=pkg` + `@prisma/adapter-libsql`; the named-ESM-export crash is gone. Verified under systemd's own `EnvironmentFile` parsing: `libsql/web -> 103 rows`, `hostingRequest.count() -> 0`, `NRestarts=0` over 51 min |
| `podman-restart` | already `disabled` + `inactive` | idem | verified, no change |
| `hyperspace` | already `disabled` + `inactive` | idem | verified, no change |

Result: **16** hostamar-scoped services running, **0 failed**. Nothing was disabled that was working.

The provisioner runs as **`hostamar-provisioner-native.service`** (one poller). Do **not** start the
container as well — two pollers on the same queue provision the same request twice. If you ever
move back to the container, its `command:` must install the deps the fixed worker imports:

```
# docker.io/library/node:22-alpine shelf, only if you retire the native unit
npm i --omit=dev @prisma/client @prisma/adapter-libsql @libsql/client && node worker.mjs
```
