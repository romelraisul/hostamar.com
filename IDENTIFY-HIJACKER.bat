@echo off
title Find Hijacking Project - Interrogation Script
echo.
echo ===================================
echo  HOSTMAR.COM - AUTO IDENTIFICATION
echo ===================================
echo.
echo This script will help you identify EXACTLY which
echo Vercel project is hijacking your domain.
echo.
echo Step 1: Query the server that's responding...
echo.

REM Get page title from response
echo Fetching page title...
for /f "delims=" %%a in ('curl -s https://hostamar.com ^| findstr /I "<title>" ^| findstr /v "<!"') do (
    set "title=%%a"
)
echo.
echo Step 2: Extract content clues...
echo.

REM Get first meaningful text
echo Looking for project identifiers...
curl -s https://hostamar.com 2>nul | findstr /I "welcome" >nul && set "clue=Generic Vercel page"
curl -s https://hostamar.com 2>nul | findstr /I "vercel" >nul && set "clue=Vercel placeholder page"
curl -s https://hostamar.com 2>nul | findstr /I "not found" >nul && set "clue=404/error page"

echo.
echo Step 3: Get response headers...
echo.

echo ---- HTTP HEADERS ----
curl -s -I https://hostamar.com 2>nul | findstr /R /C:"Server:" /C:"x-vercel" /C:"x-matched" /C:"x-vercel-id"
echo.
echo ---- END HEADERS ----
echo.

echo ===================================
echo  ANALYSIS
echo ===================================
echo.
echo Based on the headers above:
echo.
echo Look for:
echo  - 'x-matched-path' header shows the project path
echo  - 'x-vercel-id' shows deployment ID
echo  - 'server' header may indicate Vercel version
echo.
echo These clues tell you which project is serving.
echo.

echo ===================================
echo  NOW CHECK YOUR VERCEL PROJECTS
echo ===================================
echo.
echo Open: https://vercel.com/dashboard
echo.
echo CHECK EACH PROJECT SETTINGS:
echo.
echo   Project name                | Check domain
echo   ---------------------------|----------------
echo   hostamar (just 'hostamar')  | hostamar.com?
echo   hostamar-v1                 | hostamar.com?
echo   hostamar-next               | hostamar.com?
echo   video-saas                  | hostamar.com?
echo   hostamar-local              | hostamar.com? (THAT ONE IS CORRECT)
echo.
echo FIND ANY PROJECT OTHER than 'hostamar-local' with hostamar.com
echo AND REMOVE IT!
echo.
echo ===================================
echo  ACTION REQUIRED
echo ===================================
echo.
echo   1. Go to Vercel Dashboard right now
echo   2. Find the project showing 'hostamar.com' in its domains
echo   3. Click 'Remove' next to hostamar.com
echo   4. Refresh page to confirm removal
echo.
echo   5. Go to hostamar-local
echo   6. Settings -> Domains -> Add hostamar.com
echo   7. Click Verify
echo.
pause
