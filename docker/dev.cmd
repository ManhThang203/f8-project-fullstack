@echo off
setlocal
cd /d "%~dp0\.."

echo Starting dev stack (hot reload, no rebuild on code edits^)...
docker compose -f docker\docker-compose.dev.yml --env-file docker\.env.docker up --build
if errorlevel 1 exit /b 1
exit /b 0
