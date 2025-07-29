# Product Management System - Cloud Deployment Guide

## 🚀 Overview

This is a comprehensive Product Management System built with Node.js, Express, and MySQL, deployed on Google Cloud Platform using Cloud Run and Cloud SQL.

## 📋 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloud Build   │───▶│   Cloud Run     │───▶│   Cloud SQL     │
│   CI/CD Pipeline│    │   Application   │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Components:
- **Cloud Run**: Containerized Node.js application
- **Cloud SQL**: MySQL 8.0 database instance
- **Cloud Build**: Automated CI/CD pipeline
- **Container Registry**: Docker image storage

## 🏗️ Infrastructure Details

### Google Cloud Project
- **Project ID**: `mqi-interns-467308`
- **Region**: `us-central1`

### Cloud SQL Database
- **Instance Name**: `asset-db`
- **Database Version**: MySQL 8.0
- **Tier**: `db-f1-micro`
- **Location**: `us-central1-c`
- **Database Name**: `product_management_system`

### Database Users
- **Root User**: `root` (password: `sigma`)
- **Application User**: `sigma` (password: `sigma`)
- **App Engine User**: `app_user` (password: `sigma`)

### Cloud Run Service
- **Service Name**: `asset-db`
- **Image**: `gcr.io/mqi-interns-467308/asset-db`
- **Port**: `8081`
- **Memory**: `512Mi`
- **CPU**: `1`
- **Min Instances**: `1`
- **Max Instances**: `10`

## 📁 Project Structure

```
project-interns/
├── 📄 app.yaml                    # App Engine configuration (legacy)
├── 📄 cloudbuild.yaml            # Cloud Build CI/CD pipeline
├── 📄 Dockerfile                 # Container configuration
├── 📄 database.sql               # Database schema and sample data
├── 📄 server.js                  # Main application server
├── 📄 package.json               # Node.js dependencies
├── 📁 src/                       # Application source code
│   ├── 📁 routes/                # API routes
│   ├── 📁 middleware/            # Authentication middleware
│   └── 📁 utils/                 # Utility functions
├── 📁 views/                     # EJS templates
│   ├── 📁 admin/                 # Admin dashboard views
│   ├── 📁 employee/              # Employee portal views
│   ├── 📁 monitor/               # Monitor dashboard views
│   ├── 📁 auth/                  # Authentication pages
│   └── 📁 partials/              # Reusable template components
└── 📁 public/                    # Static assets (CSS, JS)
```

## 🔧 Environment Variables

### Cloud Run Environment Variables
```bash
NODE_ENV=production
DB_HOST=/cloudsql/mqi-interns-467308:us-central1:asset-db
DB_USER=sigma
DB_PASSWORD=sigma
DB_NAME=product_management_system
DB_PORT=3306
```

### App Engine Environment Variables (Legacy)
```yaml
NODE_ENV: production
PORT: 8080
DB_HOST: /cloudsql/mqi-interns-467308:us-central1:asset-db
DB_USER: app_user
DB_PASSWORD: sigma
DB_NAME: product_management_system
SESSION_SECRET: CHANGE_ME_super_secret_session_key_for_encryption!
```

## 🚀 Deployment Instructions

### Prerequisites
1. Google Cloud CLI installed and configured
2. Docker installed (for local testing)
3. Node.js 20+ installed (for local development)

### 1. Database Setup
```bash
# Connect to Cloud SQL
gcloud sql connect asset-db --user=root
# Password: sigma

# Import database schema
mysql> source database.sql
mysql> exit
```

### 2. Cloud Run Deployment
```bash
# Deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml .

# Monitor deployment
gcloud run services list --region=us-central1
```

### 3. App Engine Deployment (Alternative)
```bash
# Deploy to App Engine
gcloud app deploy app.yaml

# View logs
gcloud app logs tail -s default
```

## 🔐 Authentication & Users

### System Roles
- **Super Admin**: Full system access
- **Admin**: Department-level management
- **Monitor**: Inventory monitoring and approvals
- **Employee**: Basic product requests and viewing

