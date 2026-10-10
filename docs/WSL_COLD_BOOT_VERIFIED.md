# WSL cold-boot verification — DESKTOP-9KA03CQ

Goal: after `wsl --shutdown` (or a Windows reboot) everything this box serves must come back
**without a human**, since the box is product infrastructure (hostamar.com Worker tunnel,
video pipeline, guard, radar).

## What makes that possible

    /etc/wsl.conf        [boot] systemd=true        <- systemd is PID 1, units are real units
    loginctl             Linger=yes for romel       <- --user units survive logout / no interactive login
    unit files           symlinked in from hostamar.com/ops/monitoring/ and ~/.config/systemd/user/
    ssh                  SYSTEM unit (ssh.socket, enabled) -- NOT a --user unit

Those two layers matter: `systemctl --user is-enabled ssh.socket` reports **not-found**, and
that is correct — ssh is a system unit here (`systemctl is-enabled ssh.socket` → enabled).

## Enabled = starts at boot (verified `is-enabled`)

    --user units
      radar.timer                       enabled   (15-min full radar pass)
      radar-deep.timer                  enabled   (nightly deep pass, gate becomes fatal)
      tail-radar.service                enabled   (persistent wrangler tail -> latency ledger)
      nvidia-guard.service              enabled   (egress guard on 127.0.0.1:12436)
      hostamar-next.service             enabled   (Next.js app :3000/:3011)
      hostamar-ollama.service           enabled   (:11434)
      hostamar-embedding-router.service enabled   (:8081)
      cloudflared.service               enabled   (public tunnel -> hostamar.com)
      comfyui.service                   enabled   (:8188 — measured 2026-10-10: it IS a unit and
                                                   it DOES come back at boot, MainPID 500 /
                                                   NRestarts 0 / system_stats 200. The older note
                                                   "started by scripts/start-comfyui.sh, not a
                                                   unit" was stale and is deleted.)
      camofox.service  camofox-tunnel.service     enabled
      medusa-ingress-tunnel.service     enabled
      tv-tunnel.service  tv-agent.service         enabled
      hostamar-litserve  hostamar-jev  hostamar-jev-model  hostamar-interop-bridge
      hostamar-comfy-worker  hostamar-tunnel  hostamar-provisioner-native  hostamar-vps
    system units
      ssh.socket      enabled
      ssh.service     enabled

Also automatic, measured: **podman** — `podman-machine-default` comes back and all 6 rootless
containers (`hostamar-tv-rtmp puppy-linux hostamar-openwebui hostamar-code-server
hostamar-uptime hostamar-minio`) are `Up` again without help.
`hostamar-provisioner` comes up briefly after a cold boot and then exits(1) by itself — the
documented deliberate state (one poller only; `hostamar-provisioner-native.service` is live).

## How to verify (run after a cold boot)

    # 1. systemd is up at all
    systemctl is-system-running                      # expect running; see the settle note below

    # 2. nothing failed
    systemctl --failed --no-pager; systemctl --user --failed --no-pager   # expect: 0 units listed

    # 3. the key services
    systemctl --user is-active radar.timer radar-deep.timer tail-radar.service \
        nvidia-guard.service hostamar-next.service hostamar-ollama.service cloudflared.service
    systemctl is-active ssh.socket

    # 4. listening sockets that must exist
    ss -tln | grep -E ':(2222|3000|3002|3004|8081|12436)\b'

    # 5. the actual product, end to end
    curl -s -o /dev/null -w '%{http_code}\n' https://hostamar.com/api/health     # expect 200
    curl -s http://127.0.0.1:12436/v1/models | python3 -c \
        "import sys,json;print([m['id'] for m in json.load(sys.stdin)['data']])"  # expect the 4

    # 6. and the one-command version of all of the above
    bash /home/romel/hostamar.com/ops/monitoring/radar.sh

**Settle note:** `systemctl is-system-running` reports `starting` for up to ~2 minutes after boot
while `tv-health-check.service` finishes its first run (0 jobs pending, 0 failed — it is only a
settle artefact, not a fault). Wait for `running` before treating a `starting` reading as a
finding.

## Measured results — 2026-10-10 (shutdown run from Windows, twice)

Both runs were executed from the **Windows** side (`wsl --shutdown`), which the earlier pass could
not do because that agent lived inside the distro it would have killed.

### Pre-shutdown state (01:31:11Z)

    uptime 1 day 14:22 | systemctl is-system-running = running | 0 failed (system + user)
    radar.timer radar-deep.timer tail-radar.service nvidia-guard.service hostamar-next.service
      hostamar-ollama.service cloudflared.service comfyui.service  -> all active
    ssh.socket -> active/enabled, listening :2222
    12 listening sockets | podman 6 containers Up | nvidia-guard NRestarts=0
    Mem 17708/36081 MiB used | Swap 14770/16384 MiB used   <- swap effectively exhausted

### Cold boot #1 — shutdown 01:31:43Z, checks 01:32:49Z (both distros shown `Stopped`)

    uptime 0 min | is-system-running = running | 0 failed (system + user)
    all 8 key --user units active | comfyui.service active | ssh.socket active
    11 listening sockets (2222 3000 3002 3003 3004 3011 8081 8083 11434 12436 20128)
    nvidia-guard NRestarts=0
    podman: 6/6 containers Up
    local 127.0.0.1:8081/health=200  127.0.0.1:12436/v1/models=200  127.0.0.1:3011/api/health=200
    public https://hostamar.com/api/health=200
    guard models: z-ai/glm-5.3-flash, z-ai/glm-5.3, moonshotai/kimi-k3, deepseek-ai/deepseek-v4.1-flash
    radar.sh full pass: FAIL=0 WARN=3 SKIP=1  (swap 738 MiB used, mem avail 22583 MiB)

### Cold boot #2 — shutdown 01:35:49Z, boot trigger 01:40:01Z (box held down ~4 min)

This run doubled as the live-fire test of the new off-box probe: while the box was down,
`.github/workflows/external-probe.yml` (GitHub-hosted runner) reported

    verdict=DEGRADED:pc_off  pc={"alive":false,"lastSeen":"2026-10-10T01:35:07.341Z","ageSeconds":70}
    Slack alert slack_http=200, run failed (red)   <- box down, site still serving 200

and after the box returned (01:40:14Z):

    uptime 0 min | is-system-running = starting -> running (~2 min, tv-health-check settling)
    0 failed (system + user) | all 8 key --user units active | comfyui.service active (MainPID 500,
      NRestarts 0, :8188 200) | ssh.socket active | nvidia-guard NRestarts=0
    10 sockets immediately, :3002/:3004 back as the kuma container finished starting
    podman 6/6 Up (provisioner container up 13 s, then exited by itself = deliberate)
    Worker + product: pc.alive=true with heartbeats resumed, https://hostamar.com/api/health=200
    Capacity: Swap 0 -> 2101 MiB used of 16384 (was 14770/16384 before the test), Mem avail 18.4 GiB

## Status (2026-10-10 07:45 local) — complete

`wsl --shutdown` was executed twice from Windows and the box came back unattended both times:
systemd `running`, 0 failed units, every boot-enabled unit active, ssh on :2222, guard on
:12436 with NRestarts=0, podman stack up, product 200 end to end, radar green. The only
human-in-the-loop step left in the old plan was this shutdown — it is now measured, not assumed.
