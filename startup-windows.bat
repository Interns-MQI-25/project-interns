@echo off
setlocal EnableDelayedExpansion

echo 🚀 Starting Marquardt Inventory Management System on Windows
echo =================================================================
echo 📦 Application: Node.js Inventory Management System
echo 🗄️  Database: MySQL on Windows
echo 🌐 Local access: http://localhost:3001
echo 🌍 Global access via LocalTunnel
echo 📊 Admin login: admin / password
echo =================================================================

:: Check if MySQL is running
echo 🔍 Checking MySQL service...
sc query mysql >nul 2>&1
if %errorlevel% equ 0 (
    sc query mysql | find "RUNNING" >nul
    if !errorlevel! equ 0 (
        echo ✅ MySQL is already running
    ) else (
        echo ⚠️  MySQL is not running. Starting MySQL...
        net start mysql
        if !errorlevel! equ 0 (
            echo ✅ MySQL started successfully
        ) else (
            echo ❌ Failed to start MySQL. Please start it manually.
            pause
            exit /b 1
        )
    )
) else (
    echo ❌ MySQL service not found. Please install and configure MySQL.
    pause
    exit /b 1
)

:: Wait a moment for MySQL to be ready
timeout /t 3 /nobreak >nul

:: Check database connection
echo 🔍 Checking database connection...
mysql -u sigma -psigma -e "USE product_management_system; SELECT 1;" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Database connection successful
) else (
    echo ❌ Database connection failed. Please check your MySQL setup.
    echo    Make sure MySQL is running and credentials are correct.
    pause
    exit /b 1
)

:: Check if Node.js is installed
echo 🔍 Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
)

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing Node.js dependencies...
    npm install
    if !errorlevel! equ 0 (
        echo ✅ Dependencies installed
    ) else (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Create uploads directory if it doesn't exist
if not exist "uploads\products" (
    mkdir uploads\products
    echo 📁 Created uploads directory
) else (
    echo 📁 Uploads directory already exists
)

:: Check if LocalTunnel is installed
echo 🔍 Checking LocalTunnel installation...
lt --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  LocalTunnel not found. Installing LocalTunnel globally...
    npm install -g localtunnel
    if !errorlevel! equ 0 (
        echo ✅ LocalTunnel installed successfully
    ) else (
        echo ❌ Failed to install LocalTunnel
        pause
        exit /b 1
    )
) else (
    echo ✅ LocalTunnel is installed
)

:: Start LocalTunnel in background
echo 🌐 Starting LocalTunnel for global access...
if "%LT_SUBDOMAIN%"=="" set LT_SUBDOMAIN=project-interns-app
start /b "" lt --port 3001 --subdomain %LT_SUBDOMAIN%
timeout /t 3 /nobreak >nul
echo ✅ LocalTunnel started
echo 🌍 Global URL: https://%LT_SUBDOMAIN%.loca.lt

:: Setup cleanup function
:: Create a temporary batch file for cleanup
echo @echo off > cleanup.bat
echo echo. >> cleanup.bat
echo echo 🛑 Shutting down services... >> cleanup.bat
echo taskkill /f /im lt.exe ^>nul 2^>^&1 >> cleanup.bat
echo taskkill /f /im node.exe ^>nul 2^>^&1 >> cleanup.bat
echo echo ✅ Services stopped >> cleanup.bat
echo echo 👋 Goodbye! >> cleanup.bat
echo del cleanup.bat >> cleanup.bat

:: Create admin user
echo 👤 Setting up admin user...
node create-admin.js
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Admin user setup may have issues, but continuing...
)

:: Start the application
echo 🚀 Starting the application...
echo =================================================================
echo 🌐 Local access: http://localhost:3001
echo 🌍 Global access: https://%LT_SUBDOMAIN%.loca.lt
echo 📊 Login credentials:
echo    Username: GuddiS ^| Password: Welcome@123
echo    Username: KatragaddaV ^| Password: Welcome@123
echo =================================================================
echo Press Ctrl+C to stop all services
echo.

:: Start the Node.js application
node server.js

:: If we get here, the application stopped
echo.
echo 🛑 Application stopped. Cleaning up...
call cleanup.bat

pause
