#!/bin/bash

# Google App Engine Deployment Script for Product Edit Feature
# This script will deploy the new changes and run database migrations

echo "🚀 Starting Google App Engine deployment with database migration..."

# Step 1: Apply database migrations first
echo "📊 Step 1: Applying database migrations..."
echo "Please run the following SQL commands on your Google Cloud SQL instance:"
echo ""
echo "=== DATABASE MIGRATION COMMANDS ==="
cat sql/add-missing-columns.sql
echo "=== END OF MIGRATION COMMANDS ==="
echo ""
echo "You can run these commands using:"
echo "1. Google Cloud Console SQL Editor"
echo "2. Cloud SQL Proxy + MySQL client"
echo "3. gcloud sql connect command"
echo ""
read -p "Have you applied the database migrations? (y/n): " db_confirmed

if [ "$db_confirmed" != "y" ] && [ "$db_confirmed" != "Y" ]; then
    echo "❌ Please apply database migrations first before deploying"
    exit 1
fi

# Step 2: Deploy to App Engine
echo "📦 Step 2: Deploying to Google App Engine..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK (gcloud) is not installed"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with Google Cloud"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Deploy the application
echo "🚢 Deploying application..."
gcloud app deploy app.yaml --quiet

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🎉 Product editing feature has been deployed!"
    echo ""
    echo "New features added:"
    echo "- ✏️  Admin can edit product details"
    echo "- 📊 Excel export functionality"
    echo "- 🗄️  Database columns: description, updated_at"
    echo ""
    echo "To test the new features:"
    echo "1. Login as admin"
    echo "2. Go to Stock Management page"
    echo "3. Click 'Edit' button on any product"
    echo "4. Use 'Export to Excel' button"
    echo ""
    echo "Your app is available at:"
    gcloud app browse --no-launch-browser
else
    echo "❌ Deployment failed!"
    exit 1
fi
