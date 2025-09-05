# PowerShell script for Windows LocalTunnel deployment
# Similar to startup-localtunnel.sh but for Windows
param(
    [string]$LTSubdomain = "mqi-rdt"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting All-in-One LocalTunnel Setup for Windows" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor White
Write-Host "Container includes: Node.js App + MySQL Database + LocalTunnel" -ForegroundColor Cyan
Write-Host "Local access: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Global access: https://$LTSubdomain.loca.lt" -ForegroundColor Yellow
Write-Host "Admin login: admin / admin123" -ForegroundColor Green
Write-Host "No signup required - instant public URL!" -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor White

try {
    # Check if Docker is available
    Write-Host "Checking Docker availability..." -ForegroundColor Blue
    docker --version | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not available. Please install Docker Desktop for Windows."
    }
    Write-Host "[OK] Docker is available" -ForegroundColor Green

    # Stop any existing container
    Write-Host "Stopping any existing containers..." -ForegroundColor Blue
    docker rm -f project-interns-localtunnel 2>$null | Out-Null

    # Build the Docker image
    Write-Host "Building Docker image with LocalTunnel..." -ForegroundColor Blue
    docker build -f Dockerfile.localtunnel -t project-interns:localtunnel .
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build Docker image"
    }
    Write-Host "[OK] Docker image built successfully" -ForegroundColor Green

    # Run the container with LocalTunnel
    Write-Host "Starting container with LocalTunnel..." -ForegroundColor Blue
    docker run -d --name project-interns-localtunnel `
        -e LT_SUBDOMAIN=$LTSubdomain `
        -e NODE_ENV=production `
        -p 3000:3000 `
        --restart unless-stopped `
        project-interns:localtunnel

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start container"
    }
    Write-Host "[OK] Container started successfully" -ForegroundColor Green

    # Wait for services to initialize
    Write-Host "Waiting for services to initialize..." -ForegroundColor Blue
    Start-Sleep -Seconds 15

    # Check container status
    $containerStatus = docker ps -f "name=project-interns-localtunnel" --format "table {{.Names}}\t{{.Status}}"
    Write-Host "Container Status:" -ForegroundColor Blue
    Write-Host $containerStatus -ForegroundColor White

    # Show initial logs
    Write-Host "Container logs:" -ForegroundColor Blue
    docker logs project-interns-localtunnel --tail 20

    Write-Host "========================================================" -ForegroundColor White
    Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor White
    Write-Host "Local access: http://localhost:3000" -ForegroundColor Yellow
    Write-Host "Global access: https://$LTSubdomain.loca.lt" -ForegroundColor Yellow
    Write-Host "Admin login: admin / admin123" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor White
    Write-Host ""
    Write-Host "Container Management Commands:" -ForegroundColor Cyan
    Write-Host "  View logs:    docker logs project-interns-localtunnel -f" -ForegroundColor White
    Write-Host "  Stop:         docker stop project-interns-localtunnel" -ForegroundColor White
    Write-Host "  Start:        docker start project-interns-localtunnel" -ForegroundColor White
    Write-Host "  Remove:       docker rm -f project-interns-localtunnel" -ForegroundColor White
    Write-Host "  Rebuild:      docker build -f Dockerfile.localtunnel -t project-interns:localtunnel ." -ForegroundColor White
    Write-Host ""
    Write-Host "Press Ctrl+C to stop monitoring or close this window to continue running..." -ForegroundColor Yellow

    # Monitor logs continuously
    Write-Host "Monitoring container logs (press Ctrl+C to stop)..." -ForegroundColor Blue
    docker logs project-interns-localtunnel -f

} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Make sure Docker Desktop is running" -ForegroundColor White
    Write-Host "2. Ensure Dockerfile.localtunnel exists in current directory" -ForegroundColor White
    Write-Host "3. Check if port 3000 is available" -ForegroundColor White
    Write-Host "4. Try running: docker system prune -f" -ForegroundColor White
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Cleanup function if script is interrupted
function Cleanup {
    Write-Host ""
    Write-Host "Cleaning up..." -ForegroundColor Yellow
    Write-Host "Container will continue running in the background." -ForegroundColor Green
    Write-Host "To stop it manually, run: docker stop project-interns-localtunnel" -ForegroundColor White
    exit 0
}

# Handle Ctrl+C gracefully
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Cleanup
}
