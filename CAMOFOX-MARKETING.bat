@echo off
chdir /d C:\Users\romel\hostamar-local
echo =========================================
echo  Camofox-Hostamar Marketing Research
echo =========================================
echo.

:: Check if Camofox node_modules exists
if not exist "camofox\node_modules" (
    echo [1/3] Installing Camofox dependencies...
    cd camofox && npm install --omit=optional
    if errorlevel 1 (
        echo ERROR: npm install failed. Retrying...
        npm install --omit=optional
    )
    cd ..
) else (
    echo [1/3] Camofox already installed
)

:: Start Camofox server in background
echo [2/3] Starting Camofox server on port 9377...
start "Camofox" cmd /c "cd camofox && npm start"
timeout /t 15 /nobreak >nul

:: Run marketing research
echo [3/3] Running marketing research tasks...
node camofox-hostamar.js

echo.
echo =========================================
echo  Done! Check camofox-research/ folder
echo =========================================
pause