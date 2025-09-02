#!/bin/bash
set -e

echo "🚀 Starting Marquardt Inventory Management System on WSL Ubuntu"
echo "================================================================="
echo "📦 Application: Node.js Inventory Management System"
echo "🗄️  Database: MySQL on WSL Ubuntu"
echo "🌐 Local access: http://localhost:3001"
echo "🌍 Global access via LocalTunnel"
echo "📊 Admin login: admin / password"
echo "================================================================="

# Check if MySQL is running
if ! systemctl is-active --quiet mysql; then
    echo "⚠️  MySQL is not running. Starting MySQL..."
    sudo systemctl start mysql
    echo "✅ MySQL started successfully"
else
    echo "✅ MySQL is already running"
fi

# Check database connection
echo "🔍 Checking database connection..."
if mysql -u sigma -psigma -e "USE product_management_system; SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed. Please check your MySQL setup."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
    echo "✅ Dependencies installed"
fi

# Create uploads directory if it doesn't exist
mkdir -p uploads/products
echo "📁 Created uploads directory"

# Start LocalTunnel in background
echo "🌐 Starting LocalTunnel for global access..."
lt --port 3001 --subdomain ${LT_SUBDOMAIN:-project-interns-app} &
LT_PID=$!
echo "✅ LocalTunnel started with PID: $LT_PID"
echo "🌍 Global URL: https://${LT_SUBDOMAIN:-project-interns-app}.loca.lt"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $LT_PID 2>/dev/null || true
    echo "✅ LocalTunnel stopped"
    echo "👋 Goodbye!"
    exit 0
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM

# Create admin user if it doesn't exist
echo "👤 Setting up admin user..."
node create-admin.js

# Start the application
echo "🚀 Starting the application..."
echo "================================================================="
echo "🌐 Local access: http://localhost:3001"
echo "🌍 Global access: https://${LT_SUBDOMAIN:-project-interns-app}.loca.lt"
echo "📊 Login: admin / password"
echo "================================================================="
echo "Press Ctrl+C to stop all services"
echo ""

# Start the Node.js application
node server.js
