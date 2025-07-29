#!/bin/bash

# Fresh App Engine Deployment Script for Product Management System
# Project ID: mqi-interns-467405

set -e  # Exit on any error

PROJECT_ID="mqi-interns-467405"
INSTANCE_NAME="product-management-db"
REGION="us-central1"
DATABASE_NAME="product_management_system"
DB_USER="sigma"

echo "🚀 Starting fresh deployment to Google App Engine..."
echo "📋 Project ID: $PROJECT_ID"

# Set the project
echo "🔧 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔌 Enabling required Google Cloud APIs..."
gcloud services enable appengine.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Check if App Engine app exists, if not create it
echo "🏗️ Checking App Engine application..."
if ! gcloud app describe &>/dev/null; then
    echo "Creating App Engine application in region us-central..."
    gcloud app create --region=us-central
fi

# Create Cloud SQL instance if it doesn't exist
echo "🗄️ Setting up Cloud SQL instance..."
if ! gcloud sql instances describe $INSTANCE_NAME &>/dev/null; then
    echo "Creating Cloud SQL instance: $INSTANCE_NAME"
    gcloud sql instances create $INSTANCE_NAME \
        --database-version=MYSQL_8_0 \
        --tier=db-f1-micro \
        --region=$REGION \
        --storage-type=SSD \
        --storage-size=10GB \
        --backup-start-time=03:00
    
    echo "⏳ Waiting for Cloud SQL instance to be ready..."
    gcloud sql instances patch $INSTANCE_NAME --no-backup
    
else
    echo "✅ Cloud SQL instance $INSTANCE_NAME already exists"
fi

# Create database if it doesn't exist
echo "🏛️ Setting up database..."
if ! gcloud sql databases describe $DATABASE_NAME --instance=$INSTANCE_NAME &>/dev/null; then
    echo "Creating database: $DATABASE_NAME"
    gcloud sql databases create $DATABASE_NAME --instance=$INSTANCE_NAME
else
    echo "✅ Database $DATABASE_NAME already exists"
fi

# Set up database user
echo "👤 Setting up database user..."
if ! gcloud sql users describe $DB_USER --instance=$INSTANCE_NAME &>/dev/null; then
    echo "Creating database user: $DB_USER"
    gcloud sql users create $DB_USER \
        --instance=$INSTANCE_NAME \
        --password=sigma
else
    echo "✅ Database user $DB_USER already exists"
    echo "🔄 Updating user password..."
    gcloud sql users set-password $DB_USER \
        --instance=$INSTANCE_NAME \
        --password=sigma
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Deploy to App Engine
echo "🚀 Deploying to App Engine..."
gcloud app deploy app.yaml --quiet

# Get the app URL
APP_URL=$(gcloud app browse --no-launch-browser)

echo ""
echo "🎉 Deployment completed successfully!"
echo "📱 Your app is available at: $APP_URL"
echo ""
echo "🔧 Next steps:"
echo "1. Visit $APP_URL/setup-database to initialize your database"
echo "2. Login with admin credentials:"
echo "   Email: admin@company.com"
echo "   Password: admin123"
echo ""
echo "📊 To view logs: gcloud app logs tail -s default"
echo "🗄️ Cloud SQL instance: $INSTANCE_NAME"
echo "🌐 Project console: https://console.cloud.google.com/appengine?project=$PROJECT_ID"
