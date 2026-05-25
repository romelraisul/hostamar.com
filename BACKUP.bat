@echo off
title HOSTAMAR - Backup & Save
echo ============================================
echo    Hostamar Local Backup
echo ============================================
echo.
echo Backing up project to desktop...
echo.

set BACKUP_DIR=%USERPROFILE%\Desktop\hostamar-backup-%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Copy project files (exclude node_modules, .next, temp)
echo Copying source files...
xcopy /E /I /Y /Q "C:\Users\romel\hostamar-local" "%BACKUP_DIR%" ^
  /EXCLUDE:C:\Users\romel\hostamar-local\.backup-exclude.txt >nul 2>nul

:: Create exclude file
echo node_modules\.next\temp\camofox\.cache\*.db> "%TEMP%\backup-exclude.txt"

echo.
echo ✅ Backup complete!
echo 📁 Saved to: %BACKUP_DIR%
echo.
echo Files backed up: 
dir "%BACKUP_DIR%" /A-D /S /B 2>nul | find /c ":" 
echo.
pause