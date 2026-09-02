@echo off
REM pc-cloud-stop.bat — V31: free RAM for gaming/session use.
REM Stops OPTIONAL profiles (gaming, chat, browser, ide, hosting) but KEEPS:
REM   core (postgres/redis/app), ComfyUI, worker, tracker — pipeline survives.

echo === Hostamar PC-as-Cloud partial stop (core stays) ===
cd /d C:\Users\User\hostamar

docker compose -f docker-compose.all.yml --profile gaming stop
docker compose -f docker-compose.all.yml --profile chat stop
docker compose -f docker-compose.all.yml --profile browser stop
docker compose -f docker-compose.all.yml --profile ide stop
docker compose -f docker-compose.all.yml --profile hosting stop

echo Optional profiles stopped. Core (app+db+redis), ComfyUI, worker, tracker still running.
echo Full stop for shutdown: just power off — Task Scheduler re-starts everything next logon.
