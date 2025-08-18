
<div align="center">

# 🐳 Docker Complete Guide  
### *Marquardt India Pvt. Ltd. - Project Interns*  

[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/) [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/) [![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/) [![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)  

**🚀 One-click deployment • 🌐 Global access • ⚡ Production-ready**


</div>

## 🎯 Quick Navigation  

| 🚀 [Quick Start](#-lightning-quick-start) | 🔍 [Services](#-service-overview) | 🌐 [Global Access](#-global-access-tunneling) |
|:----------------------------------------:|:--------------------------------:|:--------------------------------------------:|
| Get running in 30s | Understand the stack | Share with the world |

| ⚙️ [Configuration](#️-configuration-setup) | 📊 [Monitoring](#-monitoring--debugging) | 🛠️ [Troubleshooting](#-troubleshooting-guide) |
|:-----------------------------------------:|:---------------------------------------:|:---------------------------------------------:|
| Env setup | Track & debug | Fix common issues |

---

## ⚡ Lightning Quick Start  

**Local Development Mode** 🖥️  

```bash
# 🚀 Launch app + database in one command
docker-compose --profile dev up -d

# ✅ Check containers
docker-compose ps

# 📋 View logs
docker-compose logs -f app
````

👉 App available at: **[http://localhost:3000](http://localhost:3000)**

---

**Global Access Mode** 🌍 *(Choose your option)*

|      Service      | Difficulty |  URL Type  |   Best For  |
| :---------------: | :--------: | :--------: | :---------: |
|   🆓 **Serveo**   | ⭐ Beginner |   Dynamic  | Quick demos |
|    🎯 **ngrok**   |   ⭐⭐ Easy  | **Static** | Development |
| ☁️ **Cloudflare** |   ⭐⭐⭐ Pro  |  Permanent |  Production |

```bash
# Example: Start with ngrok (Recommended)
docker-compose --profile dev --profile ngrok up -d
```

---

## 🏗️ Service Overview

```
┌─────────────┐     ┌─────────────┐    ┌─────────────┐
│  📱 App     │◄──► │ 🗄️ Database│◄──►│ 🌐 Tunnels   │
│  Node.js    │     │   MySQL     │    │ Global URL  │
│  Express    │     │   3307      │    │ Internet    │
└─────────────┘     └─────────────┘    └─────────────┘
```

* **Node.js App** → Port **3000**, hot reload, health checks
* **MySQL DB** → User: `sigma`, Pass: `sigma`, Port **3307**
* **Adminer** (DB UI) → `http://localhost:8080`

---

## 🌐 Global Access Tunneling

🔗 Example Static URL (via ngrok):
**[https://bright-pleasing-marlin.ngrok-free.app](https://bright-pleasing-marlin.ngrok-free.app)**

---

## 🎮 Command Cheat Sheet

**Local Development** 🏠

```bash
docker-compose --profile dev up -d
```

**Global Access** 🌍

```bash
docker-compose --profile dev --profile ngrok up -d
```

**Production Deployment** 🏭

```bash
docker-compose --profile production up -d
```

**Database Admin** 🗄️

```bash
docker-compose --profile admin up -d
# Open http://localhost:8080
```

**Stop Everything** 🛑

```bash
docker-compose down -v
```

---

## ⚙️ Configuration Setup

**.env Template**

```ini
NODE_ENV=development
SESSION_SECRET=your-secret-key

DB_HOST=mysql
DB_USER=sigma
DB_PASSWORD=sigma
DB_NAME=product_management_system
DB_PORT=3306

NGROK_AUTHTOKEN=your_ngrok_token
NGROK_DOMAIN=bright-pleasing-marlin.ngrok-free.app
CLOUDFLARE_TUNNEL_TOKEN=your_cloudflare_token
```

---

## 📊 Monitoring & Debugging

**Health Checks**

```bash
docker-compose ps
docker-compose logs -f app
```

**Useful URLs**

* App Health → `http://localhost:3000/health`
* ngrok Dashboard → `http://localhost:4040`
* DB Admin → `http://localhost:8080`

---

## 🛠️ Troubleshooting Guide

| Problem             | Quick Fix                       |                                |
| ------------------- | ------------------------------- | ------------------------------ |
| Port 3307 in use    | \`netstat -ano                  | findstr :3307\` → kill process |
| App won’t start     | `docker logs project-interns`   |                                |
| DB connection fails | `docker-compose restart mysql`  |                                |
| Tunnel not working  | Restart ngrok/serveo/cloudflare |                                |

---

## 🏗️ Architecture
```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                   TUNNEL SERVICES                       │
├─────────────────┬─────────────────┬─────────────────────┤
│   Serveo.net    │     ngrok       │    Cloudflare       │
│   (Free)        │  (Static URL)   │   (Production)      │
└─────────────────┴─────────────────┴─────────────────────┘
    │                       │                       │
    ▼                       ▼                       ▼
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
│  │     Adminer     │    │   File Volumes  │             │
│  │   (Port 8080)   │    │   - mysql_data  │             │
│  │   DB Admin UI   │    │   - app_code    │             │
│  └─────────────────┘    └─────────────────┘             │
└─────────────────────────────────────────────────────────┘
    │                       │                       │
    ▼                       ▼                       ▼
 localhost:3000      localhost:3307         localhost:8080
```

---

## 🔒 Security Best Practices

✅ Change default passwords
✅ Use strong `SESSION_SECRET`
✅ Never commit `.env`
✅ Use HTTPS tunnels for production

```bash
# Generate secure session secret
openssl rand -base64 32
```

---

## 🚀 Docker Hub Deployment

### 📦 **Your Image is Ready!**

<div align="center">

🎊 **Image Location:** [`priyanshuksharma/project-interns`](https://hub.docker.com/r/priyanshuksharma/project-interns)  
🏷️ **Available Tags:** `latest`, `v1.0.0`  
📦 **Size:** ~248MB (Alpine-based)  

</div>

### 🎯 **What's Inside the Image?**

<div align="center">

| 🎯 Feature | 📖 Description |
|:---:|:---|
| **🔐 Role-Based Access** | Employees, Monitors, Administrators |
| **📦 Product Management** | Request workflow with approval system |
| **📧 Email Notifications** | SMTP integration for user communications |
| **📎 File Attachments** | Upload/download product documentation |
| **📊 Real-time Analytics** | Inventory tracking and reporting |
| **🎨 Responsive Design** | Mobile-friendly Tailwind CSS interface |

</div>

### 🚀 **Production Ready Features**

<div align="center">

✅ **Health Checks** • ✅ **Environment Configuration** • ✅ **Connection Pooling**  
✅ **Session Management** • ✅ **Error Handling** • ✅ **File Validation**

</div>

### 💻 **Usage Examples**

<div align="center">

#### 🏃 **Simple Run**
```bash
docker pull priyanshuksharma/project-interns:latest
docker run -p 3000:3000 priyanshuksharma/project-interns:latest
# Access at: http://localhost:3000
```

#### 🔧 **With Environment Variables**
```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-database-host \
  -e DB_USER=your-db-user \
  -e DB_PASSWORD=your-db-password \
  -e SESSION_SECRET=your-secret-key \
  priyanshuksharma/project-interns:latest
```

#### 🏗️ **Full Stack with Docker Compose**
```bash
# Download docker-compose.yml from GitHub
curl -O https://raw.githubusercontent.com/Interns-MQI-25/project-interns/main/docker-compose.yml

# Start application + MySQL database
docker-compose --profile dev up -d
```

</div>

### ⚙️ **Environment Variables Reference**

<div align="center">

| Variable | Description | Required | Default |
|:---:|:---|:---:|:---:|
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Application port | No | `3000` |
| `DB_HOST` | MySQL host | Yes | `mysql` |
| `DB_USER` | Database username | Yes | `sigma` |
| `DB_PASSWORD` | Database password | Yes | `sigma` |
| `DB_NAME` | Database name | Yes | `product_management_system` |
| `SESSION_SECRET` | Session encryption key | Yes | - |
| `EMAIL_USER` | SMTP email username | No | - |
| `EMAIL_PASS` | SMTP email password | No | - |

</div>

### 🗄️ **Database Setup Options**

<details>
<summary>🐳 <strong>Option 1: Use with Docker Compose (Recommended)</strong></summary>

```bash
# Includes MySQL + Application
curl -O https://raw.githubusercontent.com/Interns-MQI-25/project-interns/main/docker-compose.yml
docker-compose --profile dev up -d

# Check services
docker-compose ps
```

</details>

<details>
<summary>🔗 <strong>Option 2: External Database</strong></summary>

```bash
# Connect to your existing MySQL instance
docker run -p 3000:3000 \
  -e DB_HOST=your-mysql-host \
  -e DB_USER=your-username \
  -e DB_PASSWORD=your-password \
  -e DB_NAME=product_management_system \
  priyanshuksharma/project-interns:latest
```

</details>

### 🔑 **Default Login Credentials**

<div align="center">

| 👤 Username | 🔐 Password | 🎯 Role |
|:---:|:---:|:---:|
| `admin` | `admin123` | Administrator |

> ⚠️ **Security**: Change default passwords immediately in production!

</div>

### 🌐 **Global Access Integration**

<div align="center">

Want to share your local Docker instance with the world?

```bash
# Using complete Docker setup with ngrok
git clone https://github.com/Interns-MQI-25/project-interns.git
cd project-interns
docker-compose --profile dev --profile ngrok up -d
# Access at: https://bright-pleasing-marlin.ngrok-free.app
```

</div>

### 🚀 **Performance Specs**

<div align="center">

| 📊 Metric | 📈 Value |
|:---:|:---:|
| **Image Size** | ~248MB (Alpine-based) |
| **Startup Time** | <10 seconds |
| **Memory Usage** | ~100MB base |
| **Health Checks** | Built-in monitoring |
| **Connection Pooling** | Optimized database access |

</div>

### 📋 **Version Tags Available**

<div align="center">

- `latest` - Most recent stable version  
- `v1.0.0` - Tagged release version  
- `v1.0.1`, `v2.0.0` - Future versions  

</div>

### 🏗️ **Docker Hub Description**

*Copy this description for your Docker Hub repository:*

<details>
<summary>📝 <strong>Click to expand Docker Hub description</strong></summary>

```markdown
# 🏢 Marquardt India Inventory Management System

A comprehensive web-based asset management system with role-based access control, email notifications, and file attachment capabilities.

## 🚀 Quick Start
```bash
docker pull priyanshuksharma/project-interns:latest
docker run -p 3000:3000 priyanshuksharma/project-interns:latest
```

## ✨ Features
- 🔐 Role-Based Access Control (Employees, Monitors, Admins)
- 📦 Product Management with approval workflow
- 📧 Email Notifications (SMTP integration)
- 📎 File Attachments for product documentation
- 📊 Real-time Analytics and inventory tracking
- 🎨 Responsive Design (Mobile-friendly)

## 🛠️ Tech Stack
- Backend: Node.js 20, Express.js 4.x
- Database: MySQL 8.0 (not included)
- Security: bcryptjs, SQL injection protection
- Performance: Connection pooling, health checks

## 📚 Documentation
- GitHub: https://github.com/Interns-MQI-25/project-interns
- Live Demo: https://mqi-ims.uc.r.appspot.com
- Complete Guide: See repository README

Enterprise-ready inventory management made simple.
```

</details>

---

## 📁 Project Structure

```
project-interns/
├── docker-compose.yml
├── Dockerfile
├── .env
├── sql/
├── src/
├── views/
├── public/
└── config/
```

---

<div align="center">

🎉 **Setup Complete!**

🚀 Dev → `docker-compose --profile dev up -d`
🌐 Share → `docker-compose --profile ngrok up -d`
🏭 Prod → `docker-compose --profile production up -d`

**Made with ❤️ for Marquardt India Pvt. Ltd.**

[![Docker Hub](https://img.shields.io/badge/DockerHub-priyanshuksharma-blue?style=for-the-badge\&logo=docker)](https://hub.docker.com/r/priyanshuksharma/project-interns)



---
