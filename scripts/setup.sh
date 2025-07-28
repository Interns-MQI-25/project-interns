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
# npx tailwindcss -i ./public/css/input.css -o ./public/css/dist/output.css --watch &

# Setup database
echo "Database setup instructions..."
echo "Connect to your MySQL server using a MySQL client."

read -p "Enter MySQL username: " mysql_user
read -sp "Enter MySQL password: " mysql_pass
echo # Add newline after password input

# Create database and run setup scripts
mysql -u "$mysql_user" -p"$mysql_pass" << EOF
CREATE DATABASE IF NOT EXISTS product_management_system;
USE product_management_system;
source database.sql;
EOF

echo "Starting Product Management System..."

# Moving out of scripts directory
cd ..


# Create admin account
echo "Creating admin account..."
node create-admin.js

# Setup database connection
echo "Configuring database connection..."
node setup-db.js

# Check if .env exists and create from example if not

if [ ! -f .env ]; then
    echo "Warning: .env file not found"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Created .env from .env.example - please update with your database credentials"
    else
        echo "Error: .env.example not found"
        exit 1
    fi
fi

# Start the application in development mode
echo "Starting development server on port 3000..."
npm run dev
