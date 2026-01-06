@echo off
title Marquardt IMS - Quick Global Access
echo Starting Marquardt IMS with global access...

REM Kill any existing process on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /PID %%a /F >nul 2>&1

REM Start the application
start /b npm start

REM Wait for app to start
timeout /t 8 /nobreak >nul

REM Try ngrok first (if available)
where ngrok >nul 2>&1
if %errorLevel% == 0 (
    echo Using ngrok for global access...
    ngrok http 3000
    goto end
)

REM Use LocalTunnel as fallback (simpler than Serveo)
echo Installing LocalTunnel...
npm install -g localtunnel >nul 2>&1
echo Creating global tunnel...
echo Your app will be available at: https://marquardt-ims.loca.lt
lt --port 3000 --subdomain marquardt-ims

:end
pause