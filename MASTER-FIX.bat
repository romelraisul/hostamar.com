@echo off
title Hostamar.com - COMPLETE DOMAIN FIX MASTER
color 0A
echo.
echo =============================================================================
echo                    HOSTAMAR.COM - MASTER FIX TOOL
echo =============================================================================
echo.
echo This will open your browser to Vercel dashboard pages.
echo.
echo INSTRUCTIONS:
echo   1. Press Ctrl+F in each opened tab
echo   2. Search for: hostamar.com
echo   3. If found on a project NOT named 'hostamar-local', click it
echo   4. Go to Settings -> Domains
echo   5. Remove hostamar.com
echo   6. Return here and press any key when done
echo.
pause
echo.
echo Opening Vercel Dashboard pages 1-5...
echo.
for /L %%i in (1,1,5) do (
    start https://vercel.com/dashboard/projects?page=%%i
    timeout /t 1 /nobreak >nul
)
echo.
echo All pages opened! Search each for 'hostamar.com'
echo.
echo AFTER removing from wrong project:
echo   1. Go to: https://vercel.com/dashboard/projects/hostamar-local
echo   2. Settings -> Domains -> Add hostamar.com -> Verify
echo   3. Wait for green checkmark
echo.
pause
echo.
echo Now let's test if it's working...
echo.
echo Checking DNS resolution...
nslookup hostamar.com
echo.
echo Testing HTTP response...
curl -s -I https://hostamar.com | findstr "HTTP"
echo.
echo Press any key when verification is complete...
pause
echo.
echo FINAL TEST: Opening https://hostamar.com
echo.
start https://hostamar.com
echo.
echo =============================================================================
echo  DONE! Your SaaS should be LIVE now!
echo =============================================================================
echo.
pause
