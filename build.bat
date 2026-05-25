@echo off
echo =========================================
echo Building Hostamar Platform
echo =========================================
cd /d %~dp0

echo.
echo [1/4] Installing npm dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo WARNING: Prisma generate had issues, continuing...
)

echo.
echo [3/4] Building Next.js project...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Starting production server...
echo Server will run at http://localhost:3000
echo.
call npm run start

pause