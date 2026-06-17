@'
#!/usr/bin/env pwsh
# Local CI runner — runs the same checks as GitHub Actions but locally
param(
    [switch]$SkipTests,
    [switch]$SkipGrafana,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot
$passed = 0
$failed = 0

function Step {
    param([string]$Name, [ScriptBlock]$Block)
    Write-Host "`n━━━ $Name ━━━" -ForegroundColor Cyan
    try {
        & $Block
        Write-Host "  ✓ $Name" -ForegroundColor Green
        $script:passed++
    } catch {
        Write-Host "  ✗ $Name`: $_" -ForegroundColor Red
        $script:failed++
        if ($Verbose) { Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed }
    }
}

Set-Location $rootDir

# 1. TypeScript check
Step "TypeScript Check" {
    $result = npx tsc --noEmit 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw "TypeScript errors found`n$result" }
}

# 2. Build check
Step "Next.js Build" {
    $result = npx next build 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw "Build failed`n$result" }
    if ($result -match "error") { throw "Build has errors" }
}

# 3. Database audit schema
Step "Audit Schema" {
    $env:PGPASSWORD = "hostamar123"
    $result = psql -h localhost -U hostamar -d hostamar -f database/audit-schema.sql 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Audit schema failed: $result" }
    Write-Host "  Audit table applied" -ForegroundColor Gray
}

# 4. Postman tests
if (-not $SkipTests) {
    Step "Postman Integration Tests" {
        # Check if server is running
        try {
            $null = Invoke-WebRequest -Uri "http://localhost:3000/login" -TimeoutSec 5 -UseBasicParsing
        } catch {
            throw "Dev server not running at http://localhost:3000. Start it first with 'npx next dev -p 3000'"
        }

        # Check Newman
        $newman = Get-Command newman -ErrorAction SilentlyContinue
        if (-not $newman) {
            npm install -g newman 2>&1 | Out-Null
        }

        $reportFile = Join-Path $rootDir "reports/postman-report.json"
        New-Item -ItemType Directory -Force -Path (Split-Path $reportFile) | Out-Null

        newman run tests/admin-test-plan.postman_collection.json `
            --env-var "baseUrl=http://localhost:3000" `
            --env-var "adminEmail=admin@hostamar.com" `
            --env-var "adminPassword=EQDTvtbrSUw5ARudl9kC" `
            --reporters cli,json `
            --reporter-json-export $reportFile `
            --timeout-request 30000 `
            --delay-request 200 `
            --bail 2>&1

        if ($LASTEXITCODE -ne 0) { throw "Postman tests failed" }
    }
}

# 5. Grafana import
if (-not $SkipGrafana) {
    Step "Grafana Dashboard Import" {
        $grafanaUrl = $env:GRAFANA_URL
        $grafanaKey = $env:GRAFANA_API_KEY
        if (-not $grafanaUrl -or -not $grafanaKey) {
            Write-Host "  Skipping (set GRAFANA_URL and GRAFANA_API_KEY env vars)" -ForegroundColor Yellow
            return
        }

        $dashboard = Get-Content monitoring/grafana-dashboard.json -Raw
        $body = @{ dashboard = ($dashboard | ConvertFrom-Json); overwrite = $true } | ConvertTo-Json -Depth 10

        $null = Invoke-RestMethod -Uri "$grafanaUrl/api/dashboards/db" `
            -Method Post `
            -Headers @{ Authorization = "Bearer $grafanaKey"; "Content-Type" = "application/json" } `
            -Body $body

        Write-Host "  Dashboard imported" -ForegroundColor Gray
    }
}

# Summary
Write-Host "`n═══════════════════════════════════" -ForegroundColor Cyan
Write-Host "RESULTS: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "═══════════════════════════════════" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 }
'@