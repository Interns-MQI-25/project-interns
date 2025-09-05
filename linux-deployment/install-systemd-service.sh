#!/bin/bash

# Marquardt Inventory Management System - Linux Systemd Service Installation
# This script installs the application as a systemd service for automatic startup
# Compatible with WSL (Windows Subsystem for Linux)

set -e

# Configuration
SERVICE_NAME="marquardt-inventory"
SERVICE_USER="marquardt"
APP_DIR="/opt/marquardt-inventory"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
WSL_DETECTED=false

# Detect WSL environment
if grep -qi microsoft /proc/version 2>/dev/null || [ -n "${WSL_DISTRO_NAME}" ]; then
    WSL_DETECTED=true
    echo "🔍 WSL environment detected"
fi

echo "🚀 Installing Marquardt Inventory Management System as Linux Service..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# WSL-specific checks
if [ "$WSL_DETECTED" = true ]; then
    echo "⚠️  WSL detected - some systemd features may be limited"
    
    # Check if systemd is available in WSL
    if ! command -v systemctl &> /dev/null; then
        echo "❌ systemd not available in this WSL distribution"
        echo "💡 Consider using: sudo apt install systemd (Ubuntu) or enable systemd in WSL2"
        echo "🔄 Continuing with manual installation..."
    fi
fi

# Create service user
echo "👤 Creating service user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --home-dir "$APP_DIR" --shell /bin/false "$SERVICE_USER" 2>/dev/null || {
        echo "⚠️  Using adduser fallback for WSL compatibility"
        adduser --system --home "$APP_DIR" --shell /bin/false --disabled-login "$SERVICE_USER"
    }
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

# Detect Node.js path
NODE_PATH=$(which node || echo "/usr/bin/node")
if [ ! -f "$NODE_PATH" ]; then
    # Try common Node.js paths
    for path in /usr/local/bin/node /opt/node/bin/node ~/.nvm/versions/node/*/bin/node; do
        if [ -f "$path" ]; then
            NODE_PATH="$path"
            break
        fi
    done
fi
echo "🔍 Node.js path: $NODE_PATH"

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
ExecStart=$NODE_PATH server.js
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
if command -v systemctl &> /dev/null; then
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    echo "✅ Systemd service configured"
else
    echo "⚠️  systemctl not available - service file created but not enabled"
    echo "💡 To enable systemd in WSL2: echo '[boot]' | sudo tee -a /etc/wsl.conf && echo 'systemd=true' | sudo tee -a /etc/wsl.conf"
    echo "🔄 Then restart WSL: wsl --shutdown (from Windows)"
fi

echo "✅ Installation complete!"
echo ""
if [ "$WSL_DETECTED" = true ]; then
    echo "📋 WSL Next steps:"
    echo "1. Edit configuration: sudo nano $APP_DIR/.env"
    echo "2. Setup database: cd $APP_DIR && sudo -u $SERVICE_USER node setup-db.js"
    echo "3. Create admin users: sudo -u $SERVICE_USER node create-admin.js"
    if command -v systemctl &> /dev/null; then
        echo "4. Start service: sudo systemctl start $SERVICE_NAME"
        echo "5. Check status: sudo systemctl status $SERVICE_NAME"
    else
        echo "4. Manual start: cd $APP_DIR && sudo -u $SERVICE_USER $NODE_PATH server.js"
        echo "5. Or enable systemd in WSL2 and use: sudo systemctl start $SERVICE_NAME"
    fi
    echo ""
    echo "💡 WSL Tips:"
    echo "- To enable systemd: Add 'systemd=true' to /etc/wsl.conf under [boot] section"
    echo "- Restart WSL: wsl --shutdown (from Windows Command Prompt)"
    echo "- Access from Windows: http://localhost:3000"
else
    echo "📋 Next steps:"
    echo "1. Edit configuration: sudo nano $APP_DIR/.env"
    echo "2. Setup database: cd $APP_DIR && sudo -u $SERVICE_USER node setup-db.js"
    echo "3. Create admin users: sudo -u $SERVICE_USER node create-admin.js"
    echo "4. Start service: sudo systemctl start $SERVICE_NAME"
    echo "5. Check status: sudo systemctl status $SERVICE_NAME"
fi
echo ""
echo "🌐 Access: http://localhost:3000"
echo "🔑 Default login: GuddiS / Welcome@MQI"