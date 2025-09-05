@echo off
echo ========================================
echo  Marquardt Inventory Management System
echo  Windows Service Uninstallation
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

echo Stopping service...
net stop "Marquardt Inventory Management" 2>nul

echo Uninstalling Windows Service...
node uninstall-service.js

echo.
echo ========================================
echo  Uninstallation Complete!
echo ========================================
echo Service removed successfully
echo Application files remain in current directory
echo ========================================
pause