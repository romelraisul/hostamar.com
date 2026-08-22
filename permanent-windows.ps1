# permanent-windows.ps1 - Windows-side guarantees for hostamar products.
#
# Run via Task Scheduler or inside OpenClaw's exec(host=gateway, elevated=true).
# Behavior:
#   - Verify hostamar containers are up; if not, attempt compose up.
#   - Copy copyright-db on every run to OneDrive (PowerShell Copy-Item).
#   - Detect if OneDrive is running; report status.
#
# NOT auto-installed: run it once via Task Scheduler / OpenClaw / manual.
# - To register on logon:
#     schtasks /create /tn HostamarPermanent /tr "powershell -ExecutionPolicy Bypass -File C:\Users\User\hostamar-build\permanent-windows.ps1" /sc onlogon /ru "%USERNAME%" /f
#   You control the manual step. I do not pre-install to Task Scheduler.

$ErrorActionPreference = "SilentlyContinue"
$BuildDir = "$env:USERPROFILE\hostamar-build"
$LogFile  = "$BuildDir\permanent-windows.log"
$Containers = @('litellm-play','hostamar-video','hostamar-browser-api','hostamar-openclaw','hostamar-comfyui-lowvram')

function Log($m) { "{0} {1}" -f (Get-Date -Format 'u'), $m | Out-File -Append -Encoding utf8 $LogFile }

Log "---- permanent-windows run ----"

# 1. Container health
foreach ($c in $Containers) {
    $running = docker ps --format '{{.Names}}' | Select-String -SimpleMatch $c -Quiet
    if ($running) {
        Log "RUN: $c"
    } else {
        Log "MISSING: $c - attempting compose up"
        $files = @(
          (Join-Path $BuildDir 'docker-compose.video.yml'),
          (Join-Path $BuildDir 'docker-compose.brave.yml'),
          (Join-Path $BuildDir 'docker-compose.openclaw.yml')
        )
        foreach ($f in $files) {
            if (Test-Path $f) {
                if ((Get-Content $f) -match $c) {
                    docker compose -f $f up -d --no-deps 2>&1 | Out-File -Append -Encoding utf8 $LogFile
                }
            }
        }
    }
}

# 2. Copy copyright-db to OneDrive
$crightDb = Join-Path $BuildDir 'copyright-db'
$registry  = Join-Path $crightDb 'registry.jsonl'
if (Test-Path $registry) {
    $oneDriveBase = Join-Path $env:USERPROFILE 'OneDrive'
    $oneDriveTarget = Join-Path $oneDriveBase 'Hostamar\permanent'
    if (-not (Test-Path (Split-Path $oneDriveTarget))) {
        if (Test-Path (Join-Path $oneDriveBase 'Hostamar')) {
            Log "OneDrive target parent exists; creating permanent"
            New-Item -ItemType Directory -Path $oneDriveTarget -Force | Out-Null
        } else {
            Log "OneDrive not present (no $oneDriveBase/Hostamar) - skipping"
        }
    }
    if (Test-Path $oneDriveTarget) {
        Log "Copying copyright-db -> OneDrive\Hostamar\permanent"
        try {
            Copy-Item -Path "$crightDb\*" -Destination $oneDriveTarget -Recurse -Force -ErrorAction Stop
        } catch {
            Log "Copy error: $_"
        }
    }
} else {
    Log "no registry yet (no products created)"
}

# 3. OneDrive running?
$odProc = Get-Process OneDrive -ErrorAction SilentlyContinue
if ($odProc) {
    Log "OneDrive process running (PID $($odProc.Id))"
} else {
    Log "OneDrive NOT running - copies will be staged only"
}

Log "---- permanent-windows done ----"
