param(
  [string]$BaseUrl = "https://hostamar.com",
  [string]$AdminPassword = $env:ADMIN_PASSWORD,
  [int]$PollTimeoutSec = 600,
  [int]$PollIntervalSec = 6
)

$start = Get-Date
$deadline = $start.AddSeconds($PollTimeoutSec)

Write-Host "Waiting for $BaseUrl to become healthy (timeout $PollTimeoutSec s)..."

function Wait-For-Url($url) {
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
      if ($r.StatusCode -eq 200) { return $true }
    } catch { Start-Sleep -Seconds $PollIntervalSec }
  }
  return $false
}

if (-not (Wait-For-Url "$BaseUrl/login")) {
  Write-Error "Timeout waiting for $BaseUrl/login"
  exit 2
}
if (-not (Wait-For-Url "$BaseUrl/admin")) {
  Write-Error "Timeout waiting for $BaseUrl/admin"
  exit 2
}
Write-Host "Site is healthy. Running checks..." -ForegroundColor Green

$headersToCheck = @("X-Frame-Options","X-Content-Type-Options","Strict-Transport-Security","Content-Security-Policy")
$headerResults = @{}
$response = Invoke-WebRequest -Uri "$BaseUrl/login" -Method Head -UseBasicParsing
foreach ($h in $headersToCheck) {
  $val = if ($response.Headers[$h]) { $response.Headers[$h] } else { $null }
  $headerResults[$h] = $val
  if ($val) { Write-Host "  $h : $val" -ForegroundColor Green } else { Write-Host "  $h : MISSING" -ForegroundColor Red }
}

$pdvResult = @{ success = $false; output = $null }
try {
  $pdvOut = & ".\scripts\post-deploy-verify.ps1" -BaseUrl $BaseUrl -AdminPassword $AdminPassword 2>&1
  $pdvResult.success = ($LASTEXITCODE -eq 0)
  $pdvResult.output = ($pdvOut | Out-String)
} catch {
  $pdvResult.output = $_.Exception.Message
}
Write-Host "Post-deploy verify: $(if ($pdvResult.success) { 'PASS' } else { 'FAIL' })" -ForegroundColor $(if ($pdvResult.success) { 'Green' } else { 'Red' })

$newmanResult = @{ installed = $false; success = $false; report = $null }
if (Get-Command newman -ErrorAction SilentlyContinue) {
  $newmanResult.installed = $true
  $reportPath = "reports/newman-critical-$(Get-Date -Format yyyyMMddHHmmss).json"
  New-Item -ItemType Directory -Force -Path reports | Out-Null
  $newmanOut = cmd /c "newman run tests\admin-test-plan.postman_collection.json --folder critical-flows --env-var baseUrl=$BaseUrl --reporters cli,json --reporter-json-export $reportPath 2>&1"
  $newmanResult.success = ($LASTEXITCODE -eq 0)
  $newmanResult.report = if (Test-Path $reportPath) { Get-Content $reportPath -Raw } else { $newmanOut }
  Write-Host "Newman critical flows: $(if ($newmanResult.success) { 'PASS' } else { 'FAIL' })" -ForegroundColor $(if ($newmanResult.success) { 'Green' } else { 'Red' })
} else { Write-Host "Newman not installed, skip" -ForegroundColor Yellow }

$dmr = @{ url = "http://127.0.0.1:12434/engines/v1"; ok = $false; body = $null }
$ollama = @{ url = "http://127.0.0.1:11434/v1/models"; ok = $false; body = $null }
try { $r = Invoke-WebRequest -Uri $dmr.url -UseBasicParsing -TimeoutSec 5; $dmr.ok = $true; $dmr.body = $r.Content } catch { $dmr.body = $_.Exception.Message }
try { $r = Invoke-WebRequest -Uri $ollama.url -UseBasicParsing -TimeoutSec 5; $ollama.ok = $true; $ollama.body = $r.Content } catch { $ollama.body = $_.Exception.Message }
Write-Host "DMR: $(if ($dmr.ok) { 'ok' } else { 'unreachable' }) | Ollama: $(if ($ollama.ok) { 'ok' } else { 'unreachable' })"

$report = @{
  timestamp = (Get-Date).ToString("o")
  baseUrl = $BaseUrl
  headerChecks = $headerResults
  postDeployVerify = $pdvResult
  newman = $newmanResult
  dmr = $dmr
  ollama = $ollama
}
$reportJson = $report | ConvertTo-Json -Depth 6
$reportPath = "reports\deploy-verify-report.json"
$reportJson | Out-File -FilePath $reportPath -Encoding utf8
Write-Host "Report saved: $reportPath" -ForegroundColor Cyan

if (-not $pdvResult.success -or ($newmanResult.installed -and -not $newmanResult.success)) { exit 3 } else { exit 0 }
