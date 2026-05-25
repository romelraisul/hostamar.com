@echo off
title Hostamar.com - FINAL VERIFICATION
color 0A
cls
echo.
echo =============================================================================
echo                        HOSTAMAR.LOCAL - LIVE CHECK
echo =============================================================================
echo.
echo This script will verify your SaaS is live and working.
echo.
echo =============================================================================
echo.
echo Step 1: DNS Resolution
echo.
echo Running: nslookup hostamar.com
echo.
nslookup hostamar.com 2>nul
echo.
echo Expected: Non-authoritative answer: 76.76.21.21
echo.
pause
echo.
echo Step 2: HTTP Response
echo.
echo Checking https://hostamar.com...
echo.
curl -s -I https://hostamar.com 2>nul | findstr "HTTP\|Server\|X-Vercel"
echo.
pause
echo.
echo Step 3: Page Content
echo.
echo Fetching homepage (first 500 chars)...
echo.
curl -s https://hostamar.com 2>nul > page_check.html
echo First 500 characters of page:
echo.
powershell -Command "Get-Content page_check.html -TotalCount 30"
echo.
echo Checking for 'hostamar' branding...
findstr /I "hostamar" page_check.html >nul
if not errorlevel 1 (
    echo SUCCESS: Found 'hostamar' in page content!
) else (
    echo WARNING: 'hostamar' not found in page
)
echo.
pause
echo.
echo Step 4: Login Page
echo.
echo Checking https://hostamar.com/login...
echo.
curl -s -I https://hostamar.com/login 2>nul | findstr "HTTP"
echo.
pause
echo.
echo =============================================================================
echo                       VERIFICATION SUMMARY
echo =============================================================================
echo.
echo CHECK THESE MANUALLY:
echo.
echo   1. Open browser: https://hostamar.com
echo      Does it show your Hostamar SaaS homepage?
echo.
echo   2. Open: https://hostamar.com/login
echo      Does it show login page?
echo.
echo   3. Try to register a new user
echo      Does registration work?
echo.
echo   4. Login credentials page
echo      Can you log in?
echo.
echo =============================================================================
echo.
echo IF ALL GREEN - YOUR SAAS IS LIVE!
echo.
echo Revenue: Starting at ৳2,000/customer/month
echo Customers needed for break-even: ~35
echo.
echo =============================================================================
echo.
echo Press any key to open the site in your browser...
pause >nul
start https://hostamar.com
echo.
echo Good luck with your launch!
echo.
pause
