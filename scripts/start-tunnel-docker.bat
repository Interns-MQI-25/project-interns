@echo off
echo Starting Project Interns Application...
echo.

echo Step 1: Starting Docker containers...
docker-compose --profile dev up -d

echo.
echo Step 2: Waiting for application to be ready...
timeout /t 10 /nobreak > nul

echo.
echo Step 3: Starting LocalTunnel (if available)...
echo If LocalTunnel fails, try these alternatives:
echo.
echo Alternative 1 - ngrok:
echo   ngrok http 3000 --domain=bright-pleasing-marlin.ngrok-free.app
echo.
echo Alternative 2 - LocalTunnel:
echo   lt --port 3000 --subdomain project-interns-app
echo.
echo Alternative 3 - Serveo (if working):
echo   ssh -R 80:localhost:3000 serveo.net
echo.

echo Current Status:
echo - Local App: http://localhost:3000
echo - Database: localhost:3307
echo - Admin Login: admin1/admin123
echo.

rem Try LocalTunnel first
echo Attempting LocalTunnel...
lt --port 3000 --subdomain project-interns-app

pause
