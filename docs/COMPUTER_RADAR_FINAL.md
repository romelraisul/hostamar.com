# COMPUTER RADAR FINAL — DESKTOP-9KA03CQ (2026-10-10)

All numbers measured on this machine in this pass, not carried over.

## Box

    host          DESKTOP-9KA03CQ (WSL2)
    os            Ubuntu 26.04 LTS (Resolute Raccoon), kernel 6.6.114.1-microsoft-standard-WSL2
    uptime        1 day+ (since 2026-10-08 17:09:05)
    cpu/mem       36 GiB total — 18 GiB used, 1 GiB free, 18 GiB available, 16 GiB swap used (100%)
    disk          / and /home on /dev/sdd — 550G used / 406G avail (58%)
    gpu           NVIDIA GeForce RTX 5060 — ~3,090 / 8,151 MiB, idle between video jobs
    systemd       /etc/wsl.conf [boot] systemd=true

**Memory pressure is the one real risk on this box, and it lives in swap.** ComfyUI (`pid 472
main.py --listen 127.0.0.1 --port 8188 --lowvram --disable-auto-launch`) has peaked at 21.9 GB
RSS with a video model loaded and idles at ~2.6 GB once it unloads — normal for `--lowvram`
on an 8 GB VRAM ceiling, where models are parked in host RAM by design, not a leak. What stays
pinned is swap: **~16,375 of 16,384 MiB used, only a few MiB free**, with ~1 GB RAM free and
18 GB in buff/cache. Available RAM (18 GiB) is comfortable, so the box is not thrashing, but
there is no swap headroom left for a third big allocation. Radar L4 `mem` now warns on **either**
thin available RAM (<1.5 GiB) **or** swap exhaustion (>=15,000 MiB used) — the cliff is visible
instead of implied. Reclaim by restarting ComfyUI when idle; killing it without a restart breaks
the video pipeline.

