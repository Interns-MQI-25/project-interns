# Linux Deployment Guide

## 🐧 Overview
This directory contains scripts for deploying the Marquardt Inventory Management System on Linux servers using systemd services.

## 📋 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+, CentOS 8+, or similar Linux distribution
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: 1GB free space
- **Network**: Internet connection for package installation

### Software Requirements
- **Node.js** v18+ (`curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`)
- **MySQL Server** 8.0+ (`sudo apt install mysql-server`)
- **Git** (optional) (`sudo apt install git`)
- **Root/sudo privileges** required

## 🚀 Quick Installation

### Method 1: Automated Installation
```bash
# Clone repository
git clone https://github.com/Interns-MQI-25/project-interns.git
cd project-interns/linux-deployment

# Make scripts executable
chmod +x *.sh

# Install as systemd service
sudo ./install-systemd-service.sh
```

### Method 2: Executable Build
```bash
# Build Linux executable
chmod +x ../build-linux.sh
../build-linux.sh

# Run directly
./inventory-management-linux
```

## 🔧 Service Management

### Using Management Script
```bash
# Make management script executable
chmod +x manage-service.sh

# Start service
./manage-service.sh start

# Check status
./manage-service.sh status

# View logs
./manage-service.sh logs

# Stop service
./manage-service.sh stop

# Restart service
./manage-service.sh restart
```

### Using systemctl Commands
```bash
# Start service
sudo systemctl start marquardt-inventory

# Stop service
sudo systemctl stop marquardt-inventory

# Restart service
sudo systemctl restart marquardt-inventory

# Check status
sudo systemctl status marquardt-inventory

# Enable auto-start
sudo systemctl enable marquardt-inventory

# Disable auto-start
sudo systemctl disable marquardt-inventory
```

## 📊 Service Information

### Service Details
- **Service Name**: `marquardt-inventory`
- **User**: `marquardt` (system user)
- **Directory**: `/opt/marquardt-inventory`
- **Port**: `3000`
- **Auto-start**: Enabled by default

### File Locations
- **Service File**: `/etc/systemd/system/marquardt-inventory.service`
- **Application**: `/opt/marquardt-inventory/`
- **Configuration**: `/opt/marquardt-inventory/.env`
- **Logs**: `journalctl -u marquardt-inventory`

## 🌐 Network Configuration

### Firewall Setup (Ubuntu/Debian)
```bash
# Allow port 3000
sudo ufw allow 3000

# Check firewall status
sudo ufw status
```

### Firewall Setup (CentOS/RHEL)
```bash
# Allow port 3000
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Check firewall status
sudo firewall-cmd --list-ports
```

### Access URLs
- **Local**: http://localhost:3000
- **Network**: http://[SERVER_IP]:3000
- **Example**: http://192.168.1.100:3000

## 🗄️ Database Setup

### MySQL Configuration
```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database user
sudo mysql -e "CREATE USER 'sigma'@'localhost' IDENTIFIED BY 'sigma';"
sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO 'sigma'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Setup application database
cd /opt/marquardt-inventory
sudo -u marquardt node setup-db.js
sudo -u marquardt node create-admin.js
```

## 📝 Configuration

### Environment Variables
Edit `/opt/marquardt-inventory/.env`:
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=sigma
DB_PASSWORD=sigma
DB_NAME=product_management_system
SESSION_SECRET=your-secret-key-here
```

### Service Configuration
Edit `/etc/systemd/system/marquardt-inventory.service` if needed, then:
```bash
sudo systemctl daemon-reload
sudo systemctl restart marquardt-inventory
```

## 📊 Monitoring and Logs

### View Logs
```bash
# Recent logs
sudo journalctl -u marquardt-inventory -n 50

# Follow logs in real-time
sudo journalctl -u marquardt-inventory -f

# Logs since boot
sudo journalctl -u marquardt-inventory -b

# Logs for specific date
sudo journalctl -u marquardt-inventory --since "2024-01-01"
```

### System Monitoring
```bash
# Check service status
systemctl is-active marquardt-inventory

# Check if service is enabled
systemctl is-enabled marquardt-inventory

# Check port usage
sudo netstat -tlnp | grep :3000

# Check process
ps aux | grep node
```

## 🔄 Updates and Maintenance

### Update Application
```bash
# Stop service
sudo systemctl stop marquardt-inventory

# Backup current version
sudo cp -r /opt/marquardt-inventory /opt/marquardt-inventory.backup

# Update files (if using git)
cd /opt/marquardt-inventory
sudo -u marquardt git pull origin main
sudo -u marquardt npm install --production

# Update database (if needed)
sudo -u marquardt node setup-db.js

# Start service
sudo systemctl start marquardt-inventory
```

### Database Backup
```bash
# Create backup
mysqldump -u sigma -p product_management_system > backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u sigma -p product_management_system < backup_20241201.sql
```

## 🛠️ Troubleshooting

### Service Won't Start
```bash
# Check service status
sudo systemctl status marquardt-inventory

# Check logs for errors
sudo journalctl -u marquardt-inventory -n 20

# Check if port is available
sudo netstat -tlnp | grep :3000

# Test manual start
cd /opt/marquardt-inventory
sudo -u marquardt node server.js
```

### Database Connection Issues
```bash
# Test MySQL connection
mysql -u sigma -p -e "SHOW DATABASES;"

# Check MySQL service
sudo systemctl status mysql

# Restart MySQL
sudo systemctl restart mysql
```

### Permission Issues
```bash
# Fix file permissions
sudo chown -R marquardt:marquardt /opt/marquardt-inventory

# Check user exists
id marquardt

# Check service user permissions
sudo -u marquardt whoami
```

## 🗑️ Uninstallation

### Complete Removal
```bash
# Run uninstall script
sudo ./uninstall-systemd-service.sh

# Manual cleanup (if needed)
sudo rm -rf /opt/marquardt-inventory
sudo userdel marquardt
sudo rm /etc/systemd/system/marquardt-inventory.service
sudo systemctl daemon-reload
```

## 🔐 Security Best Practices

### System Security
1. **Firewall**: Only allow necessary ports
2. **Updates**: Keep system packages updated
3. **User**: Service runs as non-root user
4. **Permissions**: Restricted file permissions
5. **SSL**: Use reverse proxy (nginx/apache) for HTTPS

### Application Security
1. **Passwords**: Change default admin passwords
2. **Session**: Use strong session secrets
3. **Database**: Limit database user privileges
4. **Network**: Restrict network access if needed
5. **Logs**: Monitor access logs regularly

## 📞 Support

### Log Locations
- **Service Logs**: `journalctl -u marquardt-inventory`
- **System Logs**: `/var/log/syslog`
- **MySQL Logs**: `/var/log/mysql/error.log`

### Common Commands
```bash
# Service management
./manage-service.sh [start|stop|restart|status|logs]

# Check system resources
htop
df -h
free -h

# Network diagnostics
ss -tlnp | grep :3000
curl -I http://localhost:3000
```

### Getting Help
1. Check service logs first
2. Verify database connectivity
3. Test network access
4. Check system resources
5. Review configuration files