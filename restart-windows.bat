@echo off
echo 🔄 Restarting Marquardt Inventory Management System...
echo.

:: Kill existing processes
echo 🛑 Stopping existing services...
taskkill /f /im lt.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Restart the application
echo 🚀 Restarting application...
call startup-windows.bat

pause
