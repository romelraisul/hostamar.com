@echo off
REM Manual Cloudflare Pages Deployment Script

title Hostamar - Cloudflare Pages Deployment

echo ========================================
echo   🚀 CLOUDFLARE PAGES DEPLOYMENT
echo ========================================
echo.

echo 📦 Generating Prisma client...
npx prisma generate
if errorlevel 1 (
    echo ❌ Prisma generation failed
    pause
    exit /b 1
)

echo 🔨 Building application...
set NEXT_PUBLIC_BASE_PATH=/
set NEXT_PUBLIC_ASSET_PREFIX=/
set NEXT_PUBLIC_STATIC_EXPORT=true
npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo 📝 Creating Cloudflare files...
(
echo /*
echo   X-Frame-Options: DENY
echo   X-Content-Type-Options: nosniff
echo   Referrer-Policy: strict-origin-when-cross-origin
echo.
echo /assets/*
echo   Cache-Control: public, max-age=31536000, immutable
echo.
echo /images/*
echo   Cache-Control: public, max-age=31536000, immutable
) > .next\_headers

(
echo # Cloudflare Pages redirects
echo /dashboard/* /dashboard/:splat 200
echo /api/* /api/:splat 200
echo /* /index.html 200
) > .next\_redirects

echo.
echo ========================================
echo   ✅ READY FOR CLOUDFLARE PAGES!
echo ========================================
echo.
echo Deployment steps:
echo 1. Go to: https://dash.cloudflare.com
echo 2. Select your account
echo 3. Go to Pages
echo 4. Create new project or select existing
echo 5. Set:
echo    - Project name: hostamar-local
echo    - Production branch: main
echo    - Framework preset: Next.js
echo    - Build command: npx prisma generate && npm run build
echo    - Build output directory: .next
echo    - Root directory: / (leave empty)
echo 6. Add environment variables:
echo    - NEXT_PUBLIC_BASE_PATH: /
echo    - NEXT_PUBLIC_ASSET_PREFIX: /
echo 7. Click "Save and Deploy"
echo.
echo Alternative: Upload this command output
echo.

REM Create deployment package
echo 📦 Creating deployment package...
tar -czf hostamar-cloudflare.tar.gz .next
if errorlevel 1 (
    echo ⚠️ Tar not available, skipping package creation
) else (
    echo ✅ Package created: hostamar-cloudflare.tar.gz
)

echo.
echo 🚀 Deploy complete! Your site will be live at:
echo https://hostamar-local.pages.dev
echo.
pause