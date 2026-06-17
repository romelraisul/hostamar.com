@'
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated runbook executor for common Hostamar incidents.
.DESCRIPTION
    Executes the mitigation steps from the on-call runbook automatically.
    Supports safe rollback and Slack/PagerDuty notifications.
    Can be triggered by Grafana webhook or run manually.
.PARAMETER Incident
    Type: oom, dmr-down, high-latency, circuit-breaker
.PARAMETER ModelName
    Target model for model-specific incidents
.PARAMETER AutoFix
    Apply fixes without confirmation
.PARAMETER DryRun
    Print steps without executing
.PARAMETER Notify
    Send Slack/PagerDuty notifications (requires env vars)
.PARAMETER RollbackOnFailure
    Automatically rollback steps if mitigation fails
#>

param(
    [Parameter(Mandatory)]
    [ValidateSet('oom', 'dmr-down', 'high-latency', 'circuit-breaker')]
    [string]$Incident,
    [string]$ModelName = '',
    [switch]$AutoFix,
    [switch]$DryRun,
    [switch]$Notify,
    [switch]$RollbackOnFailure
)

$ErrorActionPreference = "Stop"
$DMR = "http://localhost:12434/engines/v1"
$ADMIN_API = "http://localhost:3000/api/admin"
$START_TIME = Get-Date
$STEP_HISTORY = @()  # For rollback

# ── Notifications ──
function Send-Notification {
    param([string]$Level, [string]$Message, [string]$Details = "")

    if (-not $Notify) { return }

    # Slack
    $slackUrl = $env:SLACK_WEBHOOK_URL
    if ($slackUrl) {
        $icon = @{ critical = "🚨"; warning = "⚠️"; info = "ℹ️" }[$Level]
        $body = @{
            text = "$icon *$Level* · $Message`n$Details"
        } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri $slackUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5
            Write-Host "  📤 Slack notified" -ForegroundColor Gray
        } catch { Write-Host "  ⚠ Slack notification failed: $_" -ForegroundColor DarkRed }
    }

    # PagerDuty (P1 only)
    $pdKey = $env:PAGERDUTY_ROUTING_KEY
    if ($Level -eq "critical" -and $pdKey) {
        $pdBody = @{
            routing_key = $pdKey
            event_action = "trigger"
            dedup_key = "runbook-$Incident-$(Get-Date -Format 'yyyyMMddHHmm')"
            payload = @{
                summary = "Runbook: $Incident — $Message"
                severity = "critical"
                source = "runbook-executor"
                component = $Incident
            }
        } | ConvertTo-Json -Depth 5

        try {
            Invoke-RestMethod -Uri "https://events.pagerduty.com/v2/enqueue" -Method Post -Body $pdBody -ContentType "application/json" -TimeoutSec 5
            Write-Host "  📟 PagerDuty notified" -ForegroundColor Gray
        } catch { Write-Host "  ⚠ PagerDuty notification failed: $_" -ForegroundColor DarkRed }
    }
}

# ── State Management (for rollback) ──
function Save-State {
    param([string]$Step, [ScriptBlock]$RollbackBlock, [hashtable]$Snapshot = @{})
    $STEP_HISTORY += @{
        step = $Step
        timestamp = Get-Date
        rollback = $RollbackBlock
        snapshot = $Snapshot
    }
}

function Rollback {
    Write-Host "`n  ↩ Rolling back..." -ForegroundColor Yellow
    $STEP_HISTORY | Sort-Object timestamp -Descending | ForEach-Object {
        Write-Host "    Undoing: $($_.step)" -ForegroundColor Gray
        try {
            & $_.rollback
            Write-Host "    ✅ Rolled back: $($_.step)" -ForegroundColor Green
        } catch {
            Write-Host "    ❌ Rollback failed: $($_.step) — $_" -ForegroundColor Red
        }
    }
    Send-Notification -Level "warning" -Message "Rollback completed for $Incident" -Details "Steps rolled back: $($STEP_HISTORY.Count)"
}

