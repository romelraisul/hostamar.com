@echo off
REM setup-wsl-cron-persistent.bat — V9 Phase 1. Run ONCE as Administrator
REM (right-click > Run as administrator) on the Windows host.
REM Creates a Task Scheduler on-start task that boots WSL cron + the
REM Hostamar local worker after every reboot. Uses wsl.exe -u root
REM (NOT sudo: there is no passwordless sudo, a sudo call would hang forever
REM waiting for a password with no TTY).
schtasks /create /tn "Hostamar WSL cron" /tr "C:\Windows\System32\wsl.exe -u root service cron start" /sc onstart /ru SYSTEM /f
schtasks /create /tn "Hostamar local worker" /tr "C:\Windows\System32\wsl.exe -u root bash -lc 'su - romel -c \"bash /home/romel/hostamar-build/scripts/local-worker-boot.sh\"'" /sc onstart /ru SYSTEM /delay 0001:00 /f
echo Done. Verify after reboot: wsl bash -c 'service cron status; pgrep -af local-worker'
pause
