@'
param(
    [string]$Task = "Monitor Hostamar business health and suggest improvements",
    [string]$ScheduleMinutes = "0"
)

$DMR = "http://localhost:12434/engines/v1"
$OLLAMA = "http://localhost:11434/v1"
$AUTOMATION = "http://localhost:3000/api/admin/automation"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message"
}

function Call-Model {
    param([string]$Model, [string]$Prompt)
    
    $body = @{
        model = $Model
        messages = @(
            @{ role = "system"; content = "You are the Hostamar CEO assistant. Be concise and actionable." }
            @{ role = "user"; content = $Prompt }
        )
        temperature = 0.5
        max_tokens = 2000
    } | ConvertTo-Json

    try {
        $res = Invoke-RestMethod -Uri "$DMR/chat/completions" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 60
        return $res.choices[0].message.content
    } catch {
        Write-Log "DMR failed, trying Ollama..."
        $body = $body | ConvertTo-Json
        try {
            $res = Invoke-RestMethod -Uri "$OLLAMA/chat/completions" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 120
            return $res.choices[0].message.content
        } catch {
            return "ERROR: All models unavailable - $_"
        }
    }
}

function Invoke-Automation {
    param([string]$Task)
    
    $body = @{ task = $Task } | ConvertTo-Json
    
    try {
        $res = Invoke-RestMethod -Uri $AUTOMATION -Method Post -Body $body -ContentType "application/json" -TimeoutSec 300
        return $res
    } catch {
        return @{ error = "Automation API unreachable - $_" }
    }
}

# Main execution
Write-Log "=== Hostamar CEO Orchestrator ==="
Write-Log "Task: $Task"
Write-Log "Schedule: $($ScheduleMinutes) minutes"

if ($ScheduleMinutes -gt 0) {
    Write-Log "Running in scheduled mode..."
    while ($true) {
        $result = Invoke-Automation -Task $Task
        if ($result.summary) {
            Write-Log "CEO Summary: $($result.summary)"
        }
        if ($result.tasks) {
            foreach ($t in $result.tasks) {
                Write-Log "  [$($t.status)] $($t.agent): $($t.task.Substring(0, [Math]::Min(80, $t.task.Length)))..."
            }
        }
        Write-Log "Sleeping for $ScheduleMinutes minutes..."
        Start-Sleep -Seconds ($ScheduleMinutes * 60)
    }
} else {
    Write-Log "Running single execution..."
    $result = Invoke-Automation -Task $Task
    if ($result.error) {
        Write-Log "ERROR: $($result.error)"
    } else {
        $result | ConvertTo-Json -Depth 10
    }
}
'@ > "C:\Users\User\hostamar.com\scripts\ceo-orchestrator.ps1"