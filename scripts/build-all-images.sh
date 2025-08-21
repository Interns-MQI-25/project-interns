#!/bin/bash
# ==============================================================================
# BUILD ALL DEPLOYMENT VARIANTS
# ==============================================================================

echo "🚀 Building All Deployment Variants..."

# Build basic all-in-one (local access only)
echo "📦 1/4 Building basic all-in-one image..."
docker build -f Dockerfile.all-in-one -t project-interns:all-in-one .
if [ $? -eq 0 ]; then
    echo "✅ Basic all-in-one image built successfully"
else
    echo "❌ Failed to build basic all-in-one image"
fi

# Build LocalTunnel variant (easiest global access)
echo "📦 2/4 Building LocalTunnel variant..."
docker build -f Dockerfile.localtunnel -t project-interns:localtunnel .
if [ $? -eq 0 ]; then
    echo "✅ LocalTunnel image built successfully"
else
    echo "❌ Failed to build LocalTunnel image"
fi

# Build Ngrok variant
echo "📦 3/4 Building Ngrok variant..."
docker build -f Dockerfile.ngrok -t project-interns:ngrok .
if [ $? -eq 0 ]; then
    echo "✅ Ngrok image built successfully"
else
    echo "❌ Failed to build Ngrok image"
fi

# Build Cloudflare variant
echo "📦 4/4 Building Cloudflare variant..."
docker build -f Dockerfile.cloudflare -t project-interns:cloudflare .
if [ $? -eq 0 ]; then
    echo "✅ Cloudflare image built successfully"
else
    echo "❌ Failed to build Cloudflare image"
fi

echo "🏁 Build process completed!"
echo ""
echo "Available images:"
docker images | grep project-interns
