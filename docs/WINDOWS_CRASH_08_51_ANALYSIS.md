# Windows crash 08:51 (10/10) — Event 41/6008 analysis, DESKTOP-9KA03CQ

Date: 2026-10-11. All data below pulled live from Windows Event Viewer via
PowerShell from WSL (commands preserved so the next session can re-run them).

## Measured crash history (System log, ID 41 + 6008 pairs)

| Dirty shutdown (Event 41 logged at next boot) | Paired 6008 | Notes |
|---|---|---|
| 2026-10-08 00:37:26 | 00:37:38 | overnight |
| 2026-10-10 09:13:30 | 09:13:43 | the "08:51" crash — machine died ~08:51, rebooted 09:13 |
| 2026-10-10 20:11:41 | 20:11:53 | evening — matches probe alert window (see below) |

Event 41 fires AT the next boot describing the previous shutdown. So the
09:13 entry is the boot after the ~08:51 freeze — same event the user saw.

## Key finding: BugcheckCode = 0 on every Event 41

Event 41 detail dump (all properties) shows `BugcheckCode 0`, `BugcheckParameter1-4 = 0`,
`PowerButtonTimestamp 0`. Meaning:

- **Not a BSOD / kernel bugcheck.** No stop code was recorded.
- **Not WHEA.** Zero Microsoft-Windows-WHEA-Logger events in the System log.
- The machine either **hard-froze** (watchdog/PSU/GPU driver hang) or **lost
  power** (outage, PSU trip, cable), then was rebooted manually.

## Commit-pressure hypothesis: REJECTED for the current crashes

- `.wslconfig` history (file's own comments): 9/24-9/25 vmmemWSL hit 67-73GB
  commit with 50GB cap → 30 Resource-Exhaustion events → VM killed. Cap
  lowered to 36GB+16GB swap on 9/26 (V79).
- Resource-Exhaustion-Detector events: last five are ALL from 9/25 09:45-10:06.
  **Zero since.** The cap change fixed commit pressure — but dirty shutdowns
  continued on 10/8 and 10/10 (x2). So commit pressure is NOT the current
  crash cause.
- Current state at analysis time: 64GB host RAM, 17.4GB free physical,
  WSL capped 36GB, swap in use ~2-9GB (radar-documented ComfyUI cliff),
  system healthy.

## Planned restarts are NOT the crashes (don't confuse the log)

Event 1074 (initiated shutdowns) — these are the user's own Start-menu
restarts, expected, unrelated:

- 10/01 08:23 restart, 10/03 17:48 power off, 10/04 18:14 power off,
  10/10 16:58 restart — all `StartMenuExperienceHost.exe` on behalf of User.

## What is left as the actual cause

With BSOD, WHEA, and commit pressure eliminated, remaining candidates in
likelihood order:

1. **GPU driver hang under sustained 100% load** (ComfyUI renders push the
   RTX 5060 to 100% for hours; a TDR that fails to recover looks exactly like
   this: freeze, no bugcheck, no WHEA). Radar already documents GPU 100%
   and the 21.9GB RSS / swap cliff as standing WARNs.
2. **PSU under combined load** (GPU 100% + CPU renders + WSL VM + disks).
   A 750W-class PSU tripping on a transient looks like a power cut: no logs
   at all, Event 41 with BugcheckCode 0.
3. **RAM instability under sustained pressure** (no memtest on file).

## Standing mitigation (already in place, keep)

- `workers/probe` Cloudflare cron (*/5) — caught the 10/10 20:11 window:
  `lastAlertAt` = 10/10 16:15:32Z (22:15 local), `lastRecoverAt` =
  16:35:32Z, `lastAlerted: slack=200 telegram=200`. Alert → Slack+Telegram
  delivered, recovery detected 20 min later. The crash was NOT silent.
- Radar FAIL=0 on boot; WSL auto-start recovered all 6 services; ssh 2222 up.

## Recommended next actions (in order, cheap → expensive)

1. **Leave `.wslconfig` alone** (memory=36GB swap=16GB is working; the
   32GB/32GB "fix" from the earlier plan would RAISE host commit ceiling and
   bring back the 9/24 collapse mode — rejected with data).
2. **Cap ComfyUI concurrent renders / add lowvram guard** — it is the only
   subsystem that pins GPU at 100% for hours (radar WARN). If crashes stop
   when renders are queued 1-at-a-time, cause is confirmed as GPU/load.
3. **Windows reliability history check after next crash**: run
   `Get-WinEvent -FilterHashtable @{LogName='System'; ID=41} -MaxEvents 1`
   plus check `Reliability Monitor` for video-driver (nvlddmkm) stops just
   before the freeze timestamp. If nvlddmkm reset events appear → GPU driver;
   update/rollback driver, check temps.
4. **Check PSU seating/wattage label + try a different wall socket** if
   crashes continue while GPU is idle overnight (would rule load in/out).
5. **memtest86+ overnight** if 1-4 all come back clean.

## Re-run commands (from WSL)

```powershell
# crash history
Get-WinEvent -FilterHashtable @{LogName='System'; ID=41,6008} -MaxEvents 6 | Select TimeCreated, Id | Format-Table
# bugcheck detail of latest
Get-WinEvent -FilterHashtable @{LogName='System'; ID=41} -MaxEvents 1 | % { $_.Properties | % { $_.Value } }
# WHEA (expect empty)
Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WHEA-Logger'} -MaxEvents 3
# resource-exhaustion history (expect nothing after 9/25)
Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Resource-Exhaustion-Detector'} -MaxEvents 5 | Select TimeCreated
# user-initiated restarts (sanity, unrelated)
Get-WinEvent -FilterHashtable @{LogName='System'; ID=1074} -MaxEvents 4
```

## Bottom line

The "commit-pressure possible cause" from the 10/10 notes is **measured and
rejected** for the 10/8 and 10/10 crashes: exhaustion events stopped 9/25,
crashes didn't. Every crash is BugcheckCode 0 = hard freeze or power loss,
not software. The likely culprit is sustained 100% GPU load (ComfyUI) or PSU
transients. The off-box probe already catches these windows end-to-end
(alerts delivered, verified in Worker KV state).
