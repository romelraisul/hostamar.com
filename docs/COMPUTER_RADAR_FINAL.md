# COMPUTER RADAR FINAL — DESKTOP-9KA03CQ (2026-10-10)

All numbers measured on this machine in this pass, not carried over.

## Box

    host          DESKTOP-9KA03CQ (WSL2)
    os            Ubuntu 26.04 LTS (Resolute Raccoon), kernel 6.6.114.1-microsoft-standard-WSL2
    uptime        1 day, 9 h 56 m (since 2026-10-08 17:09:05)
    cpu/mem       35 GiB total — 32 GiB used, 2.9 GiB available, 14 GiB swap in use
    disk          / and /home on /dev/sdd — 550G used / 406G avail (58%)
    gpu           NVIDIA GeForce RTX 5060 — 6,553 / 8,151 MiB, utilisation 100%
    systemd       /etc/wsl.conf [boot] systemd=true

**Memory pressure is the one real risk on this box.** `ps` shows a single 21.92 GB RSS
process: pid 472 `main.py --listen 127.0.0.1 --port 8188 --lowvram --disable-auto-launch`
(ComfyUI's entrypoint, started at boot, 1 d 9 h ago). With an 8 GB VRAM ceiling and
`--lowvram`, ComfyUI intentionally keeps models in host RAM — so this is expected behaviour
for the video pipeline, not obviously a leak, but it is what forces 14 GiB of swap. Left
running (it is product infrastructure). Reclaim it only by restarting ComfyUI when idle;
killing it breaks the video pipeline.

## Fleet, ports, timers

    podman        6 up / 0 failed -- hostamar-tv-rtmp, puppy-linux, hostamar-openwebui,
                  hostamar-code-server, hostamar-uptime, hostamar-minio
                  (the "16 fleet" figure does not match podman: this host runs 6 containers
                   plus hostamar-provisioner-native as a native process)
    provisioner   active, container variant Exited with restart:no = the deliberate one-poller
    systemd       0 failed (system) + 0 failed (user)
    ssh.socket    active (running), Listen 0.0.0.0:2222 + [::]:2222
    listening     2222 ssh · 3000 python3 · 3002 FreeLLMAPI · 3004 uptime-kuma (rootlessport)
                  8081 embedding router (python3) · 11434 ollama (127.0.0.1 only) · 11442 gateway (host side)
    Linger        yes
    radar.timer          enabled/active — last 02:53:44, next 03:08:44 (15 min)
    radar-deep.timer     enabled/active — next 03:31:22 (nightly deep pass)
    tail-radar.service   enabled/active — persistent `wrangler tail hostamar-pages` ledger
    all three symlinked from ops/monitoring/ in this repo -> survive reboot

## Radar pass (ops/monitoring/radar.sh) — FAIL=0 WARN=1 SKIP=1

    L1 routes 13/13 x200 · og:tags 6 pages carry og:image · og:image 200 image/png 52438 B
    L2 health healthy db=connected · models 176 · free-models 48 · pins 6/6 · audit 401
    L2 good-models WARN: UPSTASH_REDIS_* unset on the Worker, and nothing calls the route
    L3 receipts jsonl=140 turso=140 MATCH
    L4 containers 6 up · provisioner native active · disk 58% · gpu 6553/8151 MiB · kuma 302
    L5 ssh.socket 2222 · systemd 0 failed · gate SELFTEST_PASS
    L5 waf appsumo SKIP: no credential on this box has Cloudflare Firewall:Edit (error 10000)
    L6 pricing 3 plans in JSON-LD (990/1900/2900) · Product on / · FAQPage on /faq · sitemap 200
    L7 tail 595 events, ok 595, exceededCpu 0, max 828 ms, mean 119 ms, cold>400 ms 38 (6%),
       0-kill 95% upper bound 0.50% -- MEETS the <=0.8% target (373-event threshold crossed)

Suites: `node scripts/test-billing.mjs` **14/14 PASS**, `node scripts/test-store.mjs`
**13/13 PASS**. Codebase shape: 290 `route.ts` files, 12 of them call `deductCredits`,
91 Prisma models, 964 .ts/.tsx files under app/lib/components.

## AppSumo / WAF — status only (listing parked as instructed)

Scanner ranges are Render's, not AppSumo's: 74.220.48.0/24 + 74.220.56.0/24 (RDAP handle
RS-1125, registrant Render). Cloudflare Bot Fight Mode cannot be skipped by WAF custom
rules, so an **IP Access Rule «Allow»** is the right instrument — and it cannot be applied
from this machine: both tokens here (Zone:Read + worker OAuth) return error 10000 on
`firewall/access_rules`. Dashboard only:
Cloudflare → hostamar.com → Security → WAF → Tools → IP Access Rules → Allow both ranges,
note "AppSumo Render scanner". Radar reports this as SKIP, never FAIL. Not blocking dev.

## Findings this pass

1. **AGENTS.md repo-layout section was wrong** and cost an agent a wild-goose lookup:
   it named `/mnt/c/Users/User/hostamar.com` (does not exist) on branch `sso-providers`
   (not checked out). Corrected in this repo to the four real checkouts with remotes,
   branches and which one builds the `hostamar-pages` Worker.
2. **`/mnt/c/Users/User/hostamar` is the WIP checkout** — branch `fix/store-page-design`
   @ b9e25cd, 513 uncommitted entries, also Vercel-linked to the same projectId. Untouched.
3. **"fleet 16" is not what this host runs** — 6 podman containers + the native provisioner.
4. **22 GB ComfyUI RSS / 14 GiB swap** — expected with `--lowvram` on 8 GB VRAM, but it is
   the closest thing to a capacity cliff here. Restart ComfyUI when idle to reclaim.
5. Four pre-existing worktree edits in this repo are not from this task and stay unstaged:
   `.gitignore`, `litserve_gateway/client.py`, `scripts/turso-fleet-insert.cjs`,
   `tsconfig.tsbuildinfo`. Review them yourself.
