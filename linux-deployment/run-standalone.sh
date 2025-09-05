#!/bin/bash

# Marquardt Inventory Management System - Standalone Runner
# This script runs the standalone Linux executable with proper configuration

EXECUTABLE="./marquardt-inventory-linux"
CONFIG_FILE=".env"

echo "🚀 Starting Marquardt Inventory Management System..."

# Check if executable exists
if [ ! -f "$EXECUTABLE" ]; then
    echo "❌ Executable not found: $EXECUTABLE"
    echo "💡 Build it first: npm run build-linux-standalone"
    exit 1
fi

# Make sure it's executable
chmod +x "$EXECUTABLE"

# Create default .env if it doesn't exist
if [ ! -f "$CONFIG_FILE" ]; then
    echo "📝 Creating default configuration..."
    cat > "$CONFIG_FILE" << EOF
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=sigma
DB_PASSWORD=sigma
DB_NAME=product_management_system
SESSION_SECRET=linux-standalone-secret-$(date +%s)
EOF
    echo "✅ Configuration created: $CONFIG_FILE"
fi

# Check if running as root (for port 80/443)
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Running as root - consider using a non-privileged user"
fi

# Get local IP for network access
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "📋 System Information:"
echo "   OS: $(uname -s) $(uname -r)"
echo "   Architecture: $(uname -m)"
echo "   Local IP: $LOCAL_IP"
echo ""

echo "🌐 Access URLs:"
echo "   Local: http://localhost:3000"
echo "   Network: http://$LOCAL_IP:3000"
echo ""

echo "🔑 Default Login:"
echo "   Username: GuddiS"
echo "   Password: Welcome@MQI"
echo ""

echo "📊 Starting application..."
echo "   Press Ctrl+C to stop"
echo "   Logs will appear below:"
echo ""

# Run the executable
exec "$EXECUTABLE"