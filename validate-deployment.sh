#!/bin/bash

# =============================================================================
# DEPLOYMENT VALIDATION SCRIPT
# =============================================================================
# This script validates the environment before deployment

echo "🔍 Validating deployment environment..."

# Check if required files exist
required_files=(".env.deployment" "app.yaml" "server.js" "package.json")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo "❌ Missing required files:"
    printf '%s\n' "${missing_files[@]}"
    exit 1
fi

# Load environment variables
if [ -f ".env.deployment" ]; then
    export $(grep -v '^#' .env.deployment | xargs)
    echo "✅ Deployment environment loaded"
else
    echo "❌ .env.deployment file not found"
    exit 1
fi

# Validate environment variables
required_vars=("PROJECT_ID" "INSTANCE_NAME" "DEV_DB_HOST" "DEV_DB_USER" "DEV_DB_PASSWORD")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '%s\n' "${missing_vars[@]}"
    exit 1
fi

# Validate Google Cloud configuration
echo "🔍 Validating Google Cloud configuration..."

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ No active Google Cloud authentication found"
    echo "   Run: gcloud auth login"
    exit 1
fi

if ! gcloud projects describe "$PROJECT_ID" &>/dev/null; then
    echo "❌ Cannot access project: $PROJECT_ID"
    echo "   Check project ID and permissions"
    exit 1
fi

if ! gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
    echo "❌ Cannot access Cloud SQL instance: $INSTANCE_NAME"
    echo "   Check instance name and permissions"
    exit 1
fi

echo "✅ All validations passed!"
echo "📋 Deployment Summary:"
echo "   Project ID: $PROJECT_ID"
echo "   Cloud SQL Instance: $INSTANCE_NAME"
echo "   Database Host: $DEV_DB_HOST"
echo "   Database User: $DEV_DB_USER"
echo ""
echo "🚀 Ready for deployment!"