### Default Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@company.com`
- **Role**: `admin` (with super admin privileges)

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts and authentication
- **employees**: Employee information and department mapping
- **departments**: Organizational departments
- **products**: Product catalog and inventory
- **product_requests**: Product issue/return requests
- **stock_history**: Inventory movement tracking
- **admin_assignments**: Admin-department assignments
- **monitor_assignments**: Monitor-department assignments
- **registration_requests**: Pending user registrations

## 📊 API Endpoints

### Authentication
- `GET /login` - Login page
- `POST /login` - User authentication
- `GET /logout` - User logout
- `GET /register` - Registration page
- `POST /register` - User registration

### Dashboard
- `GET /dashboard` - Role-based dashboard redirect
- `GET /admin/dashboard` - Admin dashboard
- `GET /employee/dashboard` - Employee dashboard
- `GET /monitor/dashboard` - Monitor dashboard

### Product Management
- `GET /admin/stock` - Product inventory management
- `GET /employee/stock` - Employee product catalog
- `POST /employee/requests` - Submit product requests
- `GET /monitor/approvals` - Pending approval requests

## 🔍 Monitoring & Logs

### Cloud Run Logs
```bash
# View service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=asset-db" --limit=50

# Real-time logs
gcloud logs tail "projects/mqi-interns-467308/logs/run.googleapis.com%2Fstdout"
```

### Health Check
- **Endpoint**: `/health`
- **Response**: `{"status": "healthy", "timestamp": "..."}`

### Database Connection Test
- **Endpoint**: `/setup-database`
- **Purpose**: Initialize database and create admin user

## 🛠️ Local Development

### Setup
```bash
# Clone repository
git clone https://github.com/Interns-MQI-25/project-interns.git
cd project-interns

# Install dependencies
npm install

# Set environment variables
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=yourpassword
export DB_NAME=product_management_system
export NODE_ENV=development

# Start development server
npm run dev
```

### Database Setup (Local)
```bash
# Create local database
mysql -u root -p
CREATE DATABASE product_management_system;
source database.sql;
```

## 🔒 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **Session Management**: Express sessions with secure cookies
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: EJS template escaping
- **HTTPS Enforcement**: Cloud Run automatic HTTPS
- **Database Security**: Cloud SQL private networking

## 📈 Performance Optimization

- **Container Optimization**: Multi-stage Docker builds
- **Database Indexing**: Optimized queries with proper indexes
- **Caching**: Session-based caching
- **Auto-scaling**: Cloud Run automatic scaling (1-10 instances)
- **Resource Limits**: 512Mi memory, 1 CPU per instance

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check Cloud SQL status
   gcloud sql instances describe asset-db
   
   # Test connection
   gcloud sql connect asset-db --user=sigma
   ```

2. **Deployment Failures**
   ```bash
   # Check build logs
   gcloud builds log [BUILD_ID]
   
   # Check service status
   gcloud run services describe asset-db --region=us-central1
   ```

3. **Authentication Issues**
   - Verify admin user exists: Check `/setup-database` endpoint
   - Reset passwords via Cloud SQL console
   - Check session configuration

### Debug Commands
```bash
# Cloud Run service logs
gcloud run services logs read asset-db --region=us-central1

# Cloud Build history
gcloud builds list --limit=10

# Database users
gcloud sql users list --instance=asset-db
```

## 📋 Maintenance

### Regular Tasks
- **Database Backups**: Automated daily backups enabled
- **Security Updates**: Monitor Node.js security advisories
- **Log Rotation**: Cloud Logging automatic retention
- **Cost Monitoring**: Set up billing alerts

### Update Deployment
```bash
# Update application
git push origin main

# Trigger new build
gcloud builds submit --config cloudbuild.yaml .

# Verify deployment
curl https://[CLOUD_RUN_URL]/health
```

## 📞 Support

- **Repository**: [https://github.com/Interns-MQI-25/project-interns](https://github.com/Interns-MQI-25/project-interns)
- **Cloud Console**: [Google Cloud Console](https://console.cloud.google.com/run?project=mqi-interns-467308)
- **Documentation**: This README.md

## 📝 License

This project is part of the MQI Internship Program 2025.

---

**Last Updated**: July 29, 2025  
**Version**: 1.0.0  
**Deployment**: Cloud Run (Primary), App Engine (Legacy Support)