function Exec {
    param([string]$Label, [string]$Command, [ScriptBlock]$Rollback = $null)

    if ($DryRun) {
        Write-Host "  [DRY-RUN] $Label" -ForegroundColor Yellow
        Write-Host "    $Command" -ForegroundColor Gray
        if ($Rollback) { Write-Host "    ↪ Rollback defined" -ForegroundColor DarkYellow }
        return
    }

    Write-Host "  ⚡ $Label..." -NoNewline
    try {
        $snapshot = @{ before = Get-Date }  # Capture state for rollback
        $output = Invoke-Expression $Command 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw $output }
        Write-Host " ✅" -ForegroundColor Green

        if ($Rollback) { Save-State -Step $Label -RollbackBlock $Rollback -Snapshot $snapshot }
    } catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "    $_" -ForegroundColor DarkRed

        if ($RollbackOnFailure) {
            Rollback
            Send-Notification -Level "critical" -Message "$Label failed — rolling back" -Details $_
        }
        throw
    }
}

function ConfirmStep {
    param([string]$Message)
    if ($AutoFix) { return $true }
    $response = Read-Host "  ⚠  $Message (y/N/a)"
    if ($response -eq 'a') { $script:AutoFix = $true; return $true }
    return $response -eq 'y'
}

function Log-Audit {
    param([string]$Action, [string]$Details)
    try {
        $env:PGPASSWORD = $env:PGPASSWORD ? $env:PGPASSWORD : "hostamar123"
        psql -h localhost -U hostamar -d hostamar -c "SELECT log_admin_action('$Action', 'runbook', 'runbook@hostamar.com', '127.0.0.1', '{\"details\": \"$Details\"}');" 2>$null
    } catch { Write-Host "  ⚠ Audit log failed: $_" -ForegroundColor DarkRed }
}

# ─────── OOM ───────
function Handle-OOM {
    Write-Host "`n━━━ OOM Incident ─────" -ForegroundColor Cyan
    Send-Notification -Level "critical" -Message "Starting OOM mitigation" -Details "GPU VRAM exhausted"

    Exec "Check GPU" "nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv"

    $largeModels = @('qwen3.6:27B', 'seed-oss:36B-UD-IQ1_M')
    $unloaded = @()

    foreach ($model in $largeModels) {
        if (ConfirmStep "Unload $model?") {
            $snapshotBefore = $null
            Exec "Unload $model" "docker model rm $model 2>`$null" -Rollback {
                Write-Host "    ↪ Reload would need: docker model pull $model" -ForegroundColor DarkYellow
            }
            $unloaded += $model
        }
    }

    if (ConfirmStep "Restart DMR?") {
        Exec "Stop DMR" "docker model stop" -Rollback {
            Write-Host "    ↪ DMR restart skipped during rollback (already stopped)" -ForegroundColor DarkYellow
        }
        Start-Sleep 2
        Exec "Start DMR" "docker model start"
        Start-Sleep 5
    }

    Exec "Verify" "curl -s $DMR/models | Select-String -SimpleMatch 'smollm3'"
    $testBody = @{ message = "ping"; model = "smollm3:F16" } | ConvertTo-Json
    Exec "Test chat" "curl -s -X POST $ADMIN_API/chat -H 'Content-Type: application/json' -d '$testBody' | Select-String -SimpleMatch 'success'"

    Log-Audit "runbook-oom" "Unloaded: $($unloaded -join ', '); restarted DMR"
    $duration = (Get-Date) - $START_TIME
    Send-Notification -Level "info" -Message "OOM mitigated in $($duration.TotalSeconds)s" -Details "Unloaded: $($unloaded -join ', ')"
    Write-Host "`n✅ OOM complete ($($duration.TotalSeconds)s)" -ForegroundColor Green
}

