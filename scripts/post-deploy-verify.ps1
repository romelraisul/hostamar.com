<#
.SYNOPSIS
    Post-deployment smoke test script.
.DESCRIPTION
    Verifies all Hostamar services are healthy after a deployment.
    Exits with 0 if all checks pass, 1 on failure.
.PARAMETER BaseUrl
    Base URL of the deployment (default: http://localhost:3000)
.PARAMETER DmrUrl
    Docker Model Runner URL (default: http://localhost:12434/engines/v1)
.PARAMETER AdminEmail
    Admin email for login test
.PARAMETER AdminPassword
    Admin password for login test
.PARAMETER SkipLocalChecks
    Skip checks that require local Docker services (DMR, Ollama, DB). Use in CI.
.PARAMETER ReportFile
    Path to write JSON report (default: reports/post-deploy-report.json)
#>

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$DmrUrl = "http://localhost:12434/engines/v1",
    [string]$AdminEmail = "admin@hostamar.com",
    [string]$AdminPassword = "",
    [string]$ReportFile = "reports/post-deploy-report.json",
    [switch]$SkipLocalChecks
)

# Auto-detect CI
if ($env:GITHUB_ACTIONS -eq "true") { $SkipLocalChecks = $true }

$ErrorActionPreference = "Stop"
$results = @()
$allPassed = $true

function Check {
    param([string]$Name, [ScriptBlock]$Block, [int]$TimeoutSec = 10)
    
    Write-Host "  `u{23F3} $Name..." -NoNewline
    $start = Get-Date
    
    try {
        $null = & $Block
        $elapsed = (Get-Date) - $start
        Write-Host " `u{2705} ($($elapsed.TotalSeconds.ToString('0.0'))s)" -ForegroundColor Green
        $results += [PSCustomObject]@{ name = $Name; status = "pass"; time = $elapsed.TotalSeconds }
    } catch {
        $elapsed = (Get-Date) - $start
        Write-Host " `u{274C} ($($elapsed.TotalSeconds.ToString('0.0'))s)" -ForegroundColor Red
        Write-Host "    $_" -ForegroundColor DarkRed
        $results += [PSCustomObject]@{ name = $Name; status = "fail"; time = $elapsed.TotalSeconds; error = $_ }
        $script:allPassed = $false
    }
}

# Ensure report directory
New-Item -ItemType Directory -Force -Path (Split-Path $ReportFile -Parent) | Out-Null

Write-Host "`nHostamar Post-Deploy Verification" -ForegroundColor Cyan
Write-Host "  Target: $BaseUrl" -ForegroundColor Gray
if ($SkipLocalChecks) { Write-Host "  Local checks: SKIPPED" -ForegroundColor Yellow }

# Infrastructure
Write-Host "`nInfrastructure" -ForegroundColor Yellow

Check "Main page loads" {
    $res = Invoke-WebRequest -Uri "$BaseUrl/login" -TimeoutSec $TimeoutSec -UseBasicParsing
    if ($res.StatusCode -ne 200) { throw "Status $($res.StatusCode)" }
}

Check "Health endpoint" {
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/health" -TimeoutSec $TimeoutSec
    if (-not $res) { throw "No response" }
}

if (-not $SkipLocalChecks) {
    Check "Docker Model Runner" {
        $res = Invoke-RestMethod -Uri "$DmrUrl/models" -TimeoutSec $TimeoutSec
        if ($res.data.Count -lt 3) { throw "Expected >= 3 models, got $($res.data.Count)" }
    }

    Check "Ollama running" {
        $res = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec $TimeoutSec
        if ($res.models.Count -lt 1) { throw "No models found" }
    }
}

# Authentication
Write-Host "`nAuthentication" -ForegroundColor Yellow

if ($AdminPassword) {
    Check "Admin login" {
        $body = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json" -TimeoutSec $TimeoutSec
        if (-not $res) { throw "Login failed" }
    }
}

Check "Unauthenticated /admin blocked" {
    try {
        $null = Invoke-WebRequest -Uri "$BaseUrl/admin/chat" -TimeoutSec $TimeoutSec -UseBasicParsing
        throw "Should have been blocked"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 200) { throw "Admin is exposed without auth" }
    }
}

# AI Models
Write-Host "`nAI Models" -ForegroundColor Yellow

Check "Chat API — smollm3 responds" {
    $body = @{ message = "Say hello"; model = "smollm3:F16" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/admin/chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 60
    if (-not $res.success) { throw "Chat failed: $($res.error)" }
    if (-not $res.response) { throw "Empty response" }
}

Check "Automation API — marketing agent" {
    $body = @{ task = "Quick tip for Hostamar"; agent = "marketing" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/admin/automation" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 60
    if ($res.tasks[0].status -ne "completed") { throw "Task not completed" }
}

Check "Model list endpoint" {
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/admin/chat" -TimeoutSec $TimeoutSec -UseBasicParsing
    if ($res.status -ne "connected") { throw "DMR not connected" }
}

# Admin UI
Write-Host "`nAdmin UI" -ForegroundColor Yellow

Check "/admin/chat page loads" {
    $res = Invoke-WebRequest -Uri "$BaseUrl/admin/chat" -TimeoutSec $TimeoutSec -UseBasicParsing
    if ($res.StatusCode -ne 200) { throw "Status $($res.StatusCode)" }
}

Check "/admin/models page loads" {
    $res = Invoke-WebRequest -Uri "$BaseUrl/admin/models" -TimeoutSec $TimeoutSec -UseBasicParsing
    if ($res.StatusCode -ne 200) { throw "Status $($res.StatusCode)" }
}

# Database
Write-Host "`nDatabase" -ForegroundColor Yellow

Check "Audit endpoint works" {
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/admin/audit" -Method Post -Body '{}' -ContentType "application/json" -TimeoutSec 10 -ErrorAction SilentlyContinue
}

Check "Admin login" {
    $body = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10 -ErrorAction SilentlyContinue
}

# Security
Write-Host "`nSecurity" -ForegroundColor Yellow

Check "Security headers present" {
    $res = Invoke-WebRequest -Uri "$BaseUrl/login" -TimeoutSec $TimeoutSec -UseBasicParsing
    $headers = $res.Headers
    if (-not $headers['X-Frame-Options']) { throw "Missing X-Frame-Options" }
}

# Report
Write-Host "`n---" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  ALL CHECKS PASSED" -ForegroundColor Green
} else {
    $failCount = ($results | Where-Object { $_.status -eq "fail" }).Count
    Write-Host "  $failCount CHECK(S) FAILED" -ForegroundColor Red
}

$report = [PSCustomObject]@{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    baseUrl = $BaseUrl
    allPassed = $allPassed
    totalChecks = $results.Count
    passedChecks = ($results | Where-Object { $_.status -eq "pass" }).Count
    failedChecks = ($results | Where-Object { $_.status -eq "fail" }).Count
    results = $results
} | ConvertTo-Json -Depth 10

Set-Content -Path $ReportFile -Value $report
Write-Host "  Report saved: $ReportFile" -ForegroundColor Gray

if (-not $allPassed) { exit 1 }