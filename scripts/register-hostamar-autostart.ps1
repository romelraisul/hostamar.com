#!/usr/bin/env pwsh
# Register Task Scheduler entries for Hostamar WSL auto-start.
#
# Fires on:
#   - Windows logon (any user) — `@/Hostamar/Startup`
#
# Note: WinPS 5.1 doesn't expose -AtWake for New-ScheduledTaskTrigger.
# On modern Windows 11+ (PowerShell 7/PSCore), use -AtWake to register
# a parallel `\Hostamar\Resume` task. The wake script (wsl-restart-docker.sh)
# is already prepared and is safe to schedule when PS7 is available.
#
# Each task invokes wsl.exe -u root to run a bash script that:
#   1. Starts the docker service if not running
#   2. Waits for docker daemon to be reachable
#   3. Runs `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
#
# Re-runs of this script are idempotent: existing tasks are updated,
# not duplicated.
#
# Run from an *elevated* PowerShell prompt (Task Scheduler creation
# requires admin). Skip the Read-Host auto-elevation by running manually:
#   powershell -ExecutionPolicy Bypass -File .\register-hostamar-autostart.ps1

$ErrorActionPreference = 'Stop'

# ----- Paths & constants -----
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$WslTaskScript = Join-Path $ScriptDir 'wsl-start-hostamar.sh'
$WslWakeScript = Join-Path $ScriptDir 'wsl-restart-docker.sh'

$TaskUserHome = $env:USERPROFILE

if (-not (Test-Path $WslTaskScript)) {
    Write-Error "Missing $WslTaskScript — refusing to register tasks without it."
    exit 1
}

# ----- Build the WSL command strings -----
# We invoke wsl.exe with explicit -u root because the Docker daemon runs as
# root inside WSL. Pass the bash script *as a file path* — bash respects
# the #!/usr/bin/env bash shebang and runs it.
$LogonCmd = "wsl.exe -u root {0}" -f $WslTaskScript
$WakeCmd  = "wsl.exe -u root {0}" -f $WslWakeScript

# Check/admin sanity: Task Scheduler writes go through schtasks.exe, which
# needs admin. Print a hint if the elevation check returns false.
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning 'Not running as Administrator. schtasks.exe will fail.'
    Write-Warning 'Re-run this script from an elevated PowerShell prompt.'
}

# ----- Register Startup task (OnLogon) -----
$startupTaskName = '\Hostamar\Startup'
$startupAction    = New-ScheduledTaskAction -Execute 'wsl.exe' -Argument "-u root /mnt/c/Users/User/hostamar-autostart/wsl-start-hostamar.sh"
$startupTrigger   = New-ScheduledTaskTrigger -AtLogOn
# NoDelay when interactive logon — start ASAP
$startupPrincipal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

try {
    # Update or create
    if (Get-ScheduledTask -TaskName $startupTaskName -ErrorAction SilentlyContinue) {
        Set-ScheduledTask -TaskName $startupTaskName -Action $startupAction -Trigger $startupTrigger -Principal $startupPrincipal
        Write-Host "Updated existing task: $startupTaskName"
    } else {
        Register-ScheduledTask -TaskName $startupTaskName -Action $startupAction -Trigger $startupTrigger -Principal $startupPrincipal -Force
        Write-Host "Registered new task: $startupTaskName"
    }
} catch {
    Write-Warning "Failed to install Startup task: $_"
}

# WinPS 5.1 doesn't expose -AtWake; relying on Windows logon trigger instead.

# ----- Summary -----
Get-ScheduledTask -TaskPath '\Hostamar\' -ErrorAction SilentlyContinue | Format-Table TaskName, State, @{Name='Trigger';Expression={(Get-ScheduledTask -TaskName $_.TaskName).Triggers | ForEach-Object { $_.CimClass.CimClassName }}} -AutoSize