#!/bin/bash
echo "Building Inventory Management System executable for Linux..."

# Check if pkg is installed globally
if ! command -v pkg &> /dev/null; then
    echo "Installing pkg globally..."
    npm install -g pkg
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build executable for Linux
echo "Building Linux executable..."
pkg server.js --targets node18-linux-x64 --output inventory-management-linux

echo "Build complete! inventory-management-linux created."
echo ""
echo "To run: ./inventory-management-linux"
echo "Make executable: chmod +x inventory-management-linux"