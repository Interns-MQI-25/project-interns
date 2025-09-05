@echo off
echo Enabling Network Access for Inventory Management System...

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Run as Administrator
    pause
    exit /b 1
)

REM Add Windows Firewall rule
echo Adding firewall rule...
netsh advfirewall firewall add rule name="Inventory Management System" dir=in action=allow protocol=TCP localport=3000

REM Get server IP address
setlocal enabledelayedexpansion
echo.
echo Network Configuration Complete!
echo ========================================
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "ip=%%a"
    set "ip=!ip: =!"
    echo Network Access: http://!ip!:3000
    goto :done
)
:done
echo ========================================
pause