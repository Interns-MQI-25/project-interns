@echo off
setlocal EnableDelayedExpansion

echo Starting Marquardt Inventory Management System on Windows (Docker)
echo =================================================================
echo Application: Node.js Inventory Management System
echo Database: MySQL in Docker Container
echo Local access: http://localhost:3000
echo Global access: https://mqi-rdt.loca.lt
echo Admin login: admin / admin123
echo =================================================================

:: Check if Docker is running
echo Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not running
    echo    Please install Docker Desktop for Windows
    pause
    exit /b 1
) else (
    echo [OK] Docker is available
)

:: Stop any existing container
echo Stopping existing container...
docker rm -f project-interns-localtunnel >nul 2>&1

:: Build the Docker image
echo Building Docker image...
docker build -f Dockerfile.localtunnel -t project-interns:localtunnel .
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build Docker image
    pause
    exit /b 1
) else (
    echo [OK] Docker image built successfully
)

:: Run the container
echo Starting container...
docker run -d --name project-interns-localtunnel -e LT_SUBDOMAIN=mqi-rdt -p 3000:3000 project-interns:localtunnel
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start container
    pause
    exit /b 1
) else (
    echo [OK] Container started successfully
)

:: Wait for services to initialize
echo Waiting for services to initialize...
timeout /t 10 /nobreak >nul

:: Show container logs
echo Container logs:
docker logs project-interns-localtunnel

echo =================================================================
echo Local access: http://localhost:3000
echo Global access: https://mqi-rdt.loca.lt
echo Admin login: admin / admin123
echo =================================================================
echo.
echo Commands to manage the container:
echo   docker logs project-interns-localtunnel    (view logs)
echo   docker stop project-interns-localtunnel    (stop container)
echo   docker start project-interns-localtunnel   (start container)
echo   docker rm -f project-interns-localtunnel   (remove container)
echo.
echo Press any key to stop the container...
pause

:: Stop and remove container
echo Stopping container...
docker rm -f project-interns-localtunnel
echo [OK] Container stopped and removed
echo Goodbye!

pause
