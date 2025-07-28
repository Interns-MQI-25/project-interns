# Product Management System Setup Script for Windows (PowerShell)

Write-Host "Setting up Product Management System..." -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
} catch {
    Write-Host "Error: Failed to install Node.js dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Create necessary directories
Write-Host "Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "public\css\dist" | Out-Null
New-Item -ItemType Directory -Force -Path "logs" | Out-Null

# Build Tailwind CSS
Write-Host "Building Tailwind CSS..." -ForegroundColor Yellow
# Uncomment the line below if you want to build Tailwind CSS
# npx tailwindcss -i ./public/css/input.css -o ./public/css/dist/output.css --build

# Setup database
Write-Host ""
Write-Host "Database setup instructions..." -ForegroundColor Cyan
Write-Host "Connect to your MySQL server using a MySQL client." -ForegroundColor Cyan
Write-Host ""

# Get MySQL credentials
$mysql_user = Read-Host "Enter MySQL username"
$mysql_pass = Read-Host "Enter MySQL password" -AsSecureString
$mysql_pass_plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($mysql_pass))

Write-Host ""

# Create database and run setup scripts
Write-Host "Creating database and importing schema..." -ForegroundColor Yellow
try {
    $query = "CREATE DATABASE IF NOT EXISTS product_management_system; USE product_management_system; source database.sql;"
    mysql -u $mysql_user -p$mysql_pass_plain -e $query
    if ($LASTEXITCODE -ne 0) { throw "Database setup failed" }
} catch {
    Write-Host "Error: Failed to create database or import schema" -ForegroundColor Red
    Write-Host "Please check your MySQL credentials and ensure MySQL is running" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting Product Management System..." -ForegroundColor Green

# Create admin account
Write-Host "Creating admin account..." -ForegroundColor Yellow
try {
    node create-admin.js
    if ($LASTEXITCODE -ne 0) { throw "Admin creation failed" }
} catch {
    Write-Host "Warning: Failed to create admin account - you may need to do this manually" -ForegroundColor Yellow
}

# Setup database connection
Write-Host "Configuring database connection..." -ForegroundColor Yellow
try {
    node setup-db.js
    if ($LASTEXITCODE -ne 0) { throw "Database connection setup failed" }
} catch {
    Write-Host "Warning: Failed to setup database connection - check your configuration" -ForegroundColor Yellow
}

# Check if .env exists and create from example if not
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "Warning: .env file not found" -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env from .env.example - please update with your database credentials" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please edit the .env file with your database credentials before continuing." -ForegroundColor Cyan
        Read-Host "Press Enter when you have updated the .env file"
    } else {
        Write-Host "Error: .env.example not found" -ForegroundColor Red
        Write-Host "Please create a .env file manually with your database configuration" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Start the application in development mode
Write-Host ""
Write-Host "Starting development server on port 3000..." -ForegroundColor Green
Write-Host ""
Write-Host "Access the application at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Default admin login: admin / admin" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm run dev

Read-Host "Press Enter to exit"
