# Marquardt India Pvt. Ltd. - Comprehensive Deployment Guide

## 📋 Overview

This is a comprehensive Marquardt India Asset Management System built with Node.js, Express, and MySQL, deployed on Google Cloud Platform using App Engine and Cloud SQL with email notifications and file attachment capabilities.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Users/Devices │────│  App Engine     │────│   Cloud SQL     │
│                 │    │  (Node.js App)  │    │   (MySQL 8.0)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                        ▲                      ▲
         │                        │                      │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Secret Manager  │    │ Gmail SMTP      │    │  Cloud Storage  │
│ (Credentials)   │    │ (Email Service) │    │ (File Uploads)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

### ✅ Google Cloud Setup

- [ ] Google Cloud account created
- [ ] Project `mqi-ims` exists and billing is enabled
- [ ] Google Cloud CLI installed and authenticated
- [ ] Project set: `gcloud config set project mqi-ims`

### ✅ Files Ready

- [ ] `app.yaml` configured with environment variables
- [ ] `package.json` updated with all dependencies
- [ ] `.gcloudignore` configured
- [ ] Email service implemented with Gmail SMTP
- [ ] File attachment system ready

## 🚀 Quick Deployment

### Option 1: Automated Deployment (Recommended)

```bash
# Make script executable
chmod +x deploy-appengine.sh

# Run deployment
./deploy-appengine.sh
```

### Option 2: Manual Deployment

```bash
# 1. Set project
gcloud config set project mqi-ims

# 2. Enable required APIs
gcloud services enable appengine.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com

# 3. Create Cloud SQL instance
gcloud sql instances create product-management-db \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region=us-central1

# 4. Create database and user
gcloud sql databases create product_management_system --instance=product-management-db
gcloud sql users create sigma --instance=product-management-db --password=sigma

# 5. Import database schema
# Create Cloud Storage bucket for SQL import
gcloud storage buckets create gs://mqi-ims-db-import
gcloud storage cp sql/database.sql gs://mqi-ims-db-import/
gcloud sql import sql product-management-db gs://mqi-ims-db-import/database.sql --database=product_management_system

# 6. Create Secrets in Secret Manager
echo -n "sigma" | gcloud secrets create db-password --data-file=- --replication-policy="automatic"
echo -n "your-session-secret-key" | gcloud secrets create session-secret --data-file=- --replication-policy="automatic"
echo -n "your-gmail-email@gmail.com" | gcloud secrets create email-user --data-file=- --replication-policy="automatic"
echo -n "your-gmail-app-password" | gcloud secrets create email-pass --data-file=- --replication-policy="automatic"

# 7. Grant App Engine permission to access secrets
PROJECT_NUMBER=$(gcloud projects describe mqi-ims --format='get(projectNumber)')
gcloud projects add-iam-policy-binding mqi-ims \
    --member="serviceAccount:${PROJECT_NUMBER}@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# 8. Create App Engine app
gcloud app create --region=us-central1

# 9. Deploy
gcloud app deploy app.yaml --project=mqi-ims
```

## 🔧 Configuration Files

### `app.yaml` - App Engine Configuration

```yaml
runtime: nodejs20

env_variables:
  NODE_ENV: production
  DB_HOST: /cloudsql/mqi-ims:us-central1:product-management-db
  DB_USER: sigma
  DB_NAME: product_management_system
  DB_PORT: 3306
  # Secrets loaded from Secret Manager
  DB_PASSWORD: "projects/mqi-ims/secrets/db-password/versions/latest"
  SESSION_SECRET: "projects/mqi-ims/secrets/session-secret/versions/latest"
  EMAIL_USER: "projects/mqi-ims/secrets/email-user/versions/latest"
  EMAIL_PASS: "projects/mqi-ims/secrets/email-pass/versions/latest"

beta_settings:
  cloud_sql_instances: mqi-ims:us-central1:product-management-db

automatic_scaling:
  min_instances: 1
  max_instances: 10
```

## 🗄️ Database Configuration

### Cloud SQL Instance Details

- **Instance Name**: `product-management-db`
- **Region**: `us-central1`
- **Database Version**: MySQL 8.0
- **Tier**: `db-f1-micro`
- **Database Name**: `product_management_system`
- **User**: `sigma`
- **Password**: `sigma` (stored in Secret Manager)

### Database Schema

The system includes comprehensive tables for:

- **users**: User accounts and authentication
- **employees**: Employee information and department mapping
- **departments**: Organizational departments
- **products**: Product catalog and inventory
- **product_requests**: Product issue/return requests
- **product_assignments**: Product assignments to employees
- **product_attachments**: File attachments for products
- **stock_history**: Inventory movement tracking
- **registration_requests**: Pending user registrations
- **admin_assignments**: Admin-department assignments
- **monitor_assignments**: Monitor-department assignments

## 📧 Email Service Configuration

### Gmail SMTP Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Store credentials in Secret Manager**:
   ```bash
   echo -n "your-email@gmail.com" | gcloud secrets create email-user --data-file=-
   echo -n "your-app-password" | gcloud secrets create email-pass --data-file=-
   ```

### Email Features

- **Registration Confirmation**: Sent to users upon registration
- **Admin Notifications**: Sent to all admins for new registrations
- **Approval/Rejection**: Automated emails for registration decisions
- **Multi-Admin Support**: Notifications sent to all active admins

