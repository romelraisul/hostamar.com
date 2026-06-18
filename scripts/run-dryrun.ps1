# Clean dry-run wrapper with extracted functions

$DryRun = $true
$Notify = $true
$AutoFix = $false
$RollbackOnFailure = $false

$DMR = "http://localhost:12434/engines/v1"
$ADMIN_API = "http://localhost:3000/api/admin"
$START_TIME = Get-Date
$STEP_HISTORY = @()

function Send-Notification {
    param([string]$Level, [string]$Message, [string]$Details = "")
    if (-not $Notify) { return }
    Write-Host "  [NOTIFY-$Level] $Message" -ForegroundColor Cyan
    if ($Details) { Write-Host "    Details: $Details" -ForegroundColor Gray }
    $slackUrl = $env:SLACK_WEBHOOK_URL
    if ($slackUrl) {
        try {
            $icon = @{ critical = "🚨"; warning = "⚠️"; info = "ℹ️" }[$Level]
            $body = @{ text = "$icon *$Level* · $Message`n$Details" } | ConvertTo-Json
            Invoke-RestMethod -Uri $slackUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5
            Write-Host "    📤 Slack notified" -ForegroundColor Green
        } catch { Write-Host "    ⚠ Slack failed: $_" -ForegroundColor Red }
    }
}

function Exec {
    param([string]$Label, [string]$Command, [ScriptBlock]$Rollback = $null)
    Write-Host "  [DRY-RUN] $Label" -ForegroundColor Yellow
    Write-Host "    $Command" -ForegroundColor Gray
    if ($Rollback) { Write-Host "    ↩ Rollback defined" -ForegroundColor DarkYellow }
}

function ConfirmStep {
    param([string]$Message)
    if ($AutoFix) { return $true }
    Write-Host "  ❓ $Message (auto-confirm in dry-run)" -ForegroundColor Yellow
    return $true
}

function Log-Audit {
    param([string]$Action, [string]$Details)
    Write-Host "  📋 AUDIT: $Action - $Details" -ForegroundColor Cyan
}

function Handle-OOM {
    Write-Host "`n🚨 OOM Incident 🚨" -ForegroundColor Cyan
    Send-Notification -Level "critical" -Message "Starting OOM mitigation" -Details "GPU VRAM exhausted"

    Exec "Check GPU" "nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv"

    $largeModels = @('qwen3.6:27B', 'seed-oss:36B-UD-IQ1_M')
    $unloaded = @()

    foreach ($model in $largeModels) {
        if (ConfirmStep "Unload $model?") {
            Exec "Unload $model" "docker model rm $model 2>`$null" -Rollback {
                Write-Host "    ↩ Reload would need: docker model pull $model" -ForegroundColor DarkYellow
            }
            $unloaded += $model
        }
    }

    if (ConfirmStep "Restart DMR?") {
        Exec "Stop DMR" "docker model stop" -Rollback {
            Write-Host "    ↩ DMR restart skipped during rollback" -ForegroundColor DarkYellow
        }
        Exec "Start DMR" "docker model start"
    }

    Exec "Verify" "curl -s $DMR/models | Select-String -SimpleMatch 'smollm3'"
    $testBody = @{ message = "ping"; model = "smollm3:F16" } | ConvertTo-Json
    Exec "Test chat" "curl -s -X POST $ADMIN_API/chat -H 'Content-Type: application/json' -d `'$testBody`' | Select-String -SimpleMatch 'success'"

    Log-Audit "runbook-oom" "Unloaded: $($unloaded -join ', '); restarted DMR"
    $duration = (Get-Date) - $START_TIME
    Send-Notification -Level "info" -Message "OOM mitigated in $($duration.TotalSeconds)s" -Details "Unloaded: $($unloaded -join ', ')"
    Write-Host "`n✅ OOM complete ($($duration.TotalSeconds)s)" -ForegroundColor Green
}

function Handle-DmrDown {
    Write-Host "`n🔌 DMR Down 🔌" -ForegroundColor Cyan
    Send-Notification -Level "critical" -Message "Starting DMR recovery" -Details "DMR unreachable"

    Exec "Check DMR" "docker model status"
    Exec "Check Ollama" "curl -s http://localhost:11434/api/tags | Select-String -SimpleMatch 'models'"

    if (ConfirmStep "Restart DMR?") {
        Exec "Stop DMR" "docker model stop" -Rollback { Write-Host "    ↩ DMR stop rolled back" -ForegroundColor DarkYellow }
        Exec "Start DMR" "docker model start"
    }

    Exec "Verify DMR" "curl -s $DMR/models | Select-String -SimpleMatch 'smollm3'"
    Log-Audit "runbook-dmr-down" "Restarted DMR, Ollama fallback verified"
    $duration = (Get-Date) - $START_TIME
    Send-Notification -Level "info" -Message "DMR recovery complete ($($duration.TotalSeconds)s)" -Details "Ollama fallback was active"
    Write-Host "`n✅ DMR complete ($($duration.TotalSeconds)s)" -ForegroundColor Green
}

function Handle-HighLatency {
    Write-Host "`n⏱️ High Latency ⏱️" -ForegroundColor Cyan
    Send-Notification -Level "warning" -Message "Checking high latency" -Details "Model response time degraded"

    Exec "Check GPU" "nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv"
    Exec "Check models" "docker model ls"

    if (ConfirmStep "Set large models to async-only?") {
        Write-Host "  (Requires admin session token)" -ForegroundColor Gray
    }

    Log-Audit "runbook-high-latency" "Latency check complete"
    $duration = (Get-Date) - $START_TIME
    Write-Host "`n✅ Latency check ($($duration.TotalSeconds)s)" -ForegroundColor Green
}

function Handle-CircuitBreaker {
    param([string]$ModelName)
    Write-Host "`n⚡ Circuit Breaker ⚡" -ForegroundColor Cyan
    Send-Notification -Level "warning" -Message "Resetting circuit breaker" -Details "Model: $ModelName"

    if (-not $ModelName) { $ModelName = Read-Host "  Enter model name" }

    if (ConfirmStep "Reset breaker for $ModelName?") {
        Exec "Check status" "curl -s $DMR/models | ConvertFrom-Json | Select-Object -ExpandProperty data | Where-Object { `$_.id -like `"*$ModelName*`" } | ConvertTo-Json"
        $resetBody = @{ model = $ModelName } | ConvertTo-Json
        Exec "Reset breaker" "curl -s -X POST `'$ADMIN_API/models/reset`' -H 'Content-Type: application/json' -d `'$resetBody`'" -Rollback { Write-Host "    ↩ Breaker would need manual re-open: admin UI" -ForegroundColor DarkYellow }
        Log-Audit "runbook-circuit-breaker" "Reset breaker: $ModelName"
    }

    $duration = (Get-Date) - $START_TIME
    Send-Notification -Level "info" -Message "Circuit breaker reset for $ModelName" -Details ""
    Write-Host "`n✅ Breaker reset ($($duration.TotalSeconds)s)" -ForegroundColor Green
}

# Run all dry-runs
Write-Host "═══════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Hostamar Runbook Dry-Runs" -ForegroundColor White
Write-Host "  Mode: Dry-Run | Notify: Enabled" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════" -ForegroundColor Cyan

Handle-OOM
Handle-DmrDown
Handle-HighLatency
Handle-CircuitBreaker -ModelName "qwen3.6:27B"

Write-Host "`n═══════════════════════════════════" -ForegroundColor Green
Write-Host "  All dry-runs complete ✅" -ForegroundColor Green
Write-Host "═══════════════════════════════════" -ForegroundColor Green