#!/bin/bash
# ==============================================================================
# PUSH ALL DEPLOYMENT VARIANTS TO DOCKER HUB
# ==============================================================================

echo "🚀 Pushing All Deployment Variants to Docker Hub..."

# Docker Hub username
DOCKERHUB_USER="priyanshuksharma"
IMAGE_BASE="project-interns"
VERSION="v4.0.0"

# Tag and push all-in-one (basic)
echo "📤 1/4 Pushing basic all-in-one image..."
docker tag ${IMAGE_BASE}:all-in-one ${DOCKERHUB_USER}/${IMAGE_BASE}:all-in-one
docker tag ${IMAGE_BASE}:all-in-one ${DOCKERHUB_USER}/${IMAGE_BASE}:${VERSION}
docker push ${DOCKERHUB_USER}/${IMAGE_BASE}:all-in-one
docker push ${DOCKERHUB_USER}/${IMAGE_BASE}:${VERSION}

# Tag and push LocalTunnel variant
echo "📤 2/4 Pushing LocalTunnel variant..."
docker tag ${IMAGE_BASE}:localtunnel ${DOCKERHUB_USER}/${IMAGE_BASE}:localtunnel
docker tag ${IMAGE_BASE}:localtunnel ${DOCKERHUB_USER}/${IMAGE_BASE}:localtunnel-${VERSION}
docker push ${DOCKERHUB_USER}/${IMAGE_BASE}:localtunnel
docker push ${DOCKERHUB_USER}/${IMAGE_BASE}:localtunnel-${VERSION}

# Tag and push Ngrok variant
echo "📤 3/4 Pushing Ngrok variant..."
docker tag ${IMAGE_BASE}:ngrok ${DOCKERHUB_USER}/${IMAGE_BASE}:ngrok
docker tag ${IMAGE_BASE}:ngrok ${DOCKERHUB_USER}/${IMAGE_BASE}:ngrok-${VERSION}
docker push ${DOCKERHUB_USER}/${IMAGE_BASE}:ngrok
docker push ${DOCKERHUB_USER}/${IMAGE_BASE}:ngrok-${VERSION}

# Tag and push Cloudflare variant
echo "📤 4/4 Pushing Cloudflare variant..."
docker tag ${IMAGE_BASE}:cloudflare ${DOCKERHUB_USER}/${IMAGE_BASE}:cloudflare
docker tag ${IMAGE_BASE}:cloudflare ${DOCKERHUB_USER}/${IMAGE_BASE}:cloudflare-${VERSION}
docker push ${DOCKERHUB_USER}/${IMAGE_BASE}:cloudflare
docker push ${DOCKERHUB_USER}/${IMAGE_BASE}:cloudflare-${VERSION}

echo "🏁 All images pushed to Docker Hub!"
echo ""
echo "Available on Docker Hub:"
echo "🔗 https://hub.docker.com/r/${DOCKERHUB_USER}/${IMAGE_BASE}"
echo ""
echo "Usage examples:"
echo "# Basic (local access only):"
echo "docker run -d -p 3000:3000 ${DOCKERHUB_USER}/${IMAGE_BASE}:all-in-one"
echo ""
echo "# LocalTunnel (instant global access, no signup):"
echo "docker run -d -p 3000:3000 ${DOCKERHUB_USER}/${IMAGE_BASE}:localtunnel"
echo ""
echo "# Ngrok (global access with custom domains):"
echo "docker run -d -p 3000:3000 -e NGROK_AUTHTOKEN=your_token ${DOCKERHUB_USER}/${IMAGE_BASE}:ngrok"
echo ""
echo "# Cloudflare (permanent custom domain):"
echo "docker run -d -p 3000:3000 -e CLOUDFLARE_TUNNEL_TOKEN=your_token ${DOCKERHUB_USER}/${IMAGE_BASE}:cloudflare"
