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
- 2026-11-07: C: 14.6 GB -> 12.0 GB free (used 937.8 -> 940.8 GB). Safe ops
  only: truncate /var/log/syslog + /var/log/kern.log; journalctl
  --vacuum-size=100M (0B freed). C: now < 15 GB -> stopped; big-lever
  candidates listed below, no host moves/deletes without user approval.
  daily-disk-agent.timer active (next 21:00).

## Big levers left (user decision, one-time) — measured 2026-11-07
- C: total ~952 GB; used 937.8 GB; free 12.0 GB (< 15 GB threshold -> STOP,
  no host moves/deletes without user approval)
- OneDrive 84.92 GB (C:\Users\User\OneDrive) — "Free up space" in Explorer
  (cloud keeps them); OneDrive\Pictures\videos ~16.5 GB across six .mpg files
- pagefile.sys 32 GB allocated (peak 23.3 GB, current ~10 GB) — cap to 16 GB
  via `wmic pagefileset where name="C:\\pagefile.sys" set
  InitialSize=16384,MaximumSize=16384` + reboot (saves ~16 GB)
- wsl-swap.vhdx 7.72 GB (C:\temp\wsl-swap.vhdx) — WSL swap; .wslconfig
  swap=8 GB already set
- podman ext4.vhdx 6.11 GB
  (C:\Users\User\.local\share\containers\podman\machine\wsl\wsldist\...)
- cosyvoice3-bengali models 4.13 GB; .lmstudio models 2.53 GB; ollama.zip
  2.07 GB
- Not levers today: ComfyUI missing at C:\Users
omel\comfyui;
  hostamar-build 0.00 GB; .hermes 0.00 GB on Windows host (re-verify if
  revisited). ComfyUI models are never deleted per rules.
- Older records (ComfyUI ~241 GB, hostamar-build 34 GB, .hermes 27 GB) are
  stale on this host — re-measure before acting.

## Production verified state — recorded 2026-11-07
- C: free 12.0 GB — re-verified this run (14.6 GB before safe ops; journal
  vacuum freed 0B). Safe ops only; nothing moved or deleted.
- TV: /api/tv 393 b2-live-private-signed; /tv/manifest.json 402; proxy 200
  video/mp4
- DB: turso/neon/supabase connected, local skipped, overall up
- Admin: 401/403 Bangla unauth, 200 with admin auth; ai-status 200 fallback;
  guard Layer A/C skip-note, Layer B functional; second-brain cloud-fallback;
  fleet 200: 16 employees / 1553 files / 373 GB
- Gateway: /api/gateway/models 200 (6 tiers, 1 up); /api/v1/models 200 (105 own
  catalog); Guard :12436 5 models; FreeLLMAPI :3002/:3005 401 direct (auth
  expected); OmniRoute :20128 600+ models; Docker 12/12 UP, volumes 10
- Frontend: Bangla hero; Pricing Premium ৪,৯৯৯ / Business ১,৯৯৯ MOST POPULAR /
  Starter ৫৯৯; Header Green H + BETA 10 nav; Footer bKash 01822417463 + SSL +
  ৭ দিন মানি-ব্যাক; Login/Signup Continue with Google; no debug text;
  SSO /api/auth/sso/start 302, /api/auth/google 307
- Infra: .wslconfig memory=32GB swap=8GB processors=10; timers kilo-boot-heal /
  daily-disk-agent / weekly-trim-compact / wsl-auto-start active; WSL disk
  315 GB free; C: ~11-15 GB
- CI: last gh runs all success; no test users left
- Non-C: items carried forward from last verified session (docs 28/29/00);
  not re-probed this run. No secrets recorded.

## Layers of self-heal now active
- reboot: kilo-boot-heal.service (45 s after default.target) + timer every 20 min
- weekly: weekly-trim-compact.timer (Mon 00:00)
- daily 4x: daily-disk-agent.timer (WSL) + HostamarDiskAgent (Task Scheduler)

## Slack
- One-time setup: add SLACK_WEBHOOK_URL=https://hooks.slack.com/... to
  /home/romel/automation/infisical.env (the notifier reads it from there).
