@echo off
title Hostamar Auto-Deploy (Cloudflare Pages)
echo ============================================
echo    Hostamar Auto-Deploy (Cloudflare Pages)
echo ============================================
echo.

:: Load saved token
if not exist "%USERPROFILE%\.cf\token.txt" (
    goto :CLOUDFLARE_SETUP
)

set /p CF_TOKEN=<"%USERPROFILE%\.cf\token.txt"
set /p CF_ACCOUNT=<"%USERPROFILE%\.cf\account.txt"

echo [1/2] Building static export...
call npm run build
if %errorlevel% neq 0 (
    echo [WARN] Build may have issues, continuing...
)
echo.

echo [2/2] Deploying to Cloudflare Pages...
call npx wrangler pages deploy . --project-name hostamar-video --branch=production
if %errorlevel% neq 0 (
    echo [ERROR] Deploy failed! Try: npx wrangler login
    pause
    exit /b 1
)
echo.
echo ============================================
echo    DEPLOYED to Cloudflare Pages! ^(^>_^<^)^)
echo ============================================
pause
exit /b 0

:CLOUDFLARE_SETUP
echo Set up Cloudflare credentials first:
echo.
echo Option A: Run AUTO-DEPLOY-SETUP.bat for Vercel
echo Option B: Install Wrangler: npm install -g wrangler
echo Option C: Use Vercel instead (recommended)
echo.
pause