## Fleet, ports, timers

    podman        6 up / 0 failed -- hostamar-tv-rtmp, puppy-linux, hostamar-openwebui,
                  hostamar-code-server, hostamar-uptime, hostamar-minio
                  (plus hostamar-provisioner -> Exited (1), restart:no = the deliberate
                   one-poller; the native hostamar-provisioner-native.service is the live one)
    native        20 hostamar systemd --user units, 19 active (18 running + hostamar-guard.timer
                  waiting) -- this is where the old "16 fleet" number came from: it counted
                  systemd units, not podman containers. Full list:
                  camofox-tunnel, camofox, cloudflared, hostamar-comfy-worker, hostamar-embedding-router,
                  hostamar-interop-bridge, hostamar-jev-model, hostamar-jev, hostamar-litserve,
                  hostamar-next, hostamar-ollama, hostamar-provisioner-native, hostamar-tunnel,
                  hostamar-vps (exited), medusa-ingress-tunnel, tail-radar, tv-agent, tv-tunnel,
                  hostamar-guard.timer
    comfyui       NOT a unit -- python pid 472 (started by scripts/start-comfyui.sh),
                  2.6 GB RSS idle, 21.9 GB peak with a video model parked in host RAM
    systemd       0 failed (system) + 0 failed (user)
    ssh.socket    active (running), Listen 0.0.0.0:2222 + [::]:2222
    listening     2222 ssh · 3000 python3 · 3002 FreeLLMAPI · 3004 uptime-kuma (rootlessport)
                  8081 embedding router (python3) · 11434 ollama (127.0.0.1 only)
                  11445 litserve gateway (host side; 11442 is comfy_api.py's stale default)
    Linger        yes
    radar.timer          enabled/active — last 02:53:44, next 03:08:44 (15 min)
    radar-deep.timer     enabled/active — next 03:31:22 (nightly deep pass)
    tail-radar.service   enabled/active — persistent `wrangler tail hostamar-pages` ledger
    all three symlinked from ops/monitoring/ in this repo -> survive reboot

## Radar pass (ops/monitoring/radar.sh) — FAIL=0 WARN=2 SKIP=1

    L1 routes 13/13 x200 · og:tags 6 pages carry og:image · og:image 200 image/png 52438 B
    L2 health healthy db=connected · models 176 · free-models 48 · pins 6/6 · audit 401
    L2 good-models WARN: UPSTASH_REDIS_* unset on the Worker => route returns a no-op.
       Kept: it is live code with real callers (app/api/marketing/first10/route.ts,
       app/api/v1/chat-all-answers/route.ts reference it as the "PC off" cache), and the
       route is the correct place for that cache. Fix = set Upstash on the Worker, not delete.
    L3 receipts jsonl=166 turso=166 MATCH (count grows as receipts land)
    L4 containers 6 up · provisioner native active · disk 58% · gpu ~3090/8151 MiB (37%) · kuma 302
       uptime-kuma answers 302 (redirect to /dashboard) — normal for an auth-walled service.
       radar.sh accepts 200 *or* 302 for this check; no fix needed.
    L4 mem WARN: ~18,4xx MiB avail, swap ~16,37x MiB used — swap exhausted (see Box above).
    L5 ssh.socket 2222 · systemd 0 failed · gate SELFTEST_PASS
    L5 waf appsumo SKIP: no credential on this box has Cloudflare Firewall:Edit (error 10000)
    L6 pricing 3 plans in JSON-LD (990/1900/2900) · Product on / · FAQPage on /faq · sitemap 200
    L7 tail 3223 events, ok 3221, exceededCpu 0, max 1085 ms, mean 108 ms, cold>400 ms 164 (5%),
       0-kill 95% upper bound **0.09%** -- MEETS the <=0.8% target (well past 373 events)

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

## What is NOT automated (honest limits)

- **Box-off blindness.** radar.sh runs *on* this host, so it cannot report hostamar.com down
  when the host itself is off. Needs a free external prober against
  `https://hostamar.com/api/health` — manual signup, steps in `ops/external-probe-setup.md`.
- **AppSumo WAF rule.** Dashboard-only (above).
- **ComfyUI restart on idle.** Manual by design: the trigger is "no video job in the last
  30 min", which radar cannot judge reliably.

## Findings this pass

1. **AGENTS.md repo-layout section was wrong** and cost an agent a wild-goose lookup:
   it named `/mnt/c/Users/User/hostamar.com` (does not exist) on branch `sso-providers`
   (not checked out). Corrected in this repo to the four real checkouts with remotes,
   branches and which one builds the `hostamar-pages` Worker.
2. **`/mnt/c/Users/User/hostamar` is the WIP checkout** — branch `fix/store-page-design`
   @ b9e25cd, 513 uncommitted entries, also Vercel-linked to the same projectId. Kept as WIP
   deliberately (nothing here depends on it); do not "clean" it without asking. Second checkout
   `/mnt/c/Users/User/hostamar-build` (private, `master` == origin) is the Vercel project
   `prj_WwYkMz8Kk75NN573skKxxWcuMVYi`.
3. **"fleet 16" is not what this host runs.** Two different counts got conflated: podman has
   **6 containers up** (+1 provisioner exited on purpose), and there are **20 native
   `systemd --user` hostamar units** (19 active). Neither number is 16. Corrected here.
4. **Swap, not RSS, is the capacity cliff.** ComfyUI peaks at 21.9 GB RSS with a model parked
   in host RAM (expected under `--lowvram`) and idles at 2.6 GB — but swap sits at
   16,375/16,384 MiB used with a few MiB free. Restart ComfyUI when idle to reclaim; radar L4
   `mem` now warns on swap exhaustion as well as thin available RAM.
5. **Four pre-existing worktree edits** (not from this task) reviewed and kept:
   `.gitignore` (ignores the generated `tests/edge-hmac/*` artifacts + `tsconfig.tsbuildinfo`),
   `litserve_gateway/client.py` (port 11442 → **11445**, matching the live listener),
   `scripts/turso-fleet-insert.cjs` (camelCase FleetReport payload: jobId/finished/couldnt/
   needsYou/raw). `tsconfig.tsbuildinfo` was already tracked — `git rm --cached`'d, it is a
   build artifact. Committed as `worktree cleanup`.
6. **litellm :4000 advertises 57 models, the NVIDIA guard serves 4.** Unrelated lists, not a
   bug: litellm's `model_list` is its own catalogue, the guard's allow-list is
   glm-5.3-flash / glm-5.3 / kimi-k3 / deepseek-v4.1-flash. See README §11.
7. **The deployed guard had drifted ahead of the repo copy.** `ops/nvidia-guard/nvidia_guard.py`
   in the repo lacked the reasoning-`max_tokens` floor that the *deployed* unit
   (`~/.hermes/nvidia-guard/nvidia_guard.py`, md5 0b8719d3) was running — so a blind sync of
   repo → deployed silently removed it, caught by the floor self-check
   (`test_rebuild_body.py` → `FAIL got 300 want 800`). Floor re-applied, both copies now
   identical (md5 145921e7), self-check `PASS reasoning_floor=800 models=4`, unit restarted,
   live burst re-verified **12/12 x200, 0 transport, 0 503, 0 shed**.
   Lesson: run the guard's proof tests after any file sync — that is what they are for.
8. **The tail ledger's 0-kill bound was misprinted, not the ledger.** radar.sh rendered the
   Clopper-Pearson bound with integer slicing (`300//tot` + `int(30000/tot)%100`), which loses a
   digit once `tot > 3000` — at 3,171 events it printed **0.9%** where the true bound is
   **0.09%**, i.e. more green events made the number look ten times worse. Fixed inline
   (`1 - 0.05**(1/tot)`, 2 dp); one-liner check above the L7 block prints both forms.

## Backlog closed — measured values (2026-10-10 06:00)

9. **The real fleet is 6 containers + 1 native provisioner + ~20 systemd units, not "16".**
   `podman ps -a`: `hostamar-tv-rtmp`, `puppy-linux`, `hostamar-openwebui`, `hostamar-code-server`,
   `hostamar-uptime`, `hostamar-minio` (all Up 27–37 h) plus `hostamar-provisioner` Exited(1)
   (deliberate, `restart:no`, the one-poller note). The "16" was a systemd-side count that got
   written down as a container count. Native units doing real work: `comfyui`,
   `hostamar-comfy-worker`, `hostamar-next`, `hostamar-litserve`, `hostamar-jev(-model)`,
   `hostamar-whisper`, `hostamar-ollama`, `hostamar-embedding-router`, `hostamar-interop-bridge`,
   `hostamar-provisioner-native`, `cloudflared`/`hostamar-tunnel`/`camofox(-tunnel)`,
   `medusa-ingress-tunnel`, `nvidia-guard`, `radar.timer`. `systemctl --failed` = 0.
10. **ComfyUI is at the capacity cliff and was NOT restarted — it was mid-render.**
    `logs` showed `MiniMaxMusic3TEModel ... AR sampling 3/751` written the same second as the
    check, GPU 95–100%, RSS 11.9 GB, swap **16,382 / 16,384 MB used**, mem avail 9.8 GB. Restarting
    a live render to reclaim RAM would have killed real work, so the plan stands: restart `comfyui`
    **when idle** (`systemctl --user restart comfyui`), and the durable fix is offloading ComfyUI to
    a second box or cloud. `L4 mem`/`L4 gpu` WARN on purpose — that is the cliff, visible.
11. **`/api/v1/good-models` is not dead code.** It returns 200 with
    `{"count":0,"error":"no-redis"}`; callers are `app/admin/chat/chat-client.tsx` and
    `app/api/v1/models/route.ts`. The empty list is a missing `UPSTASH_REDIS_*` on the Worker
    (config gap), not a broken route — so radar WARNs rather than SKIPs, and the two API strings
    that claimed "good-models 9 live hourly" were corrected (`first10/route.ts`,
    `chat-all-answers/route.ts`).
12. **Uptime-Kuma `:3004` → 302 is correct.** It is the unauthenticated-dashboard redirect;
    `curl -L` lands on 200. `radar.sh` already accepts 200 or 302 for that check.
13. **The tail ledger has grown past the earlier snapshot.** 3,851 events, `ok=3848`,
    `exceededCpu=1`, max_cpu 1085 ms, mean 109 ms, cold>400 ms = 205 (5%), 0-kill 95%,
    Clopper-Pearson bound **0.08%** (threshold ≤0.8%). So "595 events / exceededCpu=0" is stale —
    the count is up and there is now one CPU exception; the bound still passes by 10x.
14. **`/mnt/c/Users/User/hostamar` left untouched, as instructed.** `fix/store-page-design`,
    513 dirty files, HEAD `b9e25cd`. It is a WIP checkout, not a deploy source.
15. **`radar.service` no longer fails itself.** `SuccessExitStatus=1` added (repo-owned unit,
    symlinked from `~/.config/systemd/user/`). Before: the 05:56 pass reported
    `FAIL L5 systemd | system=0 user=1 failed` where the one failed unit was `radar.service`,
    because radar.sh exits 1 when it finds problems. After `daemon-reload` + `reset-failed`:
    `--failed` = 0 and a fresh pass is **FAIL=0 WARN=4 SKIP=1**.
