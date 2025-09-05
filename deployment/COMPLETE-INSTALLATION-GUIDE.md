# Complete Installation & Management Guide

## 🎯 Overview
This guide provides step-by-step instructions for installing, configuring, and managing the Marquardt Inventory Management System as a Windows Service.

## 📋 Prerequisites

### System Requirements
- **OS**: Windows Server 2016+ or Windows 10+
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: 1GB free space (SSD recommended)
- **Network**: Ethernet connection for global access

### Software Requirements
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **MySQL Server** 8.0+ ([Download](https://dev.mysql.com/downloads/))
- **Git** (optional) ([Download](https://git-scm.com/))
- **Administrator privileges** required

## 🚀 Complete Installation Process

### Step 1: Download and Setup Project

#### Option A: Git Clone (Recommended)
```cmd
git clone https://github.com/Interns-MQI-25/project-interns.git
cd project-interns
```

#### Option B: Manual Download
1. Download ZIP from GitHub
2. Extract to `C:\project-interns\`
3. Open Command Prompt as Administrator
4. Navigate to project folder: `cd C:\project-interns`

### Step 2: Install Dependencies
```cmd
# Install Node.js dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 3: Database Configuration

#### Configure Environment Variables
```cmd
# Copy environment template
copy .env.example .env

# Edit .env file with your database credentials
notepad .env
```

#### Update .env file:
```env
NODE_ENV=development
DB_HOST=localhost
DB_USER=sigma
DB_PASSWORD=sigma
DB_NAME=product_management_system
PORT=3000
```

#### Setup Database
```cmd
# Create database and tables
node setup-db.js

# Create admin users
node create-admin.js

# (Optional) Setup HIL Labs
mysql -u sigma -psigma product_management_system < sql\hil_labs_schema.sql
```

### Step 4: Install Windows Service

#### Automatic Installation
```cmd
# Navigate to deployment folder
cd deployment

# Run installation script as Administrator
install-service.bat
```

#### Manual Installation
```cmd
# Install service manually
node install-service.js

# Verify service installation
sc query "marquardtinventorymanagement.exe"
```

### Step 5: Configure Network Access
```cmd
# Run network configuration as Administrator
enable-network-access.bat

# Manual firewall configuration
netsh advfirewall firewall add rule name="IMS Port 3000" dir=in action=allow protocol=TCP localport=3000
```

### Step 6: Start the Service
```cmd
# Start the service
net start "marquardtinventorymanagement.exe"

# Verify service is running
sc query "marquardtinventorymanagement.exe"

# Check if port is listening
netstat -an | findstr :3000
```

## 🔧 Service Management Commands

### Start Service
```cmd
# Method 1: Using net command
net start "marquardtinventorymanagement.exe"

# Method 2: Using sc command
sc start "marquardtinventorymanagement.exe"

# Method 3: Using Services GUI
services.msc
# Find "Marquardt Inventory Management" → Right-click → Start
```

### Stop Service
```cmd
# Method 1: Using net command
net stop "marquardtinventorymanagement.exe"

# Method 2: Using sc command
sc stop "marquardtinventorymanagement.exe"

# Method 3: Using Services GUI
services.msc
# Find "Marquardt Inventory Management" → Right-click → Stop
```

### Restart Service
```cmd
# Stop and start in sequence
net stop "marquardtinventorymanagement.exe" && net start "marquardtinventorymanagement.exe"

# Using PowerShell
Restart-Service "marquardtinventorymanagement.exe"
```

### Check Service Status
```cmd
# Detailed status information
sc query "marquardtinventorymanagement.exe"

# Quick status check
sc queryex "marquardtinventorymanagement.exe"

# List all services (find ours)
sc query | findstr /i marquardt
```

### View Service Configuration
```cmd
# View service configuration
sc qc "marquardtinventorymanagement.exe"

# View service description
sc qdescription "marquardtinventorymanagement.exe"
```

## 📊 Monitoring and Logs

### View Service Logs
```cmd
# Output logs (application output)
type "..\daemon\marquardtinventorymanagement.out.log"

# Error logs (application errors)
type "..\daemon\marquardtinventorymanagement.err.log"

# Wrapper logs (service wrapper)
type "..\daemon\marquardtinventorymanagement.wrapper.log"
```

### Real-time Log Monitoring
```cmd
# Monitor output logs (PowerShell)
Get-Content "..\daemon\marquardtinventorymanagement.out.log" -Wait -Tail 10

# Monitor error logs
Get-Content "..\daemon\marquardtinventorymanagement.err.log" -Wait -Tail 10
```

### Windows Event Viewer
```cmd
# Open Event Viewer
eventvwr.msc

# Navigate to: Windows Logs → Application
# Filter by Source: "marquardtinventorymanagement.exe"
```

## 🌐 Network Access Configuration

### Local Access
- **URL**: http://localhost:3000
- **Loopback**: http://127.0.0.1:3000

### Network Access
```cmd
# Find server IP address
ipconfig | findstr IPv4

# Access from other computers
# http://[SERVER_IP]:3000
# Example: http://172.16.4.173:3000
```

### Firewall Configuration
```cmd
# Add firewall rule
netsh advfirewall firewall add rule name="IMS Port 3000" dir=in action=allow protocol=TCP localport=3000

# View firewall rules
netsh advfirewall firewall show rule name="IMS Port 3000"

# Delete firewall rule (if needed)
netsh advfirewall firewall delete rule name="IMS Port 3000"
```

### Test Network Connectivity
```cmd
# Test from server
telnet localhost 3000

# Test from client computer
telnet [SERVER_IP] 3000

# Check if port is open
nmap -p 3000 [SERVER_IP]
```

## 👥 User Management

### Default Login Credentials
- **Admin 1**: `GuddiS` / `Welcome@MQI`
- **Admin 2**: `KatragaddaV` / `Welcome@MQI`

### First Login Steps
1. Access: http://[SERVER_IP]:3000/login
2. Login with admin credentials
3. Change default passwords
4. Create employee/monitor accounts
5. Configure system settings

## 🔄 Updates and Maintenance

### Update Application
```cmd
# 1. Stop the service
net stop "marquardtinventorymanagement.exe"

# 2. Backup current version (optional)
xcopy /E /I . ..\backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%

# 3. Pull latest changes (if using Git)
git pull origin main
npm install

# 4. Update database (if needed)
node setup-db.js

# 5. Start the service
net start "marquardtinventorymanagement.exe"
```

### Database Backup
```cmd
# Create database backup
mysqldump -u sigma -psigma product_management_system > backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql

# Restore database backup
mysql -u sigma -psigma product_management_system < backup_20241201.sql
```

### Service Configuration Update
```cmd
# Stop service
net stop "marquardtinventorymanagement.exe"

# Edit service configuration
notepad ..\daemon\marquardtinventorymanagement.xml

# Start service
net start "marquardtinventorymanagement.exe"
```

## 🛠️ Troubleshooting

### Service Won't Start
```cmd
# Check service status
sc query "marquardtinventorymanagement.exe"

# Check error logs
type "..\daemon\marquardtinventorymanagement.err.log"

# Check Windows Event Viewer
eventvwr.msc

# Try manual start for debugging
cd ..
node server.js
```

### Database Connection Issues
```cmd
# Test database connection
mysql -u sigma -psigma -e "SHOW DATABASES;"

# Check environment variables
echo %DB_HOST%
echo %DB_USER%

# Verify database exists
mysql -u sigma -psigma -e "USE product_management_system; SHOW TABLES;"
```

### Port Already in Use
```cmd
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace [PID] with actual PID)
taskkill /f /pid [PID]

# Alternative: Kill all node processes
taskkill /f /im node.exe
```

### Network Access Issues
```cmd
# Check firewall status
netsh advfirewall show allprofiles

# Test port accessibility
telnet [SERVER_IP] 3000

# Check if service is listening on all interfaces
netstat -an | findstr :3000
```

### Permission Issues
```cmd
# Run Command Prompt as Administrator
# Right-click Command Prompt → "Run as administrator"

# Check service account permissions
sc qc "marquardtinventorymanagement.exe"

# Reset service permissions
sc config "marquardtinventorymanagement.exe" obj= LocalSystem
```

## 🗑️ Complete Uninstallation

### Remove Service
```cmd
# 1. Stop the service
net stop "marquardtinventorymanagement.exe"

# 2. Run uninstall script as Administrator
cd deployment
uninstall-service.bat

# 3. Verify service removal
sc query "marquardtinventorymanagement.exe"
```

### Clean Up Files
```cmd
# Remove daemon files
rmdir /s /q daemon

# Remove executable files
del *.exe

# Remove node_modules (optional)
rmdir /s /q node_modules

# Remove logs (optional)
rmdir /s /q logs
```

### Remove Firewall Rules
```cmd
# Remove firewall rule
netsh advfirewall firewall delete rule name="IMS Port 3000"

# Verify removal
netsh advfirewall firewall show rule name="IMS Port 3000"
```

### Remove Database (Optional)
```cmd
# Backup before removal
mysqldump -u sigma -psigma product_management_system > final_backup.sql

# Drop database
mysql -u sigma -psigma -e "DROP DATABASE product_management_system;"
```

## 📞 Support and Contact

### Log Files Location
- **Output**: `daemon\marquardtinventorymanagement.out.log`
- **Errors**: `daemon\marquardtinventorymanagement.err.log`
- **Wrapper**: `daemon\marquardtinventorymanagement.wrapper.log`

### Common Issues Resolution
1. **Service fails to start**: Check error logs and database connection
2. **Cannot access from network**: Verify firewall rules and IP configuration
3. **Login fails**: Ensure database is set up and admin users created
4. **Performance issues**: Check system resources and database optimization

### Getting Help
1. Check error logs first
2. Verify all prerequisites are met
3. Test database connectivity
4. Ensure firewall configuration
5. Contact system administrator

## 🔐 Security Best Practices

### Initial Security Setup
1. Change all default passwords immediately
2. Create strong admin passwords
3. Limit network access to required IPs only
4. Enable Windows Defender/Antivirus
5. Keep system updated

### Ongoing Security
1. Regular password updates
2. Monitor access logs
3. Database backup encryption
4. Network security audits
5. System security updates

### Production Deployment
1. Use HTTPS (configure reverse proxy)
2. Database user with limited privileges
3. Network segmentation
4. Regular security assessments
5. Incident response plan