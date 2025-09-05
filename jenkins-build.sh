#!/bin/bash
echo "🚀 Jenkins Build - Marquardt Inventory Management System"

# Install pkg globally
echo "📦 Installing pkg..."
sudo npm install -g pkg

# Install project dependencies
echo "📦 Installing dependencies..."
npm install pkg

# Build the standalone executable
echo "🔨 Building executable..."
chmod +x build-linux-standalone.sh
./build-linux-standalone.sh

# Verify build
if [ -f "marquardt-inventory-linux" ]; then
    echo "✅ Build successful!"
    echo "📦 Executable: marquardt-inventory-linux"
    ls -la marquardt-inventory-linux
else
    echo "❌ Build failed - executable not found"
    exit 1
fi

echo "🎉 Jenkins build complete!"