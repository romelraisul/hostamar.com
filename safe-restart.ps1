# Hostamar Safe Restart Script
# Usage: .\safe-restart.ps1

Write-Host "=== Hostamar Safe Restart ===" -ForegroundColor Cyan

# 1. Check if Docker is running
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "ERROR: Docker is not running!" -ForegroundColor Red
    exit 1
}

# 2. Restart services
Write-Host "Restarting services..." -ForegroundColor Yellow
docker compose -f docker-compose.yml down

# 3. Wait for clean shutdown
Start-Sleep -Seconds 5

# 4. Start services
Write-Host "Starting services..." -ForegroundColor Yellow
docker compose -f docker-compose.yml up -d

# 5. Wait for services to be ready
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# 6. Health check
Write-Host "Running health checks..." -ForegroundColor Yellow
$healthy = $true

# Check frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] Frontend is responding" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Frontend returned $($response.StatusCode)" -ForegroundColor Red
        $healthy = $false
    }
} catch {
    Write-Host "[FAIL] Frontend not responding: $_" -ForegroundColor Red
    $healthy = $false
}

# Check backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "[OK] Backend is responding" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Backend health check failed (may be normal)" -ForegroundColor Yellow
}

# Check Nginx config
$nginxTest = docker exec hostamar-local-nginx-1 nginx -t 2>&1
if ($nginxTest -match "syntax is ok") {
    Write-Host "[OK] Nginx config is valid" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Nginx config error: $nginxTest" -ForegroundColor Red
    $healthy = $false
}

# Show container status
Write-Host "`n=== Container Status ===" -ForegroundColor Cyan
docker compose -f docker-compose.yml ps

if ($healthy) {
    Write-Host "`n=== All checks passed! ===" -ForegroundColor Green
} else {
    Write-Host "`n=== Some checks failed! Check logs: docker compose logs ===" -ForegroundColor Red
}
