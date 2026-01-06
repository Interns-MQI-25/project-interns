@echo off
echo Building Portable Inventory Management System...

REM Install dependencies including SQLite
echo Installing dependencies...
npm install

REM Initialize SQLite database
echo Setting up embedded database...
node setup-sqlite.js

REM Build portable executable
echo Building portable executable...
pkg server.js --targets node18-win-x64 --output inventory-management-portable.exe

echo.
echo ✅ Portable executable created: inventory-management-portable.exe
echo ✅ No external dependencies required
echo ✅ Database embedded
echo.
echo To run: inventory-management-portable.exe
echo Access: http://localhost:3000
pause