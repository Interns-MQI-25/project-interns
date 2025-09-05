#!/bin/bash

# Marquardt Inventory Management System - Linux Service Uninstaller
# This script removes the systemd service and cleans up files

set -e

# Configuration
SERVICE_NAME="marquardt-inventory"
SERVICE_USER="marquardt"
APP_DIR="/opt/marquardt-inventory"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "🗑️ Uninstalling Marquardt Inventory Management System..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Stop and disable service
echo "⏹️ Stopping service..."
if systemctl is-active --quiet "$SERVICE_NAME"; then
    systemctl stop "$SERVICE_NAME"
    echo "✅ Service stopped"
fi

if systemctl is-enabled --quiet "$SERVICE_NAME"; then
    systemctl disable "$SERVICE_NAME"
    echo "✅ Service disabled"
fi

# Remove service file
if [ -f "$SERVICE_FILE" ]; then
    rm "$SERVICE_FILE"
    echo "✅ Service file removed"
fi

# Reload systemd
systemctl daemon-reload

# Remove application directory
if [ -d "$APP_DIR" ]; then
    echo "📁 Removing application directory..."
    rm -rf "$APP_DIR"
    echo "✅ Application files removed"
fi

# Remove service user
if id "$SERVICE_USER" &>/dev/null; then
    echo "👤 Removing service user..."
    userdel "$SERVICE_USER"
    echo "✅ User '$SERVICE_USER' removed"
fi

echo "✅ Uninstallation complete!"
echo ""
echo "📋 Manual cleanup (if needed):"
echo "- Database: DROP DATABASE product_management_system;"
echo "- Firewall: sudo ufw delete allow 3000"
echo "- Logs: sudo journalctl --vacuum-time=1d"