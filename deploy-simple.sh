#!/bin/bash

# Simple Google App Engine deployment
echo "🚀 Deploying to Google App Engine..."

# Deploy the application
gcloud app deploy app.yaml --quiet

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🎉 Product editing feature is now live!"
else
    echo "❌ Deployment failed!"
    exit 1
fi
