@echo off
title Marquardt IMS - Global Access
echo Marquardt Inventory Management System - Global Access
echo ================================================

REM Kill any existing process on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /PID %%a /F >nul 2>&1

REM Check if ngrok is installed
where ngrok >nul 2>&1
if %errorLevel% neq 0 (
    echo Installing ngrok...
    powershell -Command "Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile 'ngrok.zip'"
    powershell -Command "Expand-Archive -Path 'ngrok.zip' -DestinationPath '.'"
    del ngrok.zip
    echo ngrok installed successfully!
)

echo Starting application...
start /b node server.js

REM Wait for app to start
timeout /t 5 /nobreak >nul

echo Creating global tunnel...
echo Your app will be accessible worldwide at the URL shown below:
echo ================================================
ngrok http 3000