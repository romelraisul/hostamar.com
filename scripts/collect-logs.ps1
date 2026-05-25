# Hostamar Log Collection Script
# Collects logs from all services into a single archive

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outputDir = Join-Path $PSScriptRoot "..\logs\collected"
$archiveName = "hostamar-logs-$timestamp.zip"
$archivePath = Join-Path $outputDir $archiveName

Write-Host "=== Hostamar Log Collector ===" -ForegroundColor Cyan
Write-Host "Timestamp: $timestamp" -ForegroundColor Gray

# Create output directory
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$collectDir = Join-Path $outputDir "raw-$timestamp"
New-Item -ItemType Directory -Path $collectDir -Force | Out-Null

# 1. Collect application logs
Write-Host "`n[1/4] Collecting application logs..." -ForegroundColor Yellow
$appLogDir = Join-Path $PSScriptRoot "..\logs"
if (Test-Path $appLogDir) {
    $appDest = Join-Path $collectDir "application"
    New-Item -ItemType Directory -Path $appDest -Force | Out-Null
    Copy-Item -Path "$appLogDir\*.log" -Destination $appDest -ErrorAction SilentlyContinue
    Write-Host "  Copied application logs" -ForegroundColor Green
} else {
    Write-Host "  No application logs found" -ForegroundColor DarkGray
}

# 2. Collect Docker container logs
Write-Host "`n[2/4] Collecting Docker container logs..." -ForegroundColor Yellow
$dockerDest = Join-Path $collectDir "docker"
New-Item -ItemType Directory -Path $dockerDest -Force | Out-Null

try {
    $containers = docker ps -a --format "{{.Names}}" 2>$null
    if ($containers) {
        foreach ($container in $containers) {
            Write-Host "  Collecting logs from: $container" -ForegroundColor Gray
            docker logs $container --tail 1000 2>&1 | Out-File -FilePath "$dockerDest\$container.log" -Encoding utf8
        }
        Write-Host "  Docker logs collected" -ForegroundColor Green
    } else {
        Write-Host "  No Docker containers found" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "  Docker not available: $_" -ForegroundColor Red
}

# 3. Collect nginx logs
Write-Host "`n[3/4] Collecting nginx logs..." -ForegroundColor Yellow
$nginxDest = Join-Path $collectDir "nginx"
New-Item -ItemType Directory -Path $nginxDest -Force | Out-Null

$nginxPaths = @(
    "C:\nginx\logs",
    "C:\Program Files\nginx\logs",
    "$env:ProgramData\nginx\logs"
)

$foundNginx = $false
foreach ($nginxPath in $nginxPaths) {
    if (Test-Path $nginxPath) {
        Copy-Item -Path "$nginxPath\*.log" -Destination $nginxDest -ErrorAction SilentlyContinue
        $foundNginx = $true
    }
}

if ($foundNginx) {
    Write-Host "  Nginx logs collected" -ForegroundColor Green
} else {
    Write-Host "  No nginx logs found at standard locations" -ForegroundColor DarkGray
}

# Also try nginx Docker container
try {
    $nginxContainer = docker ps -a --format "{{.Names}}" | Where-Object { $_ -match "nginx" }
    if ($nginxContainer) {
        docker logs $nginxContainer --tail 2000 2>&1 | Out-File -FilePath "$nginxDest\container.log" -Encoding utf8
        Write-Host "  Nginx container logs collected" -ForegroundColor Green
    }
} catch {
    # Silently skip if no nginx container
}

# 4. Collect Next.js / Node.js logs
Write-Host "`n[4/4] Collecting Node.js service logs..." -ForegroundColor Yellow
$nodeDest = Join-Path $collectDir "nodejs"
New-Item -ItemType Directory -Path $nodeDest -Force | Out-Null

# PM2 logs if available
try {
    $pm2Home = $env:PM2_HOME ?: "$env:USERPROFILE\.pm2"
    if (Test-Path "$pm2Home\logs") {
        Copy-Item -Path "$pm2Home\logs\*" -Destination $nodeDest -Recurse -ErrorAction SilentlyContinue
        Write-Host "  PM2 logs collected" -ForegroundColor Green
    }
} catch {
    Write-Host "  PM2 not available" -ForegroundColor DarkGray
}

# Windows Event Logs (application-related)
try {
    Get-WinEvent -LogName Application -MaxEvents 500 -ErrorAction SilentlyContinue |
        Where-Object { $_.Message -match "node|next|hostamar" -or $_.ProviderName -match "node|next" } |
        Format-List | Out-File -FilePath "$nodeDest\windows-events.log" -Encoding utf8
    Write-Host "  Windows event logs collected" -ForegroundColor Green
} catch {
    Write-Host "  Could not collect Windows events" -ForegroundColor DarkGray
}

# Create archive
Write-Host "`nCreating archive..." -ForegroundColor Yellow
Compress-Archive -Path "$collectDir\*" -DestinationPath $archivePath -Force

# Cleanup raw files
Remove-Item -Path $collectDir -Recurse -Force

# Summary
$archiveSize = (Get-Item $archivePath).Length
$sizeMB = [math]::Round($archiveSize / 1MB, 2)

Write-Host "`n=== Collection Complete ===" -ForegroundColor Cyan
Write-Host "Archive: $archivePath" -ForegroundColor White
Write-Host "Size: ${sizeMB} MB" -ForegroundColor White
Write-Host "Date: $timestamp" -ForegroundColor White
