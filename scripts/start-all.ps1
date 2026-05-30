# Unified startup script for all Hostamar services
# Run as Administrator for best results

$ErrorActionPreference = "Continue"

Write-Host "=== Starting All Hostamar Services ===" -ForegroundColor Green
Write-Host ""

# Function to start a service in a new window
function Start-Service {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Command,
        [string]$Color = "White"
    )
    
    Write-Host "[$Name] Starting..." -ForegroundColor $Color
    
    $scriptPath = Join-Path $Path "start-$Name.ps1"
    $scriptContent = @"
Set-Location "$Path"
$Command
"@
    
    if (Test-Path $scriptPath) {
        Remove-Item $scriptPath -Force
    }
    
    Set-Content -Path $scriptPath -Value $scriptContent
    
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $scriptPath -WindowStyle Normal
    
    Start-Sleep -Seconds 2
    Write-Host "[$Name] Started in new window" -ForegroundColor Green
}

# Kill existing processes on our ports
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
$ports = @(3000, 3001, 3004, 5173, 5174, 8081)
foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Write-Host "  Killed process on port $port" -ForegroundColor Yellow
    }
}
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Cyan
Write-Host ""

# 1. Backend API (Port 3001)
Start-Service -Name "backend" -Path "C:\Users\romel\backend" -Command "npm run dev" -Color "Blue"

# 2. DuckAI Chat (Port 3004)
Start-Service -Name "duckai-chat" -Path "C:\Users\romel\duckai-chat" -Command "npm run dev" -Color "Yellow"

# 3. Social Casino Backend (Port 8081)
Start-Service -Name "casino-backend" -Path "C:\Users\romel\social-casino\backend" -Command "npm run dev" -Color "Magenta"

# 4. Social Casino Frontend (Port 5174)
Start-Service -Name "casino-frontend" -Path "C:\Users\romel\social-casino\frontend" -Command "npm run dev" -Color "Magenta"

# 5. AI Browser (Port 5173)
Start-Service -Name "ai-browser" -Path "C:\Users\romel\ai-browser" -Command "npm run dev" -Color "Green"

# 6. Hostamar Platform (Port 3000)
Start-Service -Name "hostamar" -Path "C:\Users\romel\hostamar-local" -Command "npm run dev -- -p 3000" -Color "Cyan"

Write-Host ""
Write-Host "=== All Services Started ===" -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "  Hostamar Platform:  http://localhost:3000  (or http://hostamar.com)" -ForegroundColor White
Write-Host "  Backend API:        http://localhost:3001" -ForegroundColor White
Write-Host "  DuckAI Chat:        http://localhost:3004" -ForegroundColor White
Write-Host "  AI Browser:         http://localhost:5173" -ForegroundColor White
Write-Host "  Casino Frontend:    http://localhost:5174" -ForegroundColor White
Write-Host "  Casino Backend:     http://localhost:8081" -ForegroundColor White
Write-Host ""
Write-Host "To stop all services, close the individual windows or run:" -ForegroundColor Yellow
Write-Host "  .\scripts\stop-all.ps1" -ForegroundColor Yellow
