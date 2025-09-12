@echo off
echo Checking Administrator privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrator privileges confirmed.
) else (
    echo ERROR: This script requires Administrator privileges!
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Installing Marquardt Inventory Management Service...
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js not found in PATH!
    echo Please ensure Node.js is installed and added to PATH
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('where node') do set NODE_PATH=%%i
echo Using Node.js: %NODE_PATH%

sc delete "MarquardtIMS" >nul 2>&1
sc create "MarquardtIMS" binPath= "\"%NODE_PATH%\" \"%~dp0server.js\"" start= auto DisplayName= "Marquardt Inventory Management"
if %errorLevel% == 0 (
    sc description "MarquardtIMS" "Marquardt India Inventory Management System"
    echo Service installed successfully!
    echo Starting service...
    sc start "MarquardtIMS"
    echo.
    echo Service Management Commands:
    echo   Start:  sc start MarquardtIMS
    echo   Stop:   sc stop MarquardtIMS
    echo   Delete: sc delete MarquardtIMS
    echo.
    echo Application will be available at: http://localhost:3000
) else (
    echo ERROR: Failed to create service!
)
pause