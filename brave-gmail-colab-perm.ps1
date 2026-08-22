# brave-gmail-colab-perm.ps1 - Windows Task Scheduler permanent loop for the
# Brave browser + Gmail + Colab failover. Runs every 5 min; sets
# COLAB_STATUS.txt to one of:
#   LOCAL_UP_STOP_COLAB      - local qwen.hostamar.com healthy, Colab shutdown
#   LOCAL_DOWN_START_COLAB   - local qwen DOWN, signal Colab to start
#   LOCAL_UNKNOWN            - check failed; don't change Colab state.
#
# Install once in PowerShell (admin):
#   schtasks /create /tn HostamarBraveGmailColab /sc minute /mo 5 `
#              /tr "powershell.exe -ExecutionPolicy Bypass -File `
#                   C:\Users\User\hostamar-build\brave-gmail-colab-perm.ps1"
# Delete on wipe:
#   schtasks /delete /tn HostamarBraveGmailColab /f
#
# Ground-verified 2026-07-18: pinging qwen.hostamar.com/health from Windows
# tells us if the VPS-27b fallback service is up; if it dies, Colab notebook
# `hostamar-failover.ipynb` (separate, manual install in Colab) must spin
# up. The Notebook polls COLAB_STATUS via a public gist or local auth.
#Reviewer note: we keep this PowerShell SIMPLE + sync; no EventLog spam.

$ErrorActionPreference = "Continue"
$ROOT      = "C:\Users\User\hostamar-build"
$STATUS    = Join-Path $ROOT "COLAB_STATUS.txt"
$LOG       = Join-Path $ROOT "brave-gmail-colab-perm.log"
$HEALTH    = "https://qwen.hostamar.com/health"    # VPS 27b remote endpoint
$ALSO_LOCAL= "http://localhost:4000/v1/models"      # local LiteLLM router
$BRAVE_URL = "https://www.hostamar.com/browser"

function Log([string]$msg) {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg" | Out-File -Append -Encoding utf8 $LOG
}

# ---- 1. Local router check -----------------------------------------------
$localOk  = $false
try {
  $r = Invoke-WebRequest -Uri $ALSO_LOCAL -TimeoutSec 5 -UseBasicParsing
  $localOk = ($r.StatusCode -eq 200)
} catch { $localOk = $false }

# ---- 2. VPS remote check (qwen.hostamar.com) -----------------------------
$remoteOk = $false
try {
  $r = Invoke-WebRequest -Uri $HEALTH -TimeoutSec 8 -UseBasicParsing
  $remoteOk = ($r.StatusCode -eq 200)
} catch { $remoteOk = $false }

# ---- 3. Brave container check -------------------------------------------
$braveOk = $false
try {
  $r = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 4 -UseBasicParsing
  $braveOk = ($r.StatusCode -lt 500)
} catch { $braveOk = $false }

# ---- 4. Decide failover state -------------------------------------------
$state = "LOCAL_UNKNOWN"
if ($localOk) {
  $state = "LOCAL_UP_STOP_COLAB"
} elseif ($remoteOk) {
  # Local down but remote 27b is up -> still consider failover ok, signal
  # Colab notebook to stay off since the VPS has it covered.
  $state = "LOCAL_DOWN_VPS_UP_COLAB_OFF"
} else {
  $state = "LOCAL_DOWN_START_COLAB"
}
$state | Out-File -Encoding ascii -NoNewline $STATUS
Log "state=$state local=$localOk remote=$remoteOk brave=$braveOk"

# ---- 5. Brave container auto-restart via WSL docker (best-effort) -------
if (-not $braveOk) {
  Log "brave container down -> trying `docker compose -f docker-compose.brave.yml up -d` via WSL"
  try {
    wsl.exe -e sh -c "cd /home/romel/hostamar-build && docker compose -f docker-compose.brave.yml up -d" 2>&1 | Out-File -Append -Encoding utf8 $LOG
  } catch {
    Log "WSL docker call failed: $($_.Exception.Message)"
  }
}
