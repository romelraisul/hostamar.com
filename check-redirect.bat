@echo off
echo ============================================
echo  hostamar.com - REDIRECT DIAGNOSTIC
echo ============================================
echo.
echo Checking where hostamar.com/login redirects...
echo.
curl -s -o /dev/null -w "Final URL: %%{url_effective}\n" https://hostamar.com/login 2>nul
echo.
echo Checking HTTP headers:
echo.
curl -I https://hostamar.com 2>nul
echo.
echo Checking what project is responding:
echo.
curl -s https://hostamar.com | findstr /I "hostamar"
echo.
echo ============================================
echo  COMMON CAUSES:
echo ============================================
echo.
echo 1. ANOTHER Vercel project has hostamar.com configured
echo 2. Browser cache redirecting you
echo 3. DNS pointing to wrong deployment
echo.
echo ACTIONS:
echo   A. Check Vercel Dashboard - look for OTHER projects with hostamar.com
echo   B. Open incognito window, test https://hostamar.com/login
echo   C. Check Cloudflare DNS - only ONE A/CNAME pair for hostamar.com
echo.
pause
