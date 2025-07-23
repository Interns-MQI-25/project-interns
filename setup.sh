#!/bin/bash

# Product Management System Setup Script

echo "Setting up Product Management System..."

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Create necessary directories
echo "Creating directories..."
mkdir -p public/css/dist
mkdir -p logs

# Build Tailwind CSS
echo "Building Tailwind CSS..."
npx tailwindcss -i ./public/css/input.css -o ./public/css/dist/output.css --watch &

# Setup database (you'll need to run this manually in MySQL)
echo "Database setup instructions:"
echo "1. Create a MySQL database named 'product_management_system'"
echo "2. Run the SQL script in database.sql"
echo "3. Update the .env file with your database credentials"

echo "Setup complete!"
echo "To start the development server, run: npm run dev"
