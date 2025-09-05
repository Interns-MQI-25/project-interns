@echo off
echo ========================================
echo  Marquardt Inventory Management System
echo  Windows Service Installation
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrator privileges confirmed
) else (
    echo ERROR: This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Installing dependencies...
cd ..
npm install
cd deployment

echo Installing Windows Service...
node install-service.js

echo.
echo ========================================
echo  Installation Complete!
echo ========================================
echo Application URL: http://localhost:3000

setlocal enabledelayedexpansion
echo Getting server IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "ip=%%a"
    set "ip=!ip: =!"
    echo Network Access: http://!ip!:3000
    goto :ipdone
)
:ipdone

echo Default Login: admin / admin123
echo.
echo Service Management:
echo    - Start: net start "Marquardt Inventory Management"
echo    - Stop:  net stop "Marquardt Inventory Management"
echo    - Status: sc query "Marquardt Inventory Management"
echo.
echo To uninstall: run uninstall-service.bat as Administrator
echo ========================================
pause