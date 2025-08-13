# =============================================================================
# LOCAL DEVELOPMENT SETUP SCRIPT (PowerShell)
# =============================================================================
# This script sets up the local development environment on Windows

Write-Host "🚀 Setting up local development environment for Marquardt IMS..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 20+ first." -ForegroundColor Red
    exit 1
}

# Check if MySQL is available
try {
    mysql --version | Out-Null
    Write-Host "✅ MySQL is available" -ForegroundColor Green
} catch {
    Write-Host "⚠️  MySQL is not installed or not in PATH." -ForegroundColor Yellow
    Write-Host "   Please install MySQL/MariaDB for local development." -ForegroundColor Yellow
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from .env.local..." -ForegroundColor Blue
    Copy-Item ".env.local" ".env"
    Write-Host "✅ .env file created. Please update database credentials if needed." -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Install dependencies
Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Blue
npm install

# Check if database exists
Write-Host "🗄️  Checking database setup..." -ForegroundColor Blue
if (Test-Path "setup-db.js") {
    Write-Host "   Database setup script found. Run 'npm run setup-db' to initialize database." -ForegroundColor Gray
}

# Check for required directories
Write-Host "📁 Checking project structure..." -ForegroundColor Blue
New-Item -ItemType Directory -Path "uploads/excel" -Force | Out-Null
New-Item -ItemType Directory -Path "temp" -Force | Out-Null
Write-Host "✅ Required directories created" -ForegroundColor Green

# Display next steps
Write-Host ""
Write-Host "🎉 Local development environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Update .env file with your database credentials" -ForegroundColor Gray
Write-Host "2. Start your MySQL/MariaDB server" -ForegroundColor Gray
Write-Host "3. Run 'npm run setup-db' to initialize the database" -ForegroundColor Gray
Write-Host "4. Run 'npm run dev' or 'npm start' to start the application" -ForegroundColor Gray
Write-Host ""
Write-Host "For deployment to Google Cloud:" -ForegroundColor White
Write-Host "1. Ensure .env.deployment has correct values" -ForegroundColor Gray
Write-Host "2. Push changes to 'gcp-deploy-win' branch" -ForegroundColor Gray
Write-Host "3. GitHub Actions will handle deployment" -ForegroundColor Gray
