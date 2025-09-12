@echo off
title Marquardt IMS - Global Access Setup
color 0A

echo.
echo ========================================
echo   Marquardt IMS - Global Access Setup
echo ========================================
echo.

echo [1] ngrok (Recommended - Requires signup)
echo [2] Serveo (No signup required)
echo [3] Cloudflare Tunnel (Free, requires Cloudflare account)
echo [4] LocalTunnel (Simple, may be unstable)
echo [5] Start local only (localhost:3000)
echo.

set /p choice="Select option (1-5): "

if "%choice%"=="1" goto ngrok
if "%choice%"=="2" goto serveo
if "%choice%"=="3" goto cloudflare
if "%choice%"=="4" goto localtunnel
if "%choice%"=="5" goto local
goto invalid

:ngrok
echo.
echo Installing ngrok...
where ngrok >nul 2>&1
if %errorLevel% neq 0 (
    echo Downloading ngrok...
    powershell -Command "Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile 'ngrok.zip'"
    powershell -Command "Expand-Archive -Path 'ngrok.zip' -DestinationPath '.'"
    del ngrok.zip
)
echo.
echo Starting application and ngrok tunnel...
start /b npm start
timeout /t 5 /nobreak >nul
ngrok http 3000
goto end

:serveo
echo.
echo Starting application...
start /b npm start
timeout /t 5 /nobreak >nul
echo.
echo Creating Serveo tunnel...
echo Your app will be available at a random subdomain.serveo.net
ssh -R 80:localhost:3000 serveo.net
goto end

:cloudflare
echo.
echo Installing Cloudflare Tunnel...
where cloudflared >nul 2>&1
if %errorLevel% neq 0 (
    echo Downloading cloudflared...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)
echo.
echo Starting application...
start /b npm start
timeout /t 5 /nobreak >nul
echo.
echo Creating Cloudflare tunnel...
cloudflared tunnel --url http://localhost:3000
goto end

:localtunnel
echo.
echo Installing LocalTunnel...
npm install -g localtunnel
echo.
echo Starting application...
start /b npm start
timeout /t 5 /nobreak >nul
echo.
echo Creating LocalTunnel...
lt --port 3000 --subdomain marquardt-ims
goto end

:local
echo.
echo Starting application locally...
npm start
goto end

:invalid
echo Invalid choice. Please run the script again.
pause
goto end

:end
echo.
echo Press any key to exit...
pause >nul