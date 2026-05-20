@echo off
setlocal
cd /d "%~dp0\.."

echo [1/2] docker compose build (no cache^)...
docker compose -f docker\docker-compose.yml --env-file docker\.env.docker build --no-cache
if errorlevel 1 exit /b 1

echo [2/2] docker compose up -d --build...
docker compose -f docker\docker-compose.yml --env-file docker\.env.docker up -d --build
if errorlevel 1 exit /b 1

echo Done.
exit /b 0
