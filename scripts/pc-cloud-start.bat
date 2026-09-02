@echo off
REM pc-cloud-start.bat — V31 PC-as-Cloud NO-MONEY-PLAN boot script.
REM Starts: core docker profile, ComfyUI 8B, hunyuan worker, cloud tracker.
REM Task Scheduler runs this at logon; double-click works too.

echo === Hostamar PC-as-Cloud start ===

REM 1) Core docker services (postgres, redis, hostamar-app)
cd /d C:\Users\User\hostamar
docker compose -f docker-compose.all.yml --profile core up -d
if errorlevel 1 echo [warn] core compose failed - docker desktop may be starting

REM 2) ComfyUI (HunyuanVideo 1.5 8B fp8) — only if not already up
curl.exe -s -o NUL -w "%%{http_code}" http://127.0.0.1:8188/system_stats 2>NUL | findstr 200 >NUL
if errorlevel 1 (
  echo [start] ComfyUI...
  start "ComfyUI-8B" /min cmd /c "cd /d C:\ComfyUI_Download\ComfyUI && C:\Users\User\qwen\python_embeded\python.exe -s main.py --listen 127.0.0.1 --port 8188 > C:\tmp\comfyui-boot.log 2>&1"
) else (
  echo [ok] ComfyUI already up
)

REM 3) Hunyuan worker (wait 20s for ComfyUI model warm-up window)
timeout /t 20 /nobreak >NUL
powershell -NoProfile -Command "Set-Location C:\Users\User\hostamar; Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'scripts\comfyui-hunyuan-worker.mjs' -RedirectStandardOutput 'C:\tmp\worker-v30.log' -RedirectStandardError 'C:\tmp\worker-v30.err.log' -WindowStyle Hidden"
if exist C:\tmp\worker-v30.log del C:\tmp\worker-v30.log

REM 4) Cloud tracker (V31) — port 3006
powershell -NoProfile -Command "Set-Location C:\Users\User\hostamar; Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'scripts\cloud-tracker.mjs' -RedirectStandardOutput 'C:\tmp\cloud-tracker.log' -RedirectStandardError 'C:\tmp\cloud-tracker.err.log' -WindowStyle Hidden"

echo === done: core up, ComfyUI up, worker polling, tracker on :3006 ===
echo Queue renders auto-resume. Dashboard: https://hostamar.com/dashboard/cloud
