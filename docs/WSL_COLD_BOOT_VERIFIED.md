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
      hostamar-next.service             enabled   (Next.js app :3000)
      hostamar-ollama.service           enabled   (:11434)
      hostamar-embedding-router.service enabled   (:8081)
      cloudflared.service               enabled   (public tunnel -> hostamar.com)
      camofox.service  camofox-tunnel.service     enabled
      medusa-ingress-tunnel.service     enabled
      tv-tunnel.service  tv-agent.service         enabled
      hostamar-litserve  hostamar-jev  hostamar-jev-model  hostamar-interop-bridge
      hostamar-comfy-worker  hostamar-tunnel  hostamar-provisioner-native  hostamar-vps
    system units
      ssh.socket      enabled
      ssh.service     enabled

Not boot-managed on purpose:

- **ComfyUI** (pid 472, `main.py --port 8188 --lowvram`) is started by
  `scripts/start-comfyui.sh` (host side), not a unit — it holds ~22 GB RSS and is only needed
  when a video job runs. `hostamar-comfy-worker.service` is the unit that *uses* it.
- **podman containers** (6 up) come from the rootless podman stack, not from systemd units;
  `radar.sh --fix` restarts any that are down.
- **hostamar-provisioner** container stays `Exited (1)` by design — one poller only, and the
  native `hostamar-provisioner-native.service` is the live one.

## How to verify (run after a cold boot)

    # 1. systemd is up at all
    systemctl is-system-running                      # expect: running (or degraded - then see step 4)

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

## Evidence for this pass (no `wsl --shutdown` was run)

`wsl --shutdown` kills this session's shell (and the agent runs inside WSL), so the shutdown
half was **not** executed. What is verified instead is the property that decides cold-boot
behaviour: every unit above reports `enabled` (so systemd starts it), `systemd=true` is set in
`/etc/wsl.conf`, and `Linger=yes` is on for the user. Existing evidence the pattern works:
this session began with `uptime 1 day 9 h` and 19/20 units active after the last boot, with
`NRestarts 0` on the guard.

To close the last gap, run this from **Windows PowerShell** (not from this agent) when a
restart is acceptable:

    wsl --shutdown
    Start-Sleep 8
    wsl -d Ubuntu -e bash -lc "systemctl --user is-active radar.timer tail-radar.service nvidia-guard.service hostamar-next.service; systemctl is-active ssh.socket; ss -tln | grep :2222"

Expected: all `active`, and `ssh.socket` listening on 2222. Paste the output into
`docs/WSL_COLD_BOOT_VERIFIED.md` to convert the "enabled" evidence above into a measured
cold-boot result.
