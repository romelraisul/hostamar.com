@echo off
REM ===========================================================================
REM Hostamar Local VPS — Windows Auto-Start (double-click or Task Scheduler)
REM ===========================================================================
echo Starting Hostamar Local VPS...

REM 1. Start Docker Desktop if not running
tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>NUL | find /I /N "Docker Desktop.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] Docker Desktop is running
) else (
    echo [INFO] Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    timeout /t 15 /nobreak >NUL
)

REM 2. Run WSL startup script
echo [INFO] Starting Hostamar services in WSL...
wsl -d Ubuntu -- bash /home/romel/hostamar-start.sh

REM 3. Show status
echo.
echo [DONE] Hostamar Local VPS is running!
echo Open http://localhost:80 in your browser
pause
