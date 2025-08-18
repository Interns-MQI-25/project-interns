# 🐳 Complete Docker Guide for Project Interns

## 📋 Table of Contents
- [Quick Start](#-quick-start)
- [Service Overview](#-service-overview)
- [Global Access Options](#-global-access-options)
- [Usage Examples](#-usage-examples)
- [Configuration](#-configuration)
- [Monitoring & Debugging](#-monitoring--debugging)
- [Troubleshooting](#-troubleshooting)
- [Architecture](#-architecture)
- [Security](#-security)

---

## 🚀 Quick Start

### Local Development (No Global Access)
```bash
# Start application with database
docker-compose --profile dev up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```
**Access**: http://localhost:3000

### Global Access (Choose One Method)

#### 1. Serveo Tunnel (🆓 No signup required - Recommended for testing)
```bash
docker-compose --profile dev --profile serveo up -d
docker logs serveo-tunnel  # Get your public URL
```

#### 2. ngrok Tunnel (🎯 Static URL - Best for development)
```bash
# Add NGROK_AUTHTOKEN to .env file first
docker-compose --profile dev --profile ngrok up -d
```
**Access**: https://bright-pleasing-marlin.ngrok-free.app (Your static URL!)
**Dashboard**: http://localhost:4040

#### 3. Cloudflare Tunnel (🏭 Best for production)
```bash
# Add CLOUDFLARE_TUNNEL_TOKEN to .env file first
docker-compose --profile dev --profile cloudflare up -d
```

#### 4. LocalTunnel (🔄 Alternative free option)
```bash
docker-compose --profile dev --profile localtunnel up -d
docker logs localtunnel  # Get your public URL
```

---

## 📊 Service Overview

### 🔗 All Services Merged into One Configuration!

The unified `docker-compose.yml` contains all services with profile-based activation:

### Core Services (Always Available)
- **mysql**: MySQL 8.0 database with sigma user
  - Port: 3307 (host) → 3306 (container)
  - Credentials: sigma/sigma
  - Auto-loads SQL scripts from `./sql/` directory
  - Health checks included

### Development Services
- **app** (Profile: `dev`, `development`)
  - Node.js application with hot reload
  - Port: 3000
  - Volume mounted for live development
  - Built-in health checks

### Global Access Services (Tunneling)
- **serveo** (Profile: `serveo`, `global`)
  - Free tunnel, no signup required
  - SSH-based tunneling to serveo.net
  - URL changes on restart

- **ngrok** (Profile: `ngrok`, `global`)
  - Custom domain support
  - **Static URL**: bright-pleasing-marlin.ngrok-free.app
  - Requires NGROK_AUTHTOKEN
  - Web interface at port 4040

- **cloudflared** (Profile: `cloudflare`, `global`)
  - Cloudflare tunnel with permanent URL
  - Requires CLOUDFLARE_TUNNEL_TOKEN
  - Most reliable for production

- **localtunnel** (Profile: `localtunnel`, `global`)
  - Simple HTTP tunnel
  - Custom subdomain support via LT_SUBDOMAIN

### Production Services
- **app-prod** (Profile: `production`)
  - Optimized for production
  - No development volumes
  - Binds to all interfaces (0.0.0.0)
  - Production environment variables

### Admin Services
- **adminer** (Profile: `admin`, `development`)
  - Database admin interface
  - Port: 8080
  - Web-based MySQL management

---

## 🌍 Global Access Options

| Method | Setup Difficulty | URL Stability | Free Tier | Best For |
|--------|------------------|---------------|-----------|----------|
| **Serveo** | ⭐ Easy | 🔄 Changes | ✅ Yes | Quick testing |
| **ngrok** | ⭐⭐ Medium | 🎯 Static URL | ✅ Yes | Development |
| **Cloudflare** | ⭐⭐⭐ Advanced | 🏭 Permanent | ✅ Yes | Production |
| **LocalTunnel** | ⭐ Easy | 🔄 Semi-stable | ✅ Yes | Alternative |

### Static URL Setup (ngrok)
Your application is configured with a **static ngrok URL**:
- **URL**: `https://bright-pleasing-marlin.ngrok-free.app`
- **Advantage**: Same URL every time you restart
- **Setup**: Just add your `NGROK_AUTHTOKEN` to `.env`

---

## 🎯 Usage Examples

```bash
# 🔧 Local development
docker-compose --profile dev up -d

# 🌐 Development with Serveo tunnel (free, URL changes)
docker-compose --profile dev --profile serveo up -d

# 🎯 Development with ngrok tunnel (static URL)
docker-compose --profile dev --profile ngrok up -d

# ☁️ Development with Cloudflare tunnel
docker-compose --profile dev --profile cloudflare up -d

# 🏭 Production deployment
docker-compose --profile production up -d

# 🗄️ Database admin interface
docker-compose --profile admin up -d

# 🌐 All global access services (for testing)
docker-compose --profile global up -d

# 🛑 Stop everything
docker-compose down

# 🧹 Clean up (remove volumes)
docker-compose down -v
```

---

## ⚙️ Configuration

### Environment Variables (.env file)

Create or update your `.env` file:

```bash
# Application Configuration
NODE_ENV=development
SESSION_SECRET=your-secret-key-change-in-production

# Database Configuration (Pre-configured)
DB_HOST=mysql
DB_USER=sigma
DB_PASSWORD=sigma
DB_NAME=product_management_system
DB_PORT=3306

# Global Access Tokens (Add as needed)
NGROK_AUTHTOKEN=your_ngrok_token_from_dashboard
NGROK_DOMAIN=bright-pleasing-marlin.ngrok-free.app
CLOUDFLARE_TUNNEL_TOKEN=your_cloudflare_token
LT_SUBDOMAIN=your-preferred-subdomain

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
ADMIN_EMAIL=admin@yourcompany.com
```

### Default Login Credentials

- **Username**: `admin1`, `admin2`, or `admin3`
- **Password**: `admin123`
- **Database**: `sigma` / `sigma`

---

## 📊 Monitoring & Debugging

### Check Service Status
```bash
# View running containers
docker-compose ps

# Check health status
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f mysql
docker-compose logs -f ngrok
docker-compose logs -f serveo

# Last 50 lines
docker-compose logs --tail=50 app
```

### Health Checks
- **Application**: http://localhost:3000/health
- **Database**: Automatic MySQL ping
- **ngrok Dashboard**: http://localhost:4040

### Database Access Options

#### 1. Direct MySQL Access
```bash
# Connect directly to MySQL
docker exec -it project-mysql mysql -u sigma -psigma

# From host machine
mysql -h localhost -P 3307 -u sigma -psigma product_management_system
```

#### 2. Web-based Admin (Adminer)
```bash
# Start admin interface
docker-compose --profile admin up -d

# Access via browser
open http://localhost:8080
```
- Server: `mysql`
- Username: `sigma`
- Password: `sigma`
- Database: `product_management_system`

---

## 🛠️ Troubleshooting

### Port Conflicts
```bash
# Check what's using port 3307
netstat -ano | findstr :3307

# Change MySQL port in docker-compose.yml if needed
ports:
  - "3308:3306"  # Use 3308 instead
```

### Database Connection Issues
```bash
# Check MySQL logs
docker logs project-mysql

# Recreate database (⚠️ Data loss)
docker-compose down -v
docker-compose up -d

# Test connection
docker exec -it project-mysql mysql -u sigma -psigma -e "SELECT 1;"
```

### Application Not Starting
```bash
# Check app logs
docker logs project-interns

# Rebuild the image
docker-compose build app
docker-compose up -d --build

# Check health endpoint
curl http://localhost:3000/health
```

### Tunnel Connection Issues

#### Serveo Tunnel
```bash
# Restart serveo tunnel
docker restart serveo-tunnel

# Check logs
docker logs serveo-tunnel -f
```

#### ngrok Tunnel
```bash
# Verify auth token
docker logs ngrok-tunnel

# Check ngrok status
curl http://localhost:4040/api/tunnels
```

#### Cloudflare Tunnel
```bash
# Check cloudflare logs
docker logs cloudflare-tunnel -f

# Verify token configuration
```

### Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| Port 3307 in use | Change MySQL port in docker-compose.yml |
| App won't start | Check logs: `docker logs project-interns` |
| Database connection failed | Restart: `docker-compose restart mysql` |
| Tunnel URL not working | Check tunnel logs and restart service |
| Permission denied | Run Docker as administrator |

---

## 🏗️ Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                TUNNEL SERVICES                          │
├─────────────────┬─────────────────┬─────────────────────┤
│   Serveo.net    │     ngrok       │   Cloudflare        │
│   (Free)        │  (Static URL)   │  (Production)       │
└─────────────────┴─────────────────┴─────────────────────┘
    │                       │                       │
    ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────┐
│            DOCKER NETWORK (app-network)                │
│                                                         │
│  ┌─────────────────┐    ┌─────────────────┐            │
│  │   Node.js App   │    │   MySQL 8.0     │            │
│  │   (Port 3000)   │◄───┤   Database      │            │
│  │   + Health      │    │   (Port 3306)   │            │
│  │   + Sessions    │    │   + Health      │            │
│  └─────────────────┘    └─────────────────┘            │
│                                                         │
│  ┌─────────────────┐    ┌─────────────────┐            │
│  │   Adminer       │    │   File Volumes  │            │
│  │   (Port 8080)   │    │   - mysql_data  │            │
│  │   DB Admin      │    │   - app_code    │            │
│  └─────────────────┘    └─────────────────┘            │
└─────────────────────────────────────────────────────────┘
    │                       │                       │
    ▼                       ▼                       ▼
 localhost:3000      localhost:3307         localhost:8080
```

### Service Communication
- **App ↔ MySQL**: Internal Docker network
- **Tunnels ↔ App**: Port forwarding to container
- **Host ↔ Services**: Port mapping to localhost

---

## 🔒 Security Notes

### Production Checklist
- [ ] Change `SESSION_SECRET` in production
- [ ] Change default admin passwords (`admin123`)
- [ ] Change database password from `sigma`
- [ ] Use HTTPS tunnels for global access
- [ ] Configure firewall rules for direct access
- [ ] Never commit `.env` file to version control
- [ ] Use environment-specific configurations
- [ ] Enable database SSL in production

### Best Practices
```bash
# Generate secure session secret
openssl rand -base64 32

# Change admin password via application
# Change database password in production
```

---

## 📁 File Structure

```
project-interns/
├── docker-compose.yml              # 🎯 UNIFIED compose file (ALL services)
├── Dockerfile                      # App container definition
├── .env                           # Environment variables
├── .dockerignore                  # Docker ignore file
├── DOCKER_COMPLETE_GUIDE.md       # 📚 This comprehensive guide
├── wait-for-it.sh                # Database readiness script
├── sql/                          # Database initialization scripts
│   ├── database.sql
│   ├── add-*.sql
│   └── ...
├── src/                          # Application source code
├── views/                        # EJS templates
├── public/                       # Static assets
└── config/                       # Configuration files
```

---

## 🎉 Summary of Unified Configuration

### ✅ What Was Merged:
- `docker-compose.yml` + `docker-compose.unified.yml` → **Single file**
- `DOCKER_README.md` + `DOCKER-DEPLOYMENT-GUIDE.md` + `DOCKER_SERVICES_SUMMARY.md` → **This guide**
- `STATIC_URL_SETUP.md` content integrated

### 🎯 Benefits:
- **Single source of truth** for all Docker configuration
- **Profile-based** service management
- **Static URL** support with ngrok
- **Complete documentation** in one place
- **No duplicate files** to maintain

### 🚀 Next Steps:
1. Use `docker-compose --profile dev up -d` for development
2. Add your tunnel tokens to `.env` for global access
3. Use `docker-compose --profile production up -d` for production

---

**🎊 Your Docker setup is now fully unified and ready to use!**
