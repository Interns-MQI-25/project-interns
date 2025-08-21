# 🐳 Docker Deployment Guide
### *Marquardt India Pvt. Ltd. - Project Interns*

[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/) [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/) [![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/) [![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

**🚀 One-click deployment • 🌐 Global access • ⚡ Production-ready**

---

## 🎯 Quick Navigation

| 🚀 [Quick Start](#-quick-start) | 📦 [Docker Hub](#-docker-hub-deployment) | 🌐 [Global Access](#-global-access) |
|:-------------------------------:|:----------------------------------------:|:------------------------------------:|
| Get running in 30s | Pull from Docker Hub | Share with the world |

| ⚙️ [Development](#️-development-mode) | 🏭 [Production](#-production-deployment) | 🛠️ [Troubleshooting](#-troubleshooting) |
|:------------------------------------:|:---------------------------------------:|:----------------------------------------:|
| Local development | Production setup | Fix common issues |

---

## 🚀 Quick Start

Choose the deployment option that best fits your needs:

### 🎯 **Option 1: LocalTunnel - Global Access (Recommended)**
Perfect for instant global access and demos:

```bash
docker pull priyanshuksharma/project-interns:localtunnel
docker run -d -p 3000:3000 --name inventory-global priyanshuksharma/project-interns:localtunnel

# Wait 30 seconds, then get the public URL
docker logs inventory-global | grep "Global access:"
```

### 🔧 **Option 2: All-in-One Container**
Self-contained with embedded MySQL:

```bash
docker pull priyanshuksharma/project-interns:all-in-one
docker run -d -p 3000:3000 --name inventory-local priyanshuksharma/project-interns:all-in-one
```

### 🏗️ **Option 3: Standard Multi-Container**
Best for development and production:

```bash
docker pull priyanshuksharma/project-interns:latest
# Requires docker-compose.yml file
docker-compose --profile dev up -d
```

---

## 📦 Docker Hub Deployment

### 🏷️ **Available Images**

All images are available at: [`priyanshuksharma/project-interns`](https://hub.docker.com/r/priyanshuksharma/project-interns)

| **Tag** | **Description** | **Use Case** |
|:-------:|:---------------|:-------------|
| `latest` | Standard multi-container | Development with external DB |
| `all-in-one` | Embedded MySQL | Quick local deployment |
| `localtunnel` | Global access with LocalTunnel | Remote access and demos |

### ✅ **What's Included**

All variants include:
- ✅ Complete Node.js Inventory Management System
- ✅ Pre-configured MySQL database with sample data
- ✅ 72+ products from Marquardt catalog
- ✅ User management with role-based access
- ✅ File upload and attachment support
- ✅ Comprehensive audit trail and reporting
- ✅ Health checks and monitoring
- ✅ Production-ready configuration
- ✅ **nano editor** for container debugging

### 🔑 **Admin Login Credentials**

All deployment options use these admin credentials:

```
Username: GuddiS
Password: Welcome@123

Username: KatragaddaV
Password: Welcome@123
```

### 🎯 **Quick Examples**

**Simple Run (All-in-One):**
```bash
docker run -p 3000:3000 priyanshuksharma/project-interns:all-in-one
# Access at: http://localhost:3000
```

**With Environment Variables:**
```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e SESSION_SECRET=your-secret-key \
  priyanshuksharma/project-interns:all-in-one
```

**Global Access (LocalTunnel):**
```bash
docker run -p 3000:3000 priyanshuksharma/project-interns:localtunnel
# Check logs for: https://xxxxx.loca.lt
```

---

## 🌐 Global Access

### 🌍 **LocalTunnel Integration**

The LocalTunnel variant provides instant global access:

- **No Account Required:** Works immediately without signup
- **Custom Subdomains:** Uses `marquardt-inventory.loca.lt` by default
- **HTTPS Support:** Automatic SSL certificates
- **Request Logging:** Built-in traffic monitoring

```bash
# Run with default subdomain
docker run -d -p 3000:3000 \
  --name inventory-global \
  priyanshuksharma/project-interns:localtunnel

# Run with custom subdomain
docker run -d -p 3000:3000 \
  -e LT_SUBDOMAIN=your-custom-name \
  --name inventory-global \
  priyanshuksharma/project-interns:localtunnel

# Get the public URL
docker logs inventory-global | grep "Global access:"
```

---

## ⚙️ Development Mode

### 🏠 **Local Development with Docker Compose**

For development with hot reload and debugging:

```bash
# Clone the repository
git clone https://github.com/Interns-MQI-25/project-interns.git
cd project-interns

# Start development environment
docker-compose --profile dev up -d

# View logs
docker-compose logs -f app
```

**Development URLs:**
- App: http://localhost:3000
- Database Admin: http://localhost:8080
- Health Check: http://localhost:3000/health

### 🔧 **Environment Configuration**

Create a `.env` file for custom configuration:

```ini
NODE_ENV=development
SESSION_SECRET=your-secret-key

# Database Configuration
DB_HOST=mysql
DB_USER=sigma
DB_PASSWORD=sigma
DB_NAME=product_management_system
DB_PORT=3306

# Email Configuration (Optional)
EMAIL_USER=your-email@company.com
EMAIL_PASS=your-app-password

# LocalTunnel Configuration
LT_SUBDOMAIN=your-custom-subdomain
```

---

## 🏭 Production Deployment

### 🚀 **Production Setup**

```bash
# Pull production image
docker pull priyanshuksharma/project-interns:latest

# Run with production configuration
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-production-db \
  -e DB_USER=your-db-user \
  -e DB_PASSWORD=your-secure-password \
  -e SESSION_SECRET=your-strong-session-secret \
  --name marquardt-inventory-prod \
  priyanshuksharma/project-interns:latest
```

### 🔒 **Security Best Practices**

✅ Change default admin passwords immediately  
✅ Use strong `SESSION_SECRET` (32+ characters)  
✅ Never commit `.env` files to version control  
✅ Use HTTPS in production environments  
✅ Regular security updates and monitoring  

```bash
# Generate secure session secret
openssl rand -base64 32
```

### 📊 **Performance Optimization**

| **Metric** | **Value** |
|:----------:|:---------:|
| **Base Image** | Alpine Linux (secure & lightweight) |
| **Image Size** | ~280MB (optimized layers) |
| **Startup Time** | <15 seconds |
| **Memory Usage** | ~150MB base |
| **Health Checks** | Built-in monitoring |

---

## 🏗️ Architecture Overview

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                   LOCALTUNNEL SERVICE                   │
│             https://marquardt-inventory.loca.lt         │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│               DOCKER NETWORK (app-network)              │
│                                                         │
│  ┌─────────────────┐    ┌─────────────────┐             │
│  │   Node.js App   │    │    MySQL 8.0    │             │
│  │   (Port 3000)   │◄───┤   Database      │             │
│  │   + Health      │    │   (Port 3306)   │             │
│  │   + Sessions    │    │   + Health      │             │
│  └─────────────────┘    └─────────────────┘             │
│                                                         │
│  ┌─────────────────┐    ┌─────────────────┐             │
│  │   Supervisor    │    │   File Volumes  │             │
│  │  Process Mgmt   │    │   - mysql_data  │             │
│  │  + LocalTunnel  │    │   - uploads     │             │
│  └─────────────────┘    └─────────────────┘             │
└─────────────────────────────────────────────────────────┘
    │                       │                       │
    ▼                       ▼                       ▼
 localhost:3000      mysql://localhost:3306  /var/lib/mysql
```

---

## 🛠️ Troubleshooting

### 🔍 **Common Issues & Solutions**

| **Problem** | **Solution** |
|:-----------|:-------------|
| **Login fails** | Wait 30-60s for full initialization, use exact usernames: `GuddiS` or `KatragaddaV` |
| **Port 3000 in use** | `netstat -ano \| findstr :3000` → kill process or use different port |
| **DB connection fails** | Check container logs: `docker logs container-name` |
| **LocalTunnel not working** | Restart container, check firewall settings |
| **Container won't start** | Check Docker logs: `docker logs container-name` |

### 🧰 **Debugging Commands**

```bash
# Check container status
docker ps -a

# View detailed logs
docker logs -f container-name

# Access container shell (with nano editor)
docker exec -it container-name /bin/bash

# Reset admin users
docker exec container-name node create-admin.js

# Check database connection
docker exec container-name mysql -u sigma -psigma -e "SHOW DATABASES;"

# View LocalTunnel logs
docker logs container-name | grep -i tunnel

# Monitor resource usage
docker stats container-name
```

### 🔄 **Container Management**

```bash
# Start/Stop containers
docker start container-name
docker stop container-name

# Remove containers
docker rm container-name

# Update images
docker pull priyanshuksharma/project-interns:tag
docker-compose down
docker-compose up -d

# Data persistence
docker run -v mysql_data:/var/lib/mysql \
  -v uploads_data:/usr/src/app/uploads \
  priyanshuksharma/project-interns:all-in-one
```

---

## 🏢 Marquardt Features

### 📦 **Inventory Management**
- Product tracking with calibration dates
- Equipment request and approval workflow
- Stock history and audit trails
- Department-based organization

### 👥 **User Management**
- **Admin**: Full system access and user management
- **Monitor**: Approval workflows and reporting
- **Employee**: Request equipment and view assignments

### 📊 **Reporting & Analytics**
- Real-time inventory status
- User activity tracking
- Equipment utilization reports
- Calibration scheduling

### 📁 **File Management**
- Product documentation uploads
- Attachment support for requests
- Secure file storage and retrieval

---

## 📞 Support & Resources

### 🔗 **Links**
- **GitHub Repository**: [Interns-MQI-25/project-interns](https://github.com/Interns-MQI-25/project-interns)
- **Docker Hub**: [priyanshuksharma/project-interns](https://hub.docker.com/r/priyanshuksharma/project-interns)
- **Live Demo**: [https://mqi-ims.uc.r.appspot.com](https://mqi-ims.uc.r.appspot.com)

### 📚 **Documentation**
- **API Documentation**: Available in `/docs` endpoint
- **Database Schema**: Located in `/sql/database-merged.sql`
- **Environment Variables**: See `.env.example`

### 🏷️ **Version Information**
- **Latest Release**: v6.0.0
- **Node.js**: 20.x LTS
- **MySQL**: 8.0 / MariaDB 11.4
- **Docker**: Multi-architecture support

---

## 🎉 Quick Command Reference

### **LocalTunnel (Global Access)**
```bash
docker run -d -p 3000:3000 --name inventory-global priyanshuksharma/project-interns:localtunnel
docker logs inventory-global | grep "Global access:"
```

### **All-in-One (Local)**
```bash
docker run -d -p 3000:3000 --name inventory-local priyanshuksharma/project-interns:all-in-one
```

### **Development (Docker Compose)**
```bash
git clone https://github.com/Interns-MQI-25/project-interns.git
cd project-interns
docker-compose --profile dev up -d
```

---

<div align="center">

**🎊 Ready to Deploy!**

🔑 Login: `GuddiS` / `Welcome@123` or `KatragaddaV` / `Welcome@123`  
🌐 Access: http://localhost:3000 (local) or check logs for global URL  
📧 Support: Available through GitHub Issues  

**Made with ❤️ for Marquardt India Pvt. Ltd.**

[![Docker Hub](https://img.shields.io/badge/DockerHub-priyanshuksharma-blue?style=for-the-badge&logo=docker)](https://hub.docker.com/r/priyanshuksharma/project-interns)

</div>
