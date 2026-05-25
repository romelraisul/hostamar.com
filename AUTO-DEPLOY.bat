@echo off
title Hostamar Auto-Deploy
echo ============================================
echo    Hostamar Auto-Deployment
echo ============================================

:: Load saved token
if not exist "%USERPROFILE%\.vercel\token.txt" (
    echo [ERROR] No token found!
    echo Run AUTO-DEPLOY-SETUP.bat first to configure.
    pause
    exit /b 1
)
set /p VERCEL_TOKEN=<"%USERPROFILE%\.vercel\token.txt"

echo [1/3] Building + deploying to Vercel...
call npx vercel --prod --yes --token=%VERCEL_TOKEN%
if %errorlevel% neq 0 (
    echo [ERROR] Deploy failed!
    pause
    exit /b 1
)
echo.
echo ============================================
echo    DEPLOYMENT COMPLETE!
echo ============================================
pause