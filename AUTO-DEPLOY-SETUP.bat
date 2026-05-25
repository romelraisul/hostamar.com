@echo off
title Hostamar Auto-Deploy Setup
echo ============================================
echo    Hostamar Auto-Deployment SETUP
echo ============================================
echo.
echo This will set up one-click auto-deployment.
echo.

:: Check if VERCEL_TOKEN already saved
if exist "%USERPROFILE%\.vercel\token.txt" (
    echo [OK] Vercel token already configured.
    goto :DEPLOY
)

:: Create .vercel folder
if not exist "%USERPROFILE%\.vercel" mkdir "%USERPROFILE%\.vercel"

echo STEP 1: Get your Vercel Token
echo.
echo 1. Go to: https://vercel.com/account/tokens
echo 2. Create a new token (or copy an existing one)
echo 3. Enter the token below:
echo.
set /p VERCEL_TOKEN="Enter Vercel Token: "

:: Save token
echo %VERCEL_TOKEN%>"%USERPROFILE%\.vercel\token.txt"
echo [OK] Token saved!

:DEPLOY
set /p VERCEL_TOKEN=<"%USERPROFILE%\.vercel\token.txt"

echo.
echo ============================================
echo    Starting Auto-Deployment...
echo ============================================
echo.

echo [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)
echo [OK] Dependencies installed.
echo.

echo [2/3] Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [WARN] Prisma generate failed (might be non-Prisma project)
)
echo.

echo [3/3] Building + deploying to Vercel...
call npx vercel --prod --yes --token=%VERCEL_TOKEN%
if %errorlevel% neq 0 (
    echo [ERROR] Deploy failed!
    pause
    exit /b 1
)
echo.
echo ============================================
echo    DEPLOYMENT COMPLETE! Site is LIVE!
echo ============================================
echo.
echo Auto-deployment is now set up.
echo To deploy in future: double-click AUTO-DEPLOY.bat
echo.
pause