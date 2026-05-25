@echo off
REM Cloudflare Domain Connection for hostamar.com
REM Run this from Windows Command Prompt (as Administrator)

echo ========================================
echo  CLOUDFLARE DNS SETUP - hostamar.com
echo ========================================
echo.

REM Check for credentials
if "%CLOUDFLARE_API_TOKEN%"=="" (
    echo ERROR: CLOUDFLARE_API_TOKEN not set
    echo.
    echo Set it with:
    echo   setx CLOUDFLARE_API_TOKEN "your_token_here"
    echo.
    echo Or run this script after setting token.
    pause
    exit /b 1
)

if "%CLOUDFLARE_ZONE_ID%"=="" (
    echo ERROR: CLOUDFLARE_ZONE_ID not set
    echo.
    echo Set it with:
    echo   setx CLOUDFLARE_ZONE_ID "your_zone_id_here"
    echo.
    echo Or run this script after setting zone ID.
    pause
    exit /b 1
)

echo Credentials found!
echo.
echo Running automated DNS configuration...
echo.

REM Change to project directory
cd /d C:\Users\romel\hostamar-local

REM Run Node.js script
node scripts\cloudflare-setup.js

echo.
echo ========================================
echo  SETUP COMPLETE!
echo ========================================
echo.
echo Next steps:
echo   1. Wait 5-10 minutes for DNS propagation
echo   2. Go to: https://vercel.com/dashboard/projects/hostamar-local/domains
echo   3. Add domain: hostamar.com
echo   4. Click Verify
echo.
pause
