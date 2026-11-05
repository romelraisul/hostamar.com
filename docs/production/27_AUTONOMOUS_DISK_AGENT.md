# Autonomous Disk Cleanup Agent — C: Critical Fix (doc 27)

## Problem
- Host C: dropped to 1.82 GB free (of 951 GB used) while the WSL guest had
  328 GB free — the host drive is the constraint, not the guest.
- ~7 GB/day guest churn (.hermes/state.db ~5 MB/min, agent sessions), plus
  orphaned docker volumes (204 dangling, 33.8 GB), TV ffmpeg syslog growth,
  caches, swap (4-8 GB) and temp.
- Earlier emergency history: VHDX 675 GB, 65 volumes burned GBs/day, ~11-boot
  churn; recovery needed daily manual cleanup.
- The pre-existing weekly-trim-compact.timer (Mon 00:00) only ran
  podman volume prune + docker system prune -f (no --volumes) and never
  compacted the VHDX — so nothing reclaimed space.

## What was built

### WSL side — ~/.hermes/scripts/daily-disk-agent.sh (4x/day)
Timer daily-disk-agent.timer: 03:00 / 09:00 / 15:00 / 21:00, Persistent=true.
- docker system prune -f --volumes (dangling only — the in-use DB volumes for
  postgres, coolify, medusa, openobserve, teldrive, redis, freellmapi stay)
- podman volume prune -f
- .next/cache, npm/uv/pip/gradle caches, .hermes/cache/*, .cache files > 7d
- journalctl --user --vacuum-time=3d
- fstrim -a -v so freed blocks are reclaimable
- Slack summary each run (louder if C: < 10 GB), else logs "Slack off" with the
  one-line setup note

### Host side — C:\Users\Users\daily-disk-agent-windows.ps1 (daily)
Task Scheduler HostamarDiskAgent, daily 03:30.
Note: registered non-elevated; the elevated RunLevel Highest registration
returns "Access is denied" from a non-admin shell, so it needs one UAC
approval — the script logs that clearly.
- $env:TEMP + C:\Windows\Temp cleaning
- WSL swap file removal (only succeeds when WSL is stopped)
- DISM /StartComponentCleanup /ResetBase (elevated only)
- Recycle Bin clear
- When C: < 15 GB: runs the WSL agent for guest-side trim, then
  wsl.exe -u root truncates /var/log/syslog and /var/log/kern.log (root-owned,
  so this is the pass that owns them), then elevated:
  wsl --shutdown -> DiskPart compact vdisk on
  %LOCALAPPDATA%\wsl\{57f0c2cf-1aed-4249-a3ee-1d12bb6f9186}\ext4.vhdx
  -> WSL restarted

### Logs
- WSL: /home/romel/.hermes/logs/daily-disk-agent.log
- Host: C:\Users\Users\.openclaw\.hermes-win-disk.log

## Verified results
- First WSL run reclaimed 33.83 GB (docker volumes 204 -> 9; 5 in-use DB
  volumes survived), WSL free 299 -> 328 GB
- Guest syslog trimmed 284 MB -> 2 MB by the host root pass; kern.log -> 0
- Host C: 1.82 GB -> 27.7 GB free (VHDX auto-released 680 -> 658.5 GB from
  fstrim; no DiskPart needed at this level)
- Graceful wsl --shutdown -> restart validated: guard 200, 12 containers up,
  guest 328 GB free — no re-provisioning needed
- Idempotent re-runs: 0 B reclaimed, no false warnings

## Big levers left (user decision, one-time)
- ComfyUI models ~241 GB (diffusion 84 / text_encoders 64 / LLM 31 / minimax 18
  / chatterbox 13) — re-downloadable HF, move-comfyui-to-d.sh (no D: present)
- OneDrive 85 GB — "Free up space" in Explorer (cloud keeps them)
- Pagefile 41.85 GB allocated (peak 23.3) — cap to 8 GB via wmic pagefileset
  where name="C:\\pagefile.sys" set InitialSize=8192,MaximumSize=8192 + reboot
- hostamar-build 34 GB, .hermes 27 GB, OpenMontage 24 GB, models 20 GB, bonsai2 12 GB

## Layers of self-heal now active
- reboot: kilo-boot-heal.service (45 s after default.target) + timer every 20 min
- weekly: weekly-trim-compact.timer (Mon 00:00)
- daily 4x: daily-disk-agent.timer (WSL) + HostamarDiskAgent (Task Scheduler)

## Slack
- One-time setup: add SLACK_WEBHOOK_URL=https://hooks.slack.com/... to
  /home/romel/automation/infisical.env (the notifier reads it from there).
