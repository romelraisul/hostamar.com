@echo off
title Hostamar.com - COMPLETE DOMAIN FIX
color 0A
cls
echo.
echo =============================================================================
echo                        HOSTAMAR.COM - DOMAIN FIX
echo =============================================================================
echo.
echo THIS SCRIPT WILL:
echo   1. Identify which Vercel project is hijacking your domain
echo   2. Guide you to remove hostamar.com from wrong project
echo   3. Guide you to add it to the correct project (hostamar-local)
echo   4. TEST if it's working
echo.
echo CURRENT STATUS:
echo   - DNS: Correct (76.76.21.21)
echo   - Problem: Another Vercel project serving the domain
echo   - Solution: Remove from wrong project, add to hostamar-local
echo.
echo =============================================================================
echo.
echo Step 1: Identify the hijacking project
echo ---------------------------------------
echo.
echo Fetching current response...
echo.

curl -s -I https://hostamar.com 2>nul > headers.txt
echo ---- HEADERS ----
type headers.txt
echo ---- END HEADERS ----
echo.

echo Doing web request...
curl -s https://hostamar.com 2>nul > page.html
echo.
echo Page title (first match):
for /f "delims=" %%a in ('findstr /I "<title>" page.html ^| head -1') do echo %%a
echo.

echo Checking for 'hostamar' in page...
findstr /I "hostamar" page.html >nul
if %errorlevel%==0 (
    echo [FOUND 'hostamar' in page - seems like YOUR project?]
) else (
    echo [NO 'hostamar' found - DEFINITELY wrong project]
)
echo.

echo =============================================================================
echo   WHAT TO DO NOW:
echo =============================================================================
echo.
echo VERY LIKELY, the hijacking project is: 'hostamar' (without -local)
echo.
echo QUICKEST FIX (2 minutes):
echo.
echo   1. Open browser: https://vercel.com/dashboard
echo   2. Look for project named: 'hostamar' (NOT 'hostamar-local')
echo   3. Click it -> Settings -> Domains
echo   4. You'll see hostamar.com listed -> Click 'Remove'
echo   5. Confirm removal
echo.
echo   6. Then go to: https://vercel.com/dashboard/projects/hostamar-local
echo   7. Settings -> Domains
echo   8. Click 'Add' -> Enter: hostamar.com -> Click 'Verify'
echo   9. Wait for green checkmark (1-2 min)
echo.
echo =============================================================================
echo.
echo ALTERNATIVE: If you can't find it, scan ALL your projects:
echo.
echo   https://vercel.com/dashboard/projects?page=1   (check page 1, 2, 3...)
echo   For EACH project, click it and check Settings -> Domains
echo   Remove hostamar.com from ANY project that's NOT 'hostamar-local'
echo.
echo =============================================================================
echo.
echo Press Y when you've removed hostamar.com from the wrong project...
choice /c YN /m "Ready to proceed?"
if errorlevel 2 goto END

echo.
echo Step 2: Cleaning Cloudflare DNS...
echo ---------------------------------------
echo.
echo WARNING: Cloudflare DNS will be temporarily removed!
echo This is necessary to force domain re-association.
echo.
echo ACTION NEEDED:
echo.
echo   1. Go to: https://dash.cloudflare.com/
echo   2. Click: hostamar.com
echo   3. Go to: DNS Records
echo   4. DELETE both records:
echo        - A record: @ -> 76.76.21.21
echo        - CNAME: www -> cname.vercel-dns.com
echo   5. Wait 10 seconds
echo   6. Re-add them:
echo        A: @ -> 76.76.21.21 (Proxy: OFF)
echo        CNAME: www -> cname.vercel-dns.com (Proxy: OFF)
echo.
echo Press Y when DNS is cleaned and re-added...
choice /c YN /m "DNS cleaned and re-added?"
if errorlevel 2 goto END

echo.
echo Step 3: Verify in Vercel...
echo ---------------------------------------
echo.
echo   1. Go to: https://vercel.com/dashboard/projects/hostamar-local/settings/domains
echo   2. If hostamar.com is in list:
echo        - Click 'Verify' button
echo   3. If NOT in list:
echo        - Click 'Add' button
echo        - Enter: hostamar.com
echo        - Click: Verify
echo.
echo Wait for green checkmark.
echo.
echo Press Y when you see the green checkmark...
choice /c YN /m "Verification complete (green checkmark)?"
if errorlevel 2 goto END

echo.
echo Step 4: Testing...
echo ---------------------------------------
echo.
echo Testing: https://hostamar.com
echo.
curl -s https://hostamar.com | findstr /I "hostamar" >nul
if %errorlevel%==0 (
    echo ==========================================
    echo   SUCCESS! YOUR SAAS IS LIVE!
    echo ==========================================
    echo.
    echo https://hostamar.com - showing Hostamar content!
    echo.
) else (
    echo ==========================================
    echo   STILL NOT RIGHT - Retry steps
    echo ==========================================
    echo.
    echo Not showing hostamar yet.
    echo Try: Clear browser cache, use incognito, wait 5 min.
)

echo.
echo Press any key to exit...
pause >nul
:END
echo On hold - complete the Vercel verification steps.
pause
