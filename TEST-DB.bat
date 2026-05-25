@echo off
title Test Database Connection
color 0A
cls
echo.
echo ========================================
echo   DATABASE CONNECTION TEST
echo ========================================
echo.
echo This will test if your database connection works.
echo.
cd /d "C:\Users\romel\hostamar-local"

echo Checking .env file...
if exist .env (
    echo Found .env
    findstr /C:"DATABASE_URL" .env
) else (
    echo WARNING: .env not found
)

echo.
echo Testing Prisma connection...
echo.
node -e "const { prisma } = require('./lib/prisma'); prisma.\$connect().then(() => console.log('✓ Connected to database!')).catch(e => console.error('✗ Connection failed:', e.message))"

echo.
echo If connected, you'll see 'Connected to database!'
echo If failed, check DATABASE_URL is correct.
echo.
pause
