@echo off
REM Local production deploy script for hostamar.com (Windows)
REM Builds, starts with PM2, and verifies

echo === Deploying Hostamar Platform ===
echo.

REM Step 1: Install dependencies
echo [1/6] Installing dependencies...
call npm ci --production=false
if %errorlevel% neq 0 (echo FAILED: npm install && exit /b 1)
echo.

REM Step 2: Run Prisma migrations
echo [2/6] Running Prisma migrations...
call npx prisma generate
if %errorlevel% neq 0 (echo FAILED: prisma generate && exit /b 1)
echo.

REM Step 3: Build the app
echo [3/6] Building Next.js app...
call npm run build
if %errorlevel% neq 0 (echo FAILED: npm run build && exit /b 1)
echo.

REM Step 4: Create logs directory
echo [4/6] Setting up log directories...
if not exist logs mkdir logs
if not exist data mkdir data
echo.

REM Step 5: Start with PM2
echo [5/6] Starting with PM2...
call pm2 delete hostamar 2>nul
call pm2 start ecosystem.config.js
call pm2 save
echo.

REM Step 6: Verify
echo [6/6] Verifying deployment...
timeout /t 3 /nobreak >nul
curl -s -o NUL -w "HTTP Status: %%{http_code}\n" http://localhost:3000

echo.
echo === Deployment Complete ===
echo.
echo App running at: http://localhost:3000
echo PM2 Dashboard: pm2 monit
echo PM2 Logs: pm2 logs hostamar
echo PM2 Status: pm2 status
echo.
echo To stop: pm2 stop hostamar
echo To restart: pm2 restart hostamar
