#!/bin/bash

# Quick Start Script for Product Management System

echo "🚀 Starting Product Management System..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Please configure your database settings."
    echo "📝 Copy .env.example to .env and update with your database credentials"
fi

# Start the application in development mode
echo "🔧 Starting development server on port 3000..."
npm run dev