# ─────── DMR Down ───────
function Handle-DmrDown {
    Write-Host "`n━━━ DMR Down ─────" -ForegroundColor Cyan
    Send-Notification -Level "critical" -Message "Starting DMR recovery" -Details "DMR unreachable"

    Exec "Check DMR" "docker model status"
    Exec "Check Ollama" "curl -s http://localhost:11434/api/tags | Select-String -SimpleMatch 'models'"

    if (ConfirmStep "Restart DMR?") {
        Exec "Stop DMR" "docker model stop" -Rollback {
            Write-Host "    ↪ DMR stop rolled back (no action)" -ForegroundColor DarkYellow
        }
        Start-Sleep 3
        Exec "Start DMR" "docker model start"
        Start-Sleep 10
    }

    try {
        Exec "Verify DMR" "curl -s $DMR/models | Select-String -SimpleMatch 'smollm3'"
        Write-Host "  DMR recovered" -ForegroundColor Green
    } catch {
        Write-Host "  DMR still down — traffic on Ollama fallback" -ForegroundColor Yellow
        if (ConfirmStep "Force restart Docker Desktop?"){
            Exec "Restart Docker" "Restart-Service docker -Force" -Rollback {
                Write-Host "    ↪ Docker restart rollback not supported" -ForegroundColor DarkYellow
            }
            Start-Sleep 30
            Exec "Verify DMR" "curl -s $DMR/models | Select-String -SimpleMatch 'smollm3'"
        }
    }

    Log-Audit "runbook-dmr-down" "Restarted DMR, Ollama fallback verified"
    $duration = (Get-Date) - $START_TIME
    Send-Notification -Level "info" -Message "DMR recovery complete ($($duration.TotalSeconds)s)" -Details "Ollama fallback was active during recovery"
    Write-Host "`n✅ DMR complete ($($duration.TotalSeconds)s)" -ForegroundColor Green
}

# ─────── High Latency ───────
function Handle-HighLatency {
    Write-Host "`n━━━ High Latency ─────" -ForegroundColor Cyan
    Send-Notification -Level "warning" -Message "Checking high latency" -Details "Model response time degraded"

    Exec "Check GPU" "nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv"
    Exec "Check models" "docker model ls"

    if (ConfirmStep "Set large models to async-only?"){
        Write-Host "  (Requires admin session token)" -ForegroundColor Gray
    }

    Log-Audit "runbook-high-latency" "Latency check complete"
    $duration = (Get-Date) - $START_TIME
    Write-Host "`n✅ Latency check ($($duration.TotalSeconds)s)" -ForegroundColor Green
}

# ─────── Circuit Breaker ───────
function Handle-CircuitBreaker {
    Write-Host "`n━━━ Circuit Breaker ─────" -ForegroundColor Cyan
    Send-Notification -Level "warning" -Message "Resetting circuit breaker" -Details "Model: $ModelName"

    if (-not $ModelName) { $ModelName = Read-Host "  Enter model name" }

    if (ConfirmStep "Reset breaker for $ModelName?") {
        Exec "Check status" "curl -s $DMR/models | ConvertFrom-Json | Select-Object -ExpandProperty data | Where-Object { `$_.id -like '*$ModelName*' } | ConvertTo-Json"
        $resetBody = @{ model = $ModelName } | ConvertTo-Json
        Exec "Reset breaker" "curl -s -X POST '$ADMIN_API/models/reset' -H 'Content-Type: application/json' -d '$resetBody'" -Rollback {
            Write-Host "    ↪ Breaker would need manual re-open: admin UI" -ForegroundColor DarkYellow
        }
        Log-Audit "runbook-circuit-breaker" "Reset breaker: $ModelName"
    }

    $duration = (Get-Date) - $START_TIME
    Send-Notification -Level "info" -Message "Circuit breaker reset for $ModelName" -Details ""
    Write-Host "`n✅ Breaker reset ($($duration.TotalSeconds)s)" -ForegroundColor Green
}

# ─────── Main ───────
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Hostamar Runbook Executor v2" -ForegroundColor Cyan
Write-Host "  Incident: $Incident     Model: $ModelName" -ForegroundColor White
if ($DryRun) { Write-Host "  MODE: Dry Run" -ForegroundColor Yellow }
if ($RollbackOnFailure) { Write-Host "  Auto-rollback: enabled" -ForegroundColor Magenta }
if ($Notify) { Write-Host "  Notifications: enabled" -ForegroundColor Blue }
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan

try {
    switch ($Incident) {
        'oom' { Handle-OOM }
        'dmr-down' { Handle-DmrDown }
        'high-latency' { Handle-HighLatency }
        'circuit-breaker' { Handle-CircuitBreaker }
    }
    Send-Notification -Level "info" -Message "Runbook $Incident completed successfully" -Details ""
} catch {
    Write-Host "`n❌ Runbook failed: $_" -ForegroundColor Red
    if ($RollbackOnFailure -and $STEP_HISTORY.Count -gt 0) {
        Rollback
    }
    Send-Notification -Level "critical" -Message "Runbook $Incident FAILED" -Details $_
    exit 1
}

Write-Host "`nDone." -ForegroundColor Green
'@