#!/bin/bash

# Marquardt Inventory Management System - Service Management Script
# Provides easy commands to manage the Linux systemd service

SERVICE_NAME="marquardt-inventory"
APP_DIR="/opt/marquardt-inventory"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if service exists
check_service() {
    if ! systemctl list-unit-files | grep -q "$SERVICE_NAME"; then
        print_error "Service '$SERVICE_NAME' not found. Please install first."
        exit 1
    fi
}

# Function to show service status
show_status() {
    check_service
    echo "=== Service Status ==="
    systemctl status "$SERVICE_NAME" --no-pager
    echo ""
    echo "=== Service Info ==="
    echo "Service Name: $SERVICE_NAME"
    echo "App Directory: $APP_DIR"
    echo "Service File: /etc/systemd/system/${SERVICE_NAME}.service"
}

# Function to start service
start_service() {
    check_service
    print_status "Starting $SERVICE_NAME..."
    sudo systemctl start "$SERVICE_NAME"
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_success "Service started successfully"
        echo "🌐 Access: http://localhost:3000"
    else
        print_error "Failed to start service"
        exit 1
    fi
}

# Function to stop service
stop_service() {
    check_service
    print_status "Stopping $SERVICE_NAME..."
    sudo systemctl stop "$SERVICE_NAME"
    if ! systemctl is-active --quiet "$SERVICE_NAME"; then
        print_success "Service stopped successfully"
    else
        print_error "Failed to stop service"
        exit 1
    fi
}

# Function to restart service
restart_service() {
    check_service
    print_status "Restarting $SERVICE_NAME..."
    sudo systemctl restart "$SERVICE_NAME"
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_success "Service restarted successfully"
        echo "🌐 Access: http://localhost:3000"
    else
        print_error "Failed to restart service"
        exit 1
    fi
}

# Function to enable service
enable_service() {
    check_service
    print_status "Enabling $SERVICE_NAME for auto-start..."
    sudo systemctl enable "$SERVICE_NAME"
    print_success "Service enabled for auto-start"
}

# Function to disable service
disable_service() {
    check_service
    print_status "Disabling $SERVICE_NAME auto-start..."
    sudo systemctl disable "$SERVICE_NAME"
    print_success "Service auto-start disabled"
}

# Function to show logs
show_logs() {
    check_service
    echo "=== Recent Logs (last 50 lines) ==="
    sudo journalctl -u "$SERVICE_NAME" -n 50 --no-pager
    echo ""
    echo "=== Follow Logs (Ctrl+C to exit) ==="
    sudo journalctl -u "$SERVICE_NAME" -f
}

# Function to show help
show_help() {
    echo "Marquardt Inventory Management System - Service Manager"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start the service"
    echo "  stop      Stop the service"
    echo "  restart   Restart the service"
    echo "  status    Show service status"
    echo "  enable    Enable auto-start on boot"
    echo "  disable   Disable auto-start on boot"
    echo "  logs      Show service logs"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 status"
    echo "  $0 logs"
}

# Main script logic
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    enable)
        enable_service
        ;;
    disable)
        disable_service
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac