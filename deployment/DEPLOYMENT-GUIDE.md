# Windows Server Deployment Guide

## 🚀 Deploy as Windows Service (Recommended)

### Prerequisites
- Windows Server 2016+ or Windows 10+
- Administrator privileges
- MySQL Server installed and running

### Quick Installation
1. **Copy project folder** to Windows Server
2. **Right-click** `install-service.bat` → **Run as administrator**
3. **Access application** at `http://SERVER_IP:3000`

### Manual Installation Steps
```cmd
# 1. Install dependencies
npm install

# 2. Install as Windows Service (Run as Administrator)
node install-service.js

# 3. Verify service is running
sc query "Marquardt Inventory Management"
```

### Service Management
```cmd
# Start service
net start "Marquardt Inventory Management"

# Stop service
net stop "Marquardt Inventory Management"

# Check status
sc query "Marquardt Inventory Management"

# View service in Services.msc
services.msc
```

### Uninstall Service
```cmd
# Run as Administrator
uninstall-service.bat
```

## 🌐 Global Access Configuration

### 1. Windows Firewall
```cmd
# Allow port 3000 through firewall
netsh advfirewall firewall add rule name="Inventory Management" dir=in action=allow protocol=TCP localport=3000
```

### 2. Network Access
- **Internal Network**: `http://SERVER_IP:3000`
- **Domain Access**: `http://server-name.domain.com:3000`
- **Public Access**: Configure router port forwarding

### 3. Database Configuration
Update database credentials in:
- `config/database.js` (if using MySQL)
- Environment variables

## 📊 Default Access
- **URL**: `http://localhost:3000`
- **Username**: `admin`
- **Password**: `admin123`

## 🔧 Troubleshooting

### Service Won't Start
```cmd
# Check Windows Event Viewer
eventvwr.msc → Windows Logs → Application

# Check service status
sc query "Marquardt Inventory Management"

# Manual start for debugging
node server.js
```

### Port Already in Use
```cmd
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Database Connection Issues
1. Verify MySQL is running: `services.msc`
2. Check database credentials in config files
3. Test connection: `mysql -u username -p`

## 🛡️ Security Considerations
- Change default admin password
- Configure HTTPS (use reverse proxy like IIS)
- Restrict database access
- Enable Windows Defender
- Regular security updates

## 📈 Performance Optimization
- **RAM**: Minimum 2GB, Recommended 4GB+
- **CPU**: 2+ cores recommended
- **Storage**: SSD recommended for database
- **Network**: Gigabit Ethernet for multiple users

## 🔄 Updates
1. Stop service: `net stop "Marquardt Inventory Management"`
2. Replace application files
3. Start service: `net start "Marquardt Inventory Management"`