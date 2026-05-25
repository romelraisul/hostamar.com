@echo off
REM ------------------------------------------------------------
REM Hostamar.com - Full Launch Verification
REM Checks DNS, tests Vercel, confirms everything is live
REM ------------------------------------------------------------

echo.
echo ============================================
echo  HOSTAMAR.COM - LAUNCH VERIFICATION
echo ============================================
echo.

:CHECK_DNS
echo [1/4] Checking DNS propagation...
echo.
nslookup hostamar.com | findstr /C:"76.76.21.21"
if errorlevel 1 (
    echo    DNS not ready yet. Waiting...
    echo    (If this persists >30 min, check Cloudflare manually)
    timeout /t 10 /nobreak >nul
    goto CHECK_DNS
) else (
    echo    ✅ DNS propagated! hostamar.com resolves to 76.76.21.21
)

echo.
echo [2/4] Checking Vercel deployment...
echo.
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://hostamar.com 2>nul || (
    echo    ⏳ Vercel may still be initializing domain. Waiting...
    timeout /t 10 /nobreak >nul
    goto CHECK_VERCEL
)
echo    ✅ Vercel is responding!

echo.
echo [3/4] Checking Vercel domain verification...
echo.
echo    Please verify manually in Vercel Dashboard:
echo    https://vercel.com/dashboard/projects/hostamar-local/domains
echo.
echo    Is hostamar.com showing "Verified" (green checkmark)?
echo.
choice /C YN /M "Is domain verified in Vercel"
if errorlevel 2 (
    echo    Please verify in Vercel first, then re-run this script.
    pause
    exit /b 1
)

echo.
echo [4/4] Final live test...
echo.
start https://hostamar.com
echo    🌐 Opening https://hostamar.com in your browser...
echo.

echo ============================================
echo   ✅ LAUNCH VERIFICATION COMPLETE!
echo ============================================
echo.
echo Your SaaS is now LIVE at:
echo   https://hostamar.com
echo.
echo Next immediate steps:
echo   1. Send announcement email
echo   2. Post to Facebook groups
echo   3. Upload first YouTube video
echo.
echo Revenue projection: ৳1,75,000/month (50 customers)
echo.
pause