## 📁 File Attachment System

### Supported File Types

- **Images**: JPG, JPEG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, CSV, TXT
- **Limits**: 10MB per file, maximum 10 files per upload

### Storage Configuration

- Files stored in `/uploads/products/` directory
- Unique filename generation with timestamps
- Database metadata storage in `product_attachments` table

### User Permissions

- **Monitors**: Upload files during product creation
- **Admins**: Full file management (upload, view, delete)
- **Employees**: View and download only

## 🔐 Security & Authentication

### System Roles

- **Super Admin**: Full system access
- **Admin**: Department-level management
- **Monitor**: Inventory monitoring and approvals (max 4 active)
- **Employee**: Basic product requests and viewing

### Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@company.com`

### Security Features

- Password hashing with bcryptjs
- Session management with secure cookies
- SQL injection protection via parameterized queries
- File type validation and size limits
- HTTPS enforcement via App Engine

## 📊 API Endpoints

### Authentication

- `GET /login` - Login page
- `POST /login` - User authentication
- `GET /register` - Registration page
- `POST /register` - User registration with email notifications
- `GET /logout` - User logout

### Dashboard

- `GET /dashboard` - Role-based dashboard redirect
- `GET /admin/dashboard` - Admin dashboard with statistics
- `GET /employee/dashboard` - Employee dashboard
- `GET /monitor/dashboard` - Monitor dashboard

### Product Management

- `GET /admin/stock` - Product inventory management
- `GET /employee/stock` - Employee product catalog
- `POST /employee/requests` - Submit product requests
- `GET /monitor/approvals` - Pending approval requests

### File Management

- `POST /monitor/add-product` - Add product with file uploads
- `GET /*/download-attachment/:id` - Download files
- `GET /*/api/product-attachments/:id` - Get file list
- `DELETE /*/api/attachment/:id` - Delete files (admin/monitor only)

## 🔍 Monitoring & Troubleshooting

### View Application Logs

```bash
# Real-time logs
gcloud app logs tail -s default

# Historical logs
gcloud app logs read -s default --limit=100
```

### Health Checks

- **Application URL**: `https://mqi-ims.uc.r.appspot.com`
- **Health Endpoint**: `/health` (if implemented)
- **Database Test**: `/setup-database` (initialization)

### Common Issues & Solutions

1. **Database Connection Fails**

   ```bash
   # Check Cloud SQL status
   gcloud sql instances describe product-management-db

   # Test connection
   gcloud sql connect product-management-db --user=sigma
   ```
2. **Email Service Issues**

   - Verify Gmail app password is correct
   - Check Secret Manager values
   - Ensure 2FA is enabled on Gmail account
3. **File Upload Problems**

   - Check file size limits (10MB max)
   - Verify file type is supported
   - Ensure uploads directory exists and is writable
4. **Deployment Failures**

   ```bash
   # Check deployment status
   gcloud app versions list

   # View detailed logs
   gcloud app logs tail -s default
   ```

## 🔄 Updates & Maintenance

### Deploy Updates

```bash
# Deploy new version
gcloud app deploy app.yaml

# View deployment status
gcloud app versions list

# Promote version (if needed)
gcloud app versions migrate [VERSION_ID]
```

### Database Maintenance

```bash
# Connect to database
gcloud sql connect product-management-db --user=sigma

# Backup database
gcloud sql export sql product-management-db gs://your-backup-bucket/backup-$(date +%Y%m%d).sql --database=product_management_system
```

### Secret Management

```bash
# Update secrets
echo -n "new-password" | gcloud secrets versions add db-password --data-file=-

# List secrets
gcloud secrets list
```

## 📈 Performance Optimization

- **Auto-scaling**: 1-10 instances based on traffic
- **Database Indexing**: Optimized queries with proper indexes
- **Session Caching**: Express sessions for user state
- **File Optimization**: Efficient file upload handling
- **Resource Limits**: Appropriate memory and CPU allocation

## 📋 Post-Deployment Checklist

### ✅ Verification Steps

- [ ] Application loads at deployed URL
- [ ] Admin login works with default credentials
- [ ] Database connection is successful
- [ ] Email notifications are working
- [ ] File upload functionality works
- [ ] All user roles can access appropriate features
- [ ] Registration workflow is complete
- [ ] Product management features work
- [ ] Stock tracking is functional

### ✅ Production Setup

- [ ] Change default admin password
- [ ] Create additional admin users
- [ ] Set up monitoring alerts
- [ ] Configure backup schedules
- [ ] Test disaster recovery procedures
- [ ] Document custom configurations

## 📞 Support & Resources

- **Application URL**: `https://mqi-ims.uc.r.appspot.com`
- **Google Cloud Console**: [App Engine Dashboard](https://console.cloud.google.com/appengine)
- **Cloud SQL Console**: [Database Management](https://console.cloud.google.com/sql)
- **Secret Manager**: [Secrets Dashboard](https://console.cloud.google.com/security/secret-manager)

## 📝 Version Information

- **Last Updated**: January 2025
- **Version**: 2.0.0
- **Platform**: Google App Engine (Node.js 20)
- **Database**: Cloud SQL MySQL 8.0
- **Features**: Email notifications, file attachments, multi-admin support

---

**🚀 Happy Deploying!**
