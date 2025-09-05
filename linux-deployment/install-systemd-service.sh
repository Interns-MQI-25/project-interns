#!/bin/bash

# Marquardt Inventory Management System - Linux Systemd Service Installation
# This script installs the application as a systemd service for automatic startup

set -e

# Configuration
SERVICE_NAME="marquardt-inventory"
SERVICE_USER="marquardt"
APP_DIR="/opt/marquardt-inventory"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "🚀 Installing Marquardt Inventory Management System as Linux Service..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Create service user
echo "👤 Creating service user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --home-dir "$APP_DIR" --shell /bin/false "$SERVICE_USER"
    echo "✅ User '$SERVICE_USER' created"
else
    echo "✅ User '$SERVICE_USER' already exists"
fi

# Create application directory
echo "📁 Creating application directory..."
mkdir -p "$APP_DIR"
chown "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"

# Copy application files
echo "📋 Copying application files..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Copy essential files
cp -r "$PROJECT_DIR"/{server.js,package.json,package-lock.json,views,public,src,sql,images} "$APP_DIR/"
cp "$PROJECT_DIR/.env.example" "$APP_DIR/.env"

# Set ownership
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"

# Install Node.js dependencies
echo "📦 Installing dependencies..."
cd "$APP_DIR"
sudo -u "$SERVICE_USER" npm install --production

# Create systemd service file
echo "⚙️ Creating systemd service..."
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Marquardt Inventory Management System
Documentation=https://github.com/Interns-MQI-25/project-interns
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Environment variables
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DB_HOST=localhost
Environment=DB_USER=sigma
Environment=DB_PASSWORD=sigma
Environment=DB_NAME=product_management_system
Environment=SESSION_SECRET=linux-production-secret-key-2025

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
echo "🔄 Configuring systemd..."
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit configuration: sudo nano $APP_DIR/.env"
echo "2. Setup database: cd $APP_DIR && sudo -u $SERVICE_USER node setup-db.js"
echo "3. Create admin users: sudo -u $SERVICE_USER node create-admin.js"
echo "4. Start service: sudo systemctl start $SERVICE_NAME"
echo "5. Check status: sudo systemctl status $SERVICE_NAME"
echo ""
echo "🌐 Access: http://localhost:3000"
echo "🔑 Default login: GuddiS / Welcome@MQI"