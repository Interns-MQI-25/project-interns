@echo off
echo Building Inventory Management System executable...

REM Install pkg if not already installed
npm list -g pkg >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing pkg globally...
    npm install -g pkg
)

REM Install dependencies
echo Installing dependencies...
npm install

REM Build executable
echo Building executable...
pkg server.js --targets node18-win-x64 --output inventory-management.exe

echo Build complete! inventory-management.exe created.
echo.
echo To run: inventory-management.exe
pause