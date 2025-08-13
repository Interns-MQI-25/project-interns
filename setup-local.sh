#!/bin/bash

# =============================================================================
# LOCAL DEVELOPMENT SETUP SCRIPT
# =============================================================================
# This script sets up the local development environment

echo "🚀 Setting up local development environment for Marquardt IMS..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version is $NODE_VERSION. Recommended version is 20+."
fi

# Check if MySQL is running
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL is not installed or not in PATH."
    echo "   Please install MySQL/MariaDB for local development."
else
    echo "✅ MySQL is available"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from .env.local..."
    cp .env.local .env
    echo "✅ .env file created. Please update database credentials if needed."
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Check if database exists
echo "🗄️  Checking database setup..."
if [ -f "setup-db.js" ]; then
    echo "   Database setup script found. Run 'npm run setup-db' to initialize database."
fi

# Check for required directories
echo "📁 Checking project structure..."
mkdir -p uploads/excel
mkdir -p temp
echo "✅ Required directories created"

# Display next steps
echo ""
echo "🎉 Local development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your database credentials"
echo "2. Start your MySQL/MariaDB server"
echo "3. Run 'npm run setup-db' to initialize the database"
echo "4. Run 'npm run dev' or 'npm start' to start the application"
echo ""
echo "For deployment to Google Cloud:"
echo "1. Ensure .env.deployment has correct values"
echo "2. Push changes to 'gcp-deploy-win' branch"
echo "3. GitHub Actions will handle deployment"
