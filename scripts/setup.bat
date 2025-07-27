@echo off
setlocal enabledelayedexpansion

:: Product Management System Setup Script for Windows

echo Setting up Product Management System...
echo.

:: Install dependencies
echo Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo Error: Failed to install Node.js dependencies
    pause
    exit /b 1
)

:: Create necessary directories
echo Creating directories...
if not exist "public\css\dist" mkdir "public\css\dist"
if not exist "logs" mkdir "logs"

:: Build Tailwind CSS
echo Building Tailwind CSS...
:: Uncomment the line below if you want to build Tailwind CSS
:: call npx tailwindcss -i ./public/css/input.css -o ./public/css/dist/output.css --build

:: Setup database
echo.
echo Database setup instructions...
echo Connect to your MySQL server using a MySQL client.
echo.

:: Get MySQL credentials
set /p mysql_user="Enter MySQL username: "
set /p mysql_pass="Enter MySQL password: "
echo.

:: Create database and run setup scripts
echo Creating database and importing schema...
mysql -u %mysql_user% -p%mysql_pass% -e "CREATE DATABASE IF NOT EXISTS product_management_system; USE product_management_system; source database.sql;"

if errorlevel 1 (
    echo Error: Failed to create database or import schema
    echo Please check your MySQL credentials and ensure MySQL is running
    pause
    exit /b 1
)

echo.
echo Starting Product Management System...

:: Create admin account
echo Creating admin account...
call node create-admin.js
if errorlevel 1 (
    echo Warning: Failed to create admin account - you may need to do this manually
)

:: Setup database connection
echo Configuring database connection...
call node setup-db.js
if errorlevel 1 (
    echo Warning: Failed to setup database connection - check your configuration
)

:: Check if .env exists and create from example if not
if not exist ".env" (
    echo.
    echo Warning: .env file not found
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo Created .env from .env.example - please update with your database credentials
        echo.
        echo Please edit the .env file with your database credentials before continuing.
        echo Press any key when you have updated the .env file...
        pause >nul
    ) else (
        echo Error: .env.example not found
        echo Please create a .env file manually with your database configuration
        pause
        exit /b 1
    )
)

:: Start the application in development mode
echo.
echo Starting development server on port 3000...
echo.
echo Access the application at: http://localhost:3000
echo Default admin login: admin / admin
echo.
echo Press Ctrl+C to stop the server
echo.
call npm run dev

pause